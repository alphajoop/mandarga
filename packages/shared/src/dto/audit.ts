import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

// Enums from Prisma that need to be shared
export enum ActorType {
  USER = "USER",
  SIGNER = "SIGNER",
  SYSTEM = "SYSTEM",
}

export class LogAuditDto {
  @IsString()
  documentId!: string;

  @IsEnum(ActorType)
  actorType!: ActorType;

  @IsString()
  @IsOptional()
  actorId?: string | null;

  @IsString()
  action!: string;

  @IsString()
  ipAddress!: string;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty({ enum: ActorType })
  actorType!: ActorType;

  @ApiProperty({ required: false })
  actorId?: string | null;

  @ApiProperty()
  ipAddress!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown> | null;
}
