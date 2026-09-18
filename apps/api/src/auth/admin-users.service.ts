import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../common/prisma.service";

export enum StaffRole {
  SURVEYOR = "SURVEYOR",
  COMMUNITY_REPRESENTATIVE = "COMMUNITY_REPRESENTATIVE",
  LAND_ADMINISTRATOR = "LAND_ADMINISTRATOR",
  LEGAL_OFFICER = "LEGAL_OFFICER",
  REGISTRAR = "REGISTRAR",
  GOVERNOR = "GOVERNOR",
  JUDICIARY = "JUDICIARY",
  AUDITOR = "AUDITOR"
}

const publicUser = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "desc" } });
  }

  async create(input: {
    email: string;
    fullName: string;
    password: string;
    role: StaffRole;
  }) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("Email already registered");
    }
    return this.prisma.user.create({
      data: {
        email,
        fullName: input.fullName.trim(),
        passwordHash: await bcrypt.hash(input.password, 12),
        role: input.role as Role
      },
      select: publicUser
    });
  }

  async updateRole(id: string, role: StaffRole) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === Role.SYSTEM_ADMIN) {
      throw new ConflictException("The system administrator role cannot be changed here");
    }
    return this.prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: publicUser
    });
  }
}
