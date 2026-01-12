import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { DocumentsModule } from "./documents/documents.module";
import { EmailModule } from "./email/email.module";
import { OtpModule } from "./otp/otp.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SignaturesModule } from "./signatures/signatures.module";
import { SignersModule } from "./signers/signers.module";
import { StorageModule } from "./storage/storage.module";
import { TasksModule } from "./tasks/tasks.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    EmailModule,
    StorageModule,
    DocumentsModule,
    SignersModule,
    SignaturesModule,
    AuditModule,
    OtpModule,
    CertificatesModule,
    TasksModule,
  ],
})
export class AppModule {}
