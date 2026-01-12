import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CertificatesModule } from "../certificates/certificates.module";
import { EmailModule } from "../email/email.module";
import { OtpModule } from "../otp/otp.module";
import { StorageModule } from "../storage/storage.module";
import { SignaturesController } from "./signatures.controller";
import { SignaturesService } from "./signatures.service";

@Module({
  imports: [
    StorageModule,
    AuditModule,
    OtpModule,
    CertificatesModule,
    EmailModule,
  ],
  controllers: [SignaturesController],
  providers: [SignaturesService],
})
export class SignaturesModule {}
