import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "@prisma/client";
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from "@repo/shared";
import { AuthService } from "./auth.service";
import { TokensEntity } from "./entities/tokens.entity";
import { UserEntity } from "./entities/user.entity";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LocalAuthGuard } from "./guards/local-auth.guard";

interface RequestWithUser extends Request {
  user: User;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
  ip?: string;
}

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

interface RequestWithIp extends Request {
  ip?: string;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User successfully registered. Verification email sent.",
    type: TokensEntity,
  })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async register(@Body() registerDto: RegisterDto): Promise<TokensEntity> {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post("login")
  @ApiOperation({ summary: "Login user" })
  @ApiResponse({
    status: 200,
    description: "User successfully logged in",
    type: TokensEntity,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Request() req: RequestWithUser,
    @Body() _loginDto: LoginDto,
  ): Promise<TokensEntity> {
    const clientIp = this.extractClientIp(req);
    return this.authService.login(req.user, clientIp);
  }

  private extractClientIp(req: RequestWithUser): string | undefined {
    // Check various headers for client IP
    const forwarded = req.headers["x-forwarded-for"] as string;
    const realIp = req.headers["x-real-ip"] as string;
    const clientIp = req.headers["x-client-ip"] as string;

    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    if (clientIp) {
      return clientIp;
    }

    // Fallback to connection remote address
    return (
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req as RequestWithIp).ip
    );
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "Tokens successfully refreshed",
    type: TokensEntity,
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokensEntity> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Get("verify-email")
  @ApiOperation({ summary: "Verify email address" })
  @ApiResponse({
    status: 200,
    description: "Email verified successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired verification token",
  })
  async verifyEmail(
    @Query() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post("resend-verification")
  @ApiOperation({ summary: "Resend verification email" })
  @ApiResponse({
    status: 200,
    description: "Verification email sent successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Email already verified" })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(
      resendVerificationDto.email,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout user (current device)" })
  @ApiResponse({ status: 200, description: "Successfully logged out" })
  async logout(
    @Request() req: AuthenticatedRequest,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(
      req.user.userId,
      refreshTokenDto?.refreshToken,
    );
    return { message: "Successfully logged out" };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("logout-all")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout from all devices" })
  @ApiResponse({
    status: 200,
    description: "Successfully logged out from all devices",
  })
  async logoutAll(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.authService.logoutAll(req.user.userId);
    return { message: "Successfully logged out from all devices" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved",
    type: UserEntity,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserEntity> {
    return this.authService.getProfile(req.user.userId);
  }
}
