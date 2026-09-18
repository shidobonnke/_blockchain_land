import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "development-secret-change-before-production",
      signOptions: { expiresIn: "8h" }
    })
  ],
  controllers: [AuthController, AdminUsersController, ProfileController],
  providers: [AuthService, AdminUsersService, ProfileService],
  exports: [AuthService]
})
export class AuthModule {}
