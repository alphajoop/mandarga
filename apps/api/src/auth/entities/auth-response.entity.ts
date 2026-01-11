import { ApiProperty } from "@nestjs/swagger";
import { UserEntity } from "./user.entity";

export class AuthResponseEntity {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: UserEntity })
  user!: UserEntity;

  constructor(partial: Partial<AuthResponseEntity>) {
    Object.assign(this, partial);
  }
}
