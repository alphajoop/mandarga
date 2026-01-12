import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateDocumentDto {
  @ApiProperty({ 
    type: "string",
    format: "binary",
    description: "Fichier PDF à téléverser (max 10MB)"
  })
  @IsString()
  @IsNotEmpty()
  file!: Express.Multer.File;
}
