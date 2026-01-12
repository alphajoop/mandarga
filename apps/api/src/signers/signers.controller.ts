import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthMethod, SignerStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddSignersDto } from "./dto/add-signers.dto";
import { SignersService } from "./signers.service";

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags("Signataires")
@Controller("signers")
export class SignersController {
  constructor(private readonly signersService: SignersService) {}

  @Post("document/:documentId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Ajouter des signataires à un document" })
  @ApiResponse({ status: 201, description: "Signataires ajoutés" })
  async addSigners(
    @Param("documentId") documentId: string,
    @Body() dto: AddSignersDto,
    @Request() req: AuthenticatedRequest,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    return this.signersService.addSigners(documentId, req.user.userId, dto, ip);
  }

  @Get("token/:token")
  @ApiOperation({
    summary: "Récupérer les infos du signataire par token (lien unique)",
  })
  @ApiResponse({ status: 200, description: "Informations du signataire" })
  @ApiResponse({ status: 404, description: "Token invalide" })
  async getByToken(@Param("token") token: string): Promise<{
    id: string;
    name: string;
    email: string;
    status: SignerStatus;
    documentId: string;
    authMethod: AuthMethod;
    document: {
      id: string;
      originalFilename: string;
      downloadUrl: string;
      fileHashSha256: string;
    };
  }> {
    return this.signersService.getSignerByToken(token);
  }
}
