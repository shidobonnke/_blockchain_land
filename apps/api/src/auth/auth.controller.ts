import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";

class RegisterDto {
  @IsEmail() email!: string;
  @MinLength(8) password!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsOptional() @IsString() phone?: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post("register") register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Post("login") login(@Body() body: LoginDto) { return this.auth.login(body); }
}
