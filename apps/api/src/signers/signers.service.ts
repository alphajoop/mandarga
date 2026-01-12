import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthMethod, DocumentStatus, SignerStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { OtpService } from "../otp/otp.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AddSignersDto } from "./dto/add-signers.dto";

@Injectable()
export class SignersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async addSigners(
    documentId: string,
    userId: string,
    dto: AddSignersDto,
    ip: string,
  ): Promise<{ message: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException("Document introuvable");
    }

    if (document.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas le propriétaire de ce document",
      );
    }

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException("Le document ne peut plus être modifié");
    }

    // Supprimer les anciens signataires s'il y en a
    await this.prisma.documentSigner.deleteMany({
      where: { documentId },
    });

    // Créer les nouveaux signataires
    const signers = await Promise.all(
      dto.signers.map(async (signer, index) => {
        const token = uuidv4();
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // 7 jours

        return this.prisma.documentSigner.create({
          data: {
            documentId,
            name: signer.name,
            email: signer.email,
            phone: signer.phone,
            signOrder: index + 1,
            authMethod: signer.authMethod,
            token,
            tokenExpiresAt,
          },
        });
      }),
    );

    // Mettre à jour le statut du document
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.SENT },
    });

    // Log audit
    await this.auditService.log({
      documentId,
      actorType: "USER",
      actorId: userId,
      action: "SIGNERS_ADDED",
      ipAddress: ip,
      metadata: {
        signersCount: signers.length,
      },
    });

    // Envoyer les invitations
    for (const signer of signers) {
      let otp: string | undefined;

      if (signer.authMethod === AuthMethod.OTP) {
        otp = await this.otpService.generate(signer.id);
      }

      await this.emailService.sendSignatureInvitation(
        signer.email,
        signer.name,
        document.originalFilename,
        signer.token,
        otp,
      );

      await this.auditService.log({
        documentId,
        actorType: "SYSTEM",
        actorId: null,
        action: "INVITATION_SENT",
        ipAddress: ip,
        metadata: {
          signerId: signer.id,
          email: signer.email,
          authMethod: signer.authMethod,
        },
      });
    }

    return { message: "Invitations envoyées avec succès" };
  }

  async getSignerByToken(token: string): Promise<{
    id: string;
    name: string;
    email: string;
    status: SignerStatus;
    documentId: string;
    authMethod: AuthMethod;
    document: {
      id: string;
      originalFilename: string;
      downloadUrl: string;
      fileHashSha256: string;
    };
  }> {
    const signer = await this.prisma.documentSigner.findUnique({
      where: { token },
      include: {
        document: true,
      },
    });

    if (!signer) {
      throw new NotFoundException("Lien invalide");
    }

    if (signer.tokenExpiresAt < new Date()) {
      throw new BadRequestException("Lien expiré");
    }

    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException("Document déjà signé");
    }

    if (signer.document.status === DocumentStatus.CANCELLED) {
      throw new BadRequestException("Document annulé");
    }

    // Générer l'URL de téléchargement
    const downloadUrl = await this.storageService.getSignedDownloadUrl(
      signer.document.filePath,
    );

    // Marquer comme vu si c'est la première visite
    if (signer.status === SignerStatus.PENDING) {
      await this.prisma.documentSigner.update({
        where: { id: signer.id },
        data: { status: SignerStatus.VIEWED },
      });

      await this.auditService.log({
        documentId: signer.documentId,
        actorType: "SIGNER",
        actorId: signer.id,
        action: "DOCUMENT_VIEWED",
        ipAddress: "unknown",
        metadata: {
          signerEmail: signer.email,
        },
      });
    }

    return {
      id: signer.id,
      name: signer.name,
      email: signer.email,
      status: signer.status,
      documentId: signer.documentId,
      authMethod: signer.authMethod,
      document: {
        id: signer.document.id,
        originalFilename: signer.document.originalFilename,
        downloadUrl,
        fileHashSha256: signer.document.fileHashSha256,
      },
    };
  }
}
