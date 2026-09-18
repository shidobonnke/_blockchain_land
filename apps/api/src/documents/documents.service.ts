import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class DocumentsService {
  private client: Minio.Client;
  private bucket: string;
  constructor(config: ConfigService, private prisma: PrismaService) {
    this.bucket = config.get<string>("S3_BUCKET") ?? "land-documents";
    const endpoint = new URL(config.get<string>("S3_ENDPOINT") ?? "http://localhost:9000");
    this.client = new Minio.Client({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port || (endpoint.protocol === "https:" ? 443 : 80)),
      useSSL: endpoint.protocol === "https:",
      accessKey: config.get<string>("S3_ACCESS_KEY") ?? "",
      secretKey: config.get<string>("S3_SECRET_KEY") ?? ""
    });
  }
  async requestUpload(applicationId: string, input: { filename: string; mimeType: string }) {
    const application = await this.prisma.landApplication.findUnique({
      where: { id: applicationId }
    });
    if (!application) throw new NotFoundException("Application not found");
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `applications/${applicationId}/${randomUUID()}-${safeName}`;
    const url = await this.client.presignedPutObject(this.bucket, storageKey, 900);
    return { storageKey, uploadUrl: url, expiresInSeconds: 900 };
  }
  async confirm(
    applicationId: string,
    input: { storageKey: string; category: string; contentHash: string; mimeType: string }
  ) {
    if (!input.storageKey.startsWith(`applications/${applicationId}/`))
      throw new BadRequestException("Document storage key does not belong to this application");
    const application = await this.prisma.landApplication.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });
    if (!application) throw new NotFoundException("Application not found");
    let actualHash: string;
    try {
      const stream = await this.client.getObject(this.bucket, input.storageKey);
      const hash = createHash("sha256");
      for await (const chunk of stream) hash.update(chunk);
      actualHash = hash.digest("hex");
    } catch {
      throw new BadRequestException("Uploaded document could not be read from object storage");
    }
    if (actualHash.toLowerCase() !== input.contentHash.toLowerCase()) {
      await this.prisma.evaluationMetric.create({
        data: {
          category: "FRAUD_REDUCTION",
          metric: "DOCUMENT_TAMPERING_DETECTED",
          value: 1,
          unit: "attempt",
          context: { applicationId, storageKey: input.storageKey }
        }
      });
      throw new BadRequestException("Document content hash does not match the uploaded object");
    }
    return this.prisma.document.create({ data: { applicationId, ...input } });
  }
  async download(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException("Document not found");
    const url = await this.client.presignedGetObject(this.bucket, document.storageKey, 300);
    return { ...document, downloadUrl: url, expiresInSeconds: 300 };
  }
}
