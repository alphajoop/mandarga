import { ActorType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class LogAuditDto {
  @IsString()
  documentId: string;

  @IsEnum(ActorType)
  actorType: ActorType;

  @IsString()
  @IsOptional()
  actorId?: string | null;

  @IsString()
  action: string;

  @IsString()
  ipAddress: string;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}
