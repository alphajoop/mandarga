import { Body, Controller, Headers, Ip, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SignDocumentDto } from "@repo/shared";
import { SignaturesService } from "./signatures.service";

@ApiTags("Signatures")
@Controller("signatures")
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post("sign/:token")
  @ApiOperation({ summary: "Signer un document" })
  @ApiResponse({ status: 201, description: "Document signé" })
  @ApiResponse({ status: 400, description: "Erreur de validation" })
  async sign(
    @Param("token") token: string,
    @Body() dto: SignDocumentDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<{ message: string; documentSigned: boolean }> {
    return this.signaturesService.sign(token, dto, ip, userAgent || "unknown");
  }
}
