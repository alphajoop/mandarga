import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

interface CertificateData {
  documentId: string;
  documentName: string;
  documentHash: string;
  signatures: Array<{
    signerName: string;
    signerEmail: string;
    signedAt: Date;
    ipAddress: string;
    signatureUuid: string;
    authMethod: string;
  }>;
  generatedAt: Date;
  legalMention: string;
}

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    readonly _configService: ConfigService,
  ) {}

  async generate(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        signatures: {
          include: {
            signer: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException("Document introuvable");
    }

    const certificateData: CertificateData = {
      documentId: document.id,
      documentName: document.originalFilename,
      documentHash: document.fileHashSha256,
      signatures: document.signatures.map((sig) => ({
        signerName: sig.signer.name,
        signerEmail: sig.signer.email,
        signedAt: sig.signedAt,
        ipAddress: sig.ipAddress,
        signatureUuid: sig.signatureUuid,
        authMethod: sig.signer.authMethod,
      })),
      generatedAt: new Date(),
      legalMention:
        "Ce certificat atteste de la signature électronique conforme aux standards juridiques en vigueur. " +
        "Chaque signature a été authentifiée et tracée avec horodatage, adresse IP et consentement explicite.",
    };

    // Générer le certificat en JSON
    const certificateJson = JSON.stringify(certificateData, null, 2);
    const certificateBuffer = Buffer.from(certificateJson, "utf-8");

    // Upload vers S3
    const { path } = await this.storageService.uploadDocument({
      buffer: certificateBuffer,
      originalname: `certificate-${documentId}.json`,
      mimetype: "application/json",
      size: certificateBuffer.length,
    } as Express.Multer.File);

    // Sauvegarder dans la base
    await this.prisma.signatureCertificate.create({
      data: {
        documentId,
        certificatePath: path,
        certificateData: certificateData as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getCertificate(documentId: string): Promise<{
    certificateUrl: string;
    certificateData: CertificateData;
  }> {
    const certificate = await this.prisma.signatureCertificate.findUnique({
      where: { documentId },
    });

    if (!certificate) {
      throw new NotFoundException("Certificat introuvable");
    }

    const certificateUrl = await this.storageService.getSignedDownloadUrl(
      certificate.certificatePath,
    );

    return {
      certificateUrl,
      certificateData:
        certificate.certificateData as unknown as CertificateData,
    };
  }

  async verifyCertificate(signatureUuid: string): Promise<{
    valid: boolean;
    signature?: {
      signerName: string;
      signerEmail: string;
      signedAt: Date;
      documentName: string;
      documentHash: string;
    };
  }> {
    const signature = await this.prisma.signature.findUnique({
      where: { signatureUuid },
      include: {
        signer: true,
        document: true,
      },
    });

    if (!signature) {
      return { valid: false };
    }

    return {
      valid: true,
      signature: {
        signerName: signature.signer.name,
        signerEmail: signature.signer.email,
        signedAt: signature.signedAt,
        documentName: signature.document.originalFilename,
        documentHash: signature.documentHash,
      },
    };
  }
}
