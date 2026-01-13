import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class SignDocumentDto {
  @ApiProperty({
    example: true,
    description: "Consentement explicite pour la signature électronique",
  })
  @IsBoolean()
  consentAccepted!: boolean;

  @ApiProperty({
    example: "123456",
    required: false,
    description: "Code OTP (requis si authMethod = OTP)",
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  otpCode?: string;
}
