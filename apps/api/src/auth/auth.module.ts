import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [JwtModule.register({
    global: true,
    secret: process.env.JWT_SECRET ?? "development-secret-change-before-production",
    signOptions: { expiresIn: "8h" }
  })],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
