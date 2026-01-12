import { ApiProperty } from "@nestjs/swagger";

export class DocumentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  filePath!: string;

  @ApiProperty()
  fileHashSha256!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
