import { ApiProperty } from "@nestjs/swagger";
import { User as PrismaUser } from "@prisma/client";

export class UserEntity implements Omit<PrismaUser, "password"> {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  lastLoginIp: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  static fromUser(user: PrismaUser): UserEntity {
    const { password, ...userWithoutPassword } = user;
    return new UserEntity(userWithoutPassword);
  }
}
