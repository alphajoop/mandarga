import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    description: "Token de vérification d'email",
  })
  @IsString()
  @IsNotEmpty()
  @Length(32, 128)
  token!: string;
}
