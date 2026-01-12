import { IsString, IsOptional, IsEnum } from "class-validator";
import { ActorType } from "@prisma/client";

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
  metadata?: Record<string, any> | null;
}
