import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthMethod, DocumentStatus, SignerStatus } from "@prisma/client";
import { ActorType, SignDocumentDto } from "@repo/shared";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "../audit/audit.service";
import { CertificatesService } from "../certificates/certificates.service";
import { EmailService } from "../email/email.service";
import { OtpService } from "../otp/otp.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly otpService: OtpService,
    private readonly certificatesService: CertificatesService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
  ) {}
  async sign(
    token: string,
    dto: SignDocumentDto,
    ip: string,
    userAgent: string,
  ): Promise<{ message: string; documentSigned: boolean }> {
    const signer = await this.prisma.documentSigner.findUnique({
      where: { token },
      include: { document: true },
    });
    if (!signer) {
      throw new NotFoundException("Signataire introuvable");
    }

    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException("Document déjà signé");
    }

    if (signer.tokenExpiresAt < new Date()) {
      throw new BadRequestException("Lien expiré");
    }

    if (!dto.consentAccepted) {
      throw new BadRequestException(
        "Vous devez accepter les conditions de signature électronique",
      );
    }

    // Vérifier l'OTP si nécessaire
    if (signer.authMethod === AuthMethod.OTP) {
      if (!dto.otpCode) {
        throw new BadRequestException("Code OTP requis");
      }

      await this.otpService.verify(signer.id, dto.otpCode);
    }

    // Log consentement
    await this.auditService.log({
      documentId: signer.documentId,
      actorType: ActorType.SIGNER,
      actorId: signer.id,
      action: "CONSENT_ACCEPTED",
      ipAddress: ip,
      metadata: {
        consentText: dto.consentAccepted,
        signerEmail: signer.email,
      },
    });

    // Générer UUID de signature
    const signatureUuid = uuidv4();

    // Créer la signature
    await this.prisma.signature.create({
      data: {
        documentId: signer.documentId,
        signerId: signer.id,
        ipAddress: ip,
        userAgent,
        documentHash: signer.document.fileHashSha256,
        signatureUuid,
        consentAccepted: dto.consentAccepted,
      },
    });

    // Mettre à jour le statut du signataire
    await this.prisma.documentSigner.update({
      where: { id: signer.id },
      data: { status: SignerStatus.SIGNED },
    });

    // Log signature
    await this.auditService.log({
      documentId: signer.documentId,
      actorType: ActorType.SIGNER,
      actorId: signer.id,
      action: "DOCUMENT_SIGNED",
      ipAddress: ip,
      metadata: {
        signatureUuid,
        signerEmail: signer.email,
      },
    });

    // Vérifier si tous les signataires ont signé
    const allSigners = await this.prisma.documentSigner.findMany({
      where: { documentId: signer.documentId },
    });

    const allSigned = allSigners.every((s) => s.status === SignerStatus.SIGNED);

    if (allSigned) {
      // Marquer le document comme signé
      await this.prisma.document.update({
        where: { id: signer.documentId },
        data: { status: DocumentStatus.SIGNED },
      });

      // Générer le certificat
      await this.certificatesService.generate(signer.documentId);

      // Notifier le propriétaire
      const document = await this.prisma.document.findUnique({
        where: { id: signer.documentId },
        include: { owner: true },
      });

      if (document) {
        const downloadUrl = await this.storageService.getSignedDownloadUrl(
          document.filePath,
        );

        await this.emailService.sendDocumentSigned(
          document.owner.email,
          document.originalFilename,
          downloadUrl,
        );
      }

      return {
        message: "Document signé avec succès. Tous les signataires ont signé !",
        documentSigned: true,
      };
    }

    return {
      message: "Signature enregistrée avec succès",
      documentSigned: false,
    };
  }
}
