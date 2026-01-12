import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { OtpModule } from "../otp/otp.module";
import { StorageModule } from "../storage/storage.module";
import { SignersController } from "./signers.controller";
import { SignersService } from "./signers.service";

@Module({
  imports: [EmailModule, OtpModule, AuditModule, StorageModule],
  controllers: [SignersController],
  providers: [SignersService],
  exports: [SignersService],
})
export class SignersModule {}
