import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { Roles } from "./roles.decorator";
import { AdminUsersService, StaffRole } from "./admin-users.service";

class CreateStaffUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MinLength(12) password!: string;
  @IsEnum(StaffRole) role!: StaffRole;
}

class UpdateStaffRoleDto {
  @IsEnum(StaffRole) role!: StaffRole;
}

@Controller("admin/users")
@Roles(Role.SYSTEM_ADMIN)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() body: CreateStaffUserDto) {
    return this.users.create(body);
  }

  @Patch(":id/role")
  updateRole(@Param("id") id: string, @Body() body: UpdateStaffRoleDto) {
    return this.users.updateRole(id, body.role);
  }
}
