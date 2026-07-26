import { Body, Controller, Post } from "@nestjs/common";
import { IsObject, IsString, IsUUID } from "class-validator";
import { SyncService } from "./sync.service";
class SyncDto {
  @IsUUID() id!: string;
  @IsString() deviceId!: string;
  @IsUUID() userId!: string;
  @IsString() operation!: string;
  @IsObject() payload!: Record<string, unknown>;
}
@Controller("sync")
export class SyncController {
  constructor(private sync: SyncService) {}
  @Post("operations") accept(@Body() body: SyncDto) { return this.sync.accept(body); }
}
