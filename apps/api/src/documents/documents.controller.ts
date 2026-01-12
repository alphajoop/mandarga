import {
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Ip,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DocumentsService } from "./documents.service";
import { DocumentResponseDto } from "./dto/document-response.dto";
import { CreateDocumentDto } from "./dto/create-document.dto";

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags("Documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Document PDF à téléverser (max 10MB)",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Fichier PDF à téléverser (max 10MB)"
        }
      },
      required: ["file"]
    }
  })
  @ApiOperation({ 
    summary: "Téléverser un document",
    description: "Téléverse un fichier PDF (max 10MB) et crée un nouveau document"
  })
  @ApiResponse({
    status: 201,
    description: "Document créé avec succès",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID du document créé" },
        message: { type: "string", description: "Message de confirmation" }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: "Erreur de validation du fichier",
  })
  @ApiResponse({
    status: 401,
    description: "Non authentifié",
  })
  async create(
    @Request() req: AuthenticatedRequest,
    @Ip() ip: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ id: string; message: string }> {
    return this.documentsService.create(req.user.userId, file, ip);
  }

  @Get()
  @ApiOperation({ summary: "Lister les documents de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Liste des documents récupérée avec succès",
    type: [DocumentResponseDto],
  })
  async findAll(
    @Request() req: AuthenticatedRequest,
  ): Promise<DocumentResponseDto[]> {
    return this.documentsService.findAllByUser(req.user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer un document par son ID" })
  @ApiResponse({
    status: 200,
    description: "Document récupéré avec succès",
    type: DocumentResponseDto,
  })
  async findOne(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.findOne(id, req.user.userId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Annuler un document" })
  @ApiResponse({
    status: 200,
    description: "Document annulé avec succès",
  })
  async cancel(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    return this.documentsService.cancel(id, req.user.userId, ip);
  }
}
