import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationSchema, SubmitApplicationInput, transitionSchema } from "@anagu/shared";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ApplicationsService } from "./applications.service";

class AttestationDto {
  @IsUUID() representativeId!: string;
  @IsIn(["APPROVE", "REJECT", "ABSTAIN"]) decision!: "APPROVE" | "REJECT" | "ABSTAIN";
  @IsOptional() @IsString() evidenceHash?: string;
  @IsOptional() @IsString() signature?: string;
}

@Controller("applications")
export class ApplicationsController {
  constructor(private applications: ApplicationsService) {}
  @Get() list() { return this.applications.list(); }
  @Post() create(@Body(new ZodValidationPipe(submitApplicationSchema)) body: SubmitApplicationInput) {
    return this.applications.create(body);
  }
  @Post(":id/transition")
  transition(@Param("id") id: string, @Body(new ZodValidationPipe(transitionSchema)) body: { to: ApplicationStatus; reason: string; actorId: string }) {
    return this.applications.transition(id, body);
  }
  @Post(":id/attest")
  attest(@Param("id") id: string, @Body() body: AttestationDto) { return this.applications.attest(id, body); }
}
