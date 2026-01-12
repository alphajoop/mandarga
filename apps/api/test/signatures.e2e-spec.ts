import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Signatures E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let documentId: string;
  let signerToken: string | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    await app.listen(0);
    prisma = app.get<PrismaService>(PrismaService);

    // Créer un utilisateur de test et se connecter
    const registerResponse = await fetch(
      `http://localhost:${app.getHttpServer().address().port}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "e2e@test.com",
          password: "Test123!@#",
          firstName: "E2E",
          lastName: "Test",
        }),
      },
    );

    const registerData = await registerResponse.json();
    accessToken = registerData.accessToken;
  });

  afterAll(async () => {
    // Nettoyage
    await prisma.user.deleteMany({
      where: { email: "e2e@test.com" },
    });
    await app.close();
  });

  it("devrait créer un document", async () => {
    const formData = new FormData();
    const pdfBlob = new Blob(["fake pdf content"], {
      type: "application/pdf",
    });
    formData.append("file", pdfBlob, "test.pdf");

    const response = await fetch(
      `http://localhost:${app.getHttpServer().address().port}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    documentId = data.id;
    expect(data.message).toBeTruthy();
  });

  it("devrait ajouter des signataires", async () => {
    const response = await fetch(
      `http://localhost:${app.getHttpServer().address().port}/signers/document/${documentId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          signers: [
            {
              name: "Signataire Test",
              email: "signer@test.com",
              authMethod: "EMAIL",
            },
          ],
        }),
      },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.message).toContain("Invitations envoyées");

    // Récupérer le token du signataire
    const signer = await prisma.documentSigner.findFirst({
      where: { documentId },
    });
    signerToken = signer?.token;
  });

  it("devrait permettre au signataire de voir le document", async () => {
    const response = await fetch(
      `http://localhost:${app.getHttpServer().address().port}/signers/token/${signerToken}`,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.document.originalFilename).toBeTruthy();
  });

  it("devrait permettre au signataire de signer", async () => {
    const response = await fetch(
      `http://localhost:${app.getHttpServer().address().port}/signatures/sign/${signerToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentAccepted: true,
        }),
      },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.documentSigned).toBe(true);
  });
});
