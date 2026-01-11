import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AuthService } from "../auth.service";

@Injectable()
export class TokenCleanupService {
  constructor(private readonly authService: AuthService) {}

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup(): Promise<void> {
    console.log("🧹 Cleaning expired refresh tokens...");
    await this.authService.cleanExpiredTokens();
    console.log("✅ Expired tokens cleaned");
  }
}
