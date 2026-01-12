import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DocumentStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { DocumentResponseDto } from "./dto/document-response.dto";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    userId: string,
    file: Express.Multer.File,
    ip: string,
  ): Promise<{ id: string; message: string }> {
    // Validation du fichier
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    // Vérifier le type de fichier (PDF uniquement)
    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Seuls les fichiers PDF sont acceptés");
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException("Le fichier ne doit pas dépasser 10MB");
    }

    // Upload vers S3 et génération du hash
    const { path, hash } = await this.storageService.uploadDocument(file);

    // Création du document dans la base
    const document = await this.prisma.document.create({
      data: {
        ownerId: userId,
        originalFilename: file.originalname,
        filePath: path,
        fileHashSha256: hash,
        status: DocumentStatus.DRAFT,
      },
    });

    // Log audit
    await this.auditService.log({
      documentId: document.id,
      actorType: "USER",
      actorId: userId,
      action: "DOCUMENT_UPLOADED",
      ipAddress: ip,
      metadata: {
        filename: file.originalname,
        hash,
        fileSize: file.size,
      },
    });

    return {
      id: document.id,
      message: "Document téléversé avec succès",
    };
  }

  async findOne(
    documentId: string,
    userId: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        signers: true,
        signatures: true,
      },
    });

    if (!document) {
      throw new NotFoundException("Document introuvable");
    }

    if (document.ownerId !== userId) {
      throw new ForbiddenException("Accès refusé");
    }

    return {
      id: document.id,
      originalFilename: document.originalFilename,
      filePath: document.filePath,
      fileHashSha256: document.fileHashSha256,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async findAllByUser(userId: string): Promise<DocumentResponseDto[]> {
    const documents = await this.prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });

    return documents.map((doc) => ({
      id: doc.id,
      originalFilename: doc.originalFilename,
      filePath: doc.filePath,
      fileHashSha256: doc.fileHashSha256,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async cancel(
    documentId: string,
    userId: string,
    ip: string,
  ): Promise<{ message: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException("Document introuvable");
    }

    if (document.ownerId !== userId) {
      throw new ForbiddenException("Accès refusé");
    }

    if (document.status === DocumentStatus.SIGNED) {
      throw new BadRequestException(
        "Impossible d'annuler un document déjà signé",
      );
    }

    if (document.status === DocumentStatus.CANCELLED) {
      throw new BadRequestException("Document déjà annulé");
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.CANCELLED },
    });

    await this.auditService.log({
      documentId,
      actorType: "USER",
      actorId: userId,
      action: "DOCUMENT_CANCELLED",
      ipAddress: ip,
      metadata: {},
    });

    return { message: "Document annulé avec succès" };
  }
}
