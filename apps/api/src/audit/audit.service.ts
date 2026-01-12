import { Injectable } from "@nestjs/common";
import { ActorType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LogAuditDto } from "./dto/log-audit.dto";
//import { AuditLogResponseDto } from "./dto/audit-log-response.dto";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: LogAuditDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        documentId: dto.documentId,
        actorType: dto.actorType,
        actorId: dto.actorId,
        action: dto.action,
        ipAddress: dto.ipAddress,
        metadata: dto.metadata || {},
      },
    });
  }

  async getDocumentLogs(documentId: string): Promise<
    Array<{
      id: string;
      action: string;
      actorType: ActorType;
      ipAddress: string;
      createdAt: Date;
      metadata: unknown;
    }>
  > {
    return this.prisma.auditLog.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        actorType: true,
        ipAddress: true,
        createdAt: true,
        metadata: true,
      },
    });
  }
}
