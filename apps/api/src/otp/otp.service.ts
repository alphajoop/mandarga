import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generate(signerId: string): Promise<string> {
    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const expiryMinutes = this.configService.get<number>(
      "OTP_EXPIRY_MINUTES",
      10,
    );
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Supprimer les anciens OTP non vérifiés
    await this.prisma.otpCode.deleteMany({
      where: {
        signerId,
        verifiedAt: null,
      },
    });

    // Créer le nouveau OTP
    await this.prisma.otpCode.create({
      data: {
        signerId,
        codeHash,
        expiresAt,
      },
    });

    return code;
  }

  async verify(signerId: string, code: string): Promise<{ valid: boolean }> {
    const otpCodes = await this.prisma.otpCode.findMany({
      where: {
        signerId,
        verifiedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (otpCodes.length === 0) {
      throw new BadRequestException("Code OTP invalide ou expiré");
    }

    const otpCode = otpCodes[0];
    const isValid = await bcrypt.compare(code, otpCode.codeHash);

    if (!isValid) {
      throw new BadRequestException("Code OTP incorrect");
    }

    // Marquer comme vérifié
    await this.prisma.otpCode.update({
      where: { id: otpCode.id },
      data: { verifiedAt: new Date() },
    });

    return { valid: true };
  }

  // Nettoyer les OTP expirés (appelé par un cron job)
  async cleanExpiredOtps(): Promise<void> {
    await this.prisma.otpCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
