import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "../auth/auth.module";
import { OtpModule } from "../otp/otp.module";
import { CleanupService } from "./cleanup.service";
import { TokenCleanupService } from "./token-cleanup.service";

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, OtpModule],
  providers: [CleanupService, TokenCleanupService],
})
export class TasksModule {}
