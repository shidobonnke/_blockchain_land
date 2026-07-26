import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { createParcelSchema, CreateParcelInput } from "@anagu/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ParcelsService } from "./parcels.service";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("parcels")
export class ParcelsController {
  constructor(private parcels: ParcelsService) {}
  @Get() list() {
    return this.parcels.list();
  }
  @Get(":id") get(@Param("id") id: string) {
    return this.parcels.findOne(id);
  }
  @Post()
  @Roles(Role.SURVEYOR, Role.LAND_ADMINISTRATOR, Role.SYSTEM_ADMIN)
  create(@Body(new ZodValidationPipe(createParcelSchema)) body: CreateParcelInput) {
    return this.parcels.create(body);
  }
  @Post(":id/validate-spatial")
  @Roles(Role.SURVEYOR, Role.LAND_ADMINISTRATOR)
  validate(@Param("id") id: string) {
    return this.parcels.validateGeometry(id);
  }
}
