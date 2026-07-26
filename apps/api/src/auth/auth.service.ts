import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(input: { email: string; password: string; fullName: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });
    if (existing) throw new ConflictException("Email already registered");
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: await bcrypt.hash(input.password, 12),
        fullName: input.fullName,
        phone: input.phone,
        role: Role.CITIZEN
      },
      select: { id: true, email: true, fullName: true, role: true }
    });
    return this.issue(user);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash)))
      throw new UnauthorizedException("Invalid credentials");
    return this.issue({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  }

  private async issue(user: { id: string; email: string; fullName: string; role: Role }) {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }),
      user
    };
  }
}
