import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IsIn, IsString, Matches } from "class-validator";
import { DocumentsService } from "./documents.service";
class UploadDto {
  @IsString() filename!: string;
  @IsString() mimeType!: string;
}
class ConfirmDto {
  @IsString() storageKey!: string;
  @IsIn(["IDENTITY", "SURVEY_PLAN", "CLAIM_EVIDENCE", "WITNESS", "LEGAL"]) category!: string;
  @Matches(/^[a-fA-F0-9]{64}$/) contentHash!: string;
  @IsString() mimeType!: string;
}
@Controller("documents")
export class DocumentsController {
  constructor(private documents: DocumentsService) {}
  @Post("applications/:applicationId/upload-url")
  upload(@Param("applicationId") id: string, @Body() body: UploadDto) {
    return this.documents.requestUpload(id, body);
  }
  @Post("applications/:applicationId/confirm")
  confirm(@Param("applicationId") id: string, @Body() body: ConfirmDto) {
    return this.documents.confirm(id, body);
  }
  @Get(":id/download-url")
  download(@Param("id") id: string) {
    return this.documents.download(id);
  }
}
