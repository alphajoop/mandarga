import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateDocumentDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Fichier PDF à téléverser (max 10MB)",
  })
  @IsString()
  @IsNotEmpty()
  file!: Express.Multer.File;
}

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
