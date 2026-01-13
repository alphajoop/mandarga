import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export enum AuthMethod {
  OTP = "OTP",
  EMAIL = "EMAIL",
}

class SignerDto {
  @ApiProperty({ example: "Amadou Diop" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({ example: "amadou@example.com" })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({ example: "+221771234567", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: AuthMethod, example: AuthMethod.OTP })
  @IsEnum(AuthMethod)
  authMethod!: AuthMethod;
}

export class AddSignersDto {
  @ApiProperty({
    type: [SignerDto],
    description: "Liste des signataires",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SignerDto)
  signers!: SignerDto[];
}
