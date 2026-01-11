import { createHash } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.getEnv("SUPABASE_S3_REGION"),
      endpoint: this.getEnv("SUPABASE_S3_ENDPOINT"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.getEnv("SUPABASE_S3_ACCESS_KEY"),
        secretAccessKey: this.getEnv("SUPABASE_S3_SECRET_KEY"),
      },
    });

    this.bucketName = this.getEnv("SUPABASE_S3_BUCKET");
  }

  async uploadDocument(
    file: Express.Multer.File,
  ): Promise<{ path: string; hash: string }> {
    const fileHash = this.generateHash(file.buffer);
    const fileName = `${uuidv4()}-${file.originalname}`;
    const key = `documents/${fileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          hash: fileHash,
        },
      }),
    );

    return {
      path: key,
      hash: fileHash,
    };
  }

  async getSignedDownloadUrl(path: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: path,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private generateHash(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
  }

  private getEnv(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }

    return value;
  }
}
