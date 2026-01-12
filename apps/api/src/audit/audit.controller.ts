import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ActorType } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuditService } from "./audit.service";

@ApiTags("Audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("audit")
export class AuditController {
  constructor(readonly _auditService: AuditService) {}

  @Get("document/:documentId")
  @ApiOperation({ summary: "Récupérer l'historique d'audit d'un document" })
  async getDocumentLogs(@Param("documentId") _documentId: string): Promise<
    Array<{
      id: string;
      action: string;
      actorType: ActorType;
      ipAddress: string;
      createdAt: Date;
      metadata: unknown;
    }>
  > {
    return this._auditService.getDocumentLogs(_documentId);
  }
}
