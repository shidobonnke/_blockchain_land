import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationSchema, SubmitApplicationInput, transitionSchema } from "@anagu/shared";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ApplicationsService } from "./applications.service";
import { CurrentUser, AuthenticatedUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

class AttestationDto {
  @IsUUID() representativeId!: string;
  @IsIn(["APPROVE", "REJECT", "ABSTAIN"]) decision!: "APPROVE" | "REJECT" | "ABSTAIN";
  @IsOptional() @IsString() evidenceHash?: string;
  @IsOptional() @IsString() signature?: string;
}

@Controller("applications")
export class ApplicationsController {
  constructor(private applications: ApplicationsService) {}
  @Get() list() {
    return this.applications.list();
  }
  @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(submitApplicationSchema)) body: SubmitApplicationInput
  ) {
    return this.applications.create({ ...body, applicantId: user.sub });
  }
  @Post(":id/transition")
  transition(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(transitionSchema))
    body: { to: ApplicationStatus; reason: string }
  ) {
    return this.applications.transition(id, { ...body, actorId: user.sub });
  }
  @Post(":id/attest")
  @Roles(Role.COMMUNITY_REPRESENTATIVE)
  attest(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AttestationDto
  ) {
    return this.applications.attest(id, { ...body, representativeId: user.sub });
  }
}
