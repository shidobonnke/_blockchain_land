import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { createParcelSchema, CreateParcelInput } from "@anagu/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ParcelsService } from "./parcels.service";

@Controller("parcels")
export class ParcelsController {
  constructor(private parcels: ParcelsService) {}
  @Get() list() { return this.parcels.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.parcels.findOne(id); }
  @Post() create(@Body(new ZodValidationPipe(createParcelSchema)) body: CreateParcelInput) {
    return this.parcels.create(body);
  }
  @Post(":id/validate-spatial") validate(@Param("id") id: string) {
    return this.parcels.validateGeometry(id);
  }
}
