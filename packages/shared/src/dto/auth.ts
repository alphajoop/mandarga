import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain uppercase, lowercase, number and special character",
  })
  password!: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  firstName!: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  lastName!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255)
  email!: string;
}

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
