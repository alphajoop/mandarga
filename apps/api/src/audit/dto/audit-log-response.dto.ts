import { ApiProperty } from "@nestjs/swagger";
import { ActorType } from "@prisma/client";

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
