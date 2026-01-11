import { ApiProperty } from "@nestjs/swagger";
import { UserEntity } from "./user.entity";

export class TokensEntity {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: UserEntity })
  user!: UserEntity;

  constructor(partial: Partial<TokensEntity>) {
    Object.assign(this, partial);
  }
}
