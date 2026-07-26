import { Body, Controller, Post } from "@nestjs/common";
import { IsObject, IsString, IsUUID } from "class-validator";
import { SyncService } from "./sync.service";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
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
  @Post("operations")
  accept(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncDto) {
    return this.sync.accept({ ...body, userId: user.sub });
  }
}
