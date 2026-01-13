import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { RegisterDto } from "@repo/shared";
import * as bcrypt from "bcrypt";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { TokensEntity } from "./entities/tokens.entity";
import { UserEntity } from "./entities/user.entity";

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private loginAttempts = new Map<
    string,
    { count: number; lastAttempt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    readonly _configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokensEntity> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException("Email déjà utilisé");
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        isEmailVerified: false,
      },
    });

    // Generate verification token
    await this.generateEmailVerificationToken(user);

    const tokens = await this.generateTokens(user);
    const userEntity = UserEntity.fromUser(user);

    return new TokensEntity({
      ...tokens,
      user: userEntity,
    });
  }

  async login(user: User, ip?: string): Promise<TokensEntity> {
    // Reset login attempts on successful login
    this.loginAttempts.delete(user.email);

    // Update last login IP if provided
    if (ip) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginIp: ip },
      });
    }

    const tokens = await this.generateTokens(user);
    const userEntity = UserEntity.fromUser(user);

    return new TokensEntity({
      ...tokens,
      user: userEntity,
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    // Check for rate limiting
    this.checkRateLimit(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.recordFailedAttempt(email);
      // Use constant time to prevent user enumeration
      await bcrypt.hash("dummy-password", SALT_ROUNDS);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.recordFailedAttempt(email);
      return null;
    }

    return user;
  }

  async refreshTokens(refreshToken: string): Promise<TokensEntity> {
    // Find the refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Token de rafraîchissement invalide");
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException("Token de rafraîchissement expiré");
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user);
    const userEntity = UserEntity.fromUser(storedToken.user);

    return new TokensEntity({
      ...tokens,
      user: userEntity,
    });
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Delete specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for user (logout from all devices)
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true },
      });

    if (!verificationToken) {
      throw new BadRequestException("Token de vérification invalide");
    }

    if (new Date() > verificationToken.expiresAt) {
      await this.prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw new BadRequestException(
        "Token de vérification expiré. Veuillez en demander un nouveau.",
      );
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { isEmailVerified: true },
    });

    // Delete verification token
    await this.prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(
      verificationToken.user.email,
      verificationToken.user.firstName,
    );

    return { message: "Email verified successfully" };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    if (user.isEmailVerified) {
      throw new BadRequestException("Email déjà vérifié");
    }

    // Delete existing token if any
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate new token
    await this.generateEmailVerificationToken(user);

    return {
      message: "Email de vérification envoyé avec succès",
    };
  }

  private async generateEmailVerificationToken(user: User): Promise<void> {
    const token = randomBytes(32).toString("hex");

    const expiryHours = this._configService.get<number>(
      "EMAIL_VERIFICATION_EXPIRY_HOURS",
      24,
    );
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    await this.prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification email
    await this.emailService.sendEmailVerification(
      user.email,
      user.firstName,
      token,
    );
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Generate access token (short-lived)
    const accessToken = this.generateAccessToken(user);

    // Generate refresh token (long-lived)
    const refreshToken = this.generateRefreshToken();

    // Store refresh token in database
    const refreshTokenExpiryDays = this._configService.get<number>(
      "REFRESH_TOKEN_EXPIRY_DAYS",
      30,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private generateAccessToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString("hex");
  }

  private checkRateLimit(email: string): void {
    const maxAttempts = this._configService.get<number>(
      "MAX_LOGIN_ATTEMPTS",
      5,
    );
    const lockoutTime = this._configService.get<number>(
      "LOCKOUT_TIME",
      15 * 60 * 1000,
    );

    const attempts = this.loginAttempts.get(email);

    if (attempts) {
      const now = Date.now();

      if (attempts.count >= maxAttempts) {
        const timeSinceLastAttempt = now - attempts.lastAttempt;

        if (timeSinceLastAttempt < lockoutTime) {
          const remainingTime = Math.ceil(
            (lockoutTime - timeSinceLastAttempt) / 1000 / 60,
          );
          throw new UnauthorizedException(
            `Trop de tentatives de connexion. Veuillez réessayer dans ${remainingTime} minutes.`,
          );
        } else {
          // Reset after lockout period
          this.loginAttempts.delete(email);
        }
      }
    }
  }

  private recordFailedAttempt(email: string): void {
    const attempts = this.loginAttempts.get(email);
    const now = Date.now();

    if (attempts) {
      this.loginAttempts.set(email, {
        count: attempts.count + 1,
        lastAttempt: now,
      });
    } else {
      this.loginAttempts.set(email, {
        count: 1,
        lastAttempt: now,
      });
    }
  }

  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("Utilisateur non trouvé");
    }

    return UserEntity.fromUser(user);
  }

  // Clean expired tokens (can be called by a cron job)
  async cleanExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
