import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CertificatesService } from "./certificates.service";

@ApiTags("Certificats")
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get("document/:documentId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Récupérer le certificat d'un document" })
  @ApiResponse({ status: 200, description: "Certificat trouvé" })
  @ApiResponse({ status: 404, description: "Certificat introuvable" })
  async getCertificate(@Param("documentId") documentId: string): Promise<{
    certificateUrl: string;
    certificateData: unknown;
  }> {
    return this.certificatesService.getCertificate(documentId);
  }

  @Get("verify/:signatureUuid")
  @ApiOperation({
    summary: "Vérifier une signature (endpoint public)",
    description:
      "Permet de vérifier l'authenticité d'une signature via son UUID",
  })
  @ApiResponse({ status: 200, description: "Résultat de la vérification" })
  async verifyCertificate(
    @Param("signatureUuid") signatureUuid: string,
  ): Promise<{
    valid: boolean;
    signature?: {
      signerName: string;
      signerEmail: string;
      signedAt: Date;
      documentName: string;
      documentHash: string;
    };
  }> {
    return this.certificatesService.verifyCertificate(signatureUuid);
  }
}
