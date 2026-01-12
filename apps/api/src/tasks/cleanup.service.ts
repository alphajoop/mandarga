import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AuthService } from "../auth/auth.service";
import { OtpService } from "../otp/otp.service";

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCleanup(): Promise<void> {
    this.logger.log("🧹 Démarrage du nettoyage quotidien...");

    try {
      // Nettoyer les tokens expirés
      await this.authService.cleanExpiredTokens();
      this.logger.log("✅ Tokens expirés nettoyés");

      // Nettoyer les OTP expirés
      await this.otpService.cleanExpiredOtps();
      this.logger.log("✅ OTP expirés nettoyés");

      this.logger.log("✨ Nettoyage quotidien terminé avec succès");
    } catch (error) {
      this.logger.error("❌ Erreur lors du nettoyage:", error);
    }
  }
}
