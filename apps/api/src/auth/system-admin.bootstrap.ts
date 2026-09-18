import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class SystemAdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemAdminBootstrap.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>("SYSTEM_ADMIN_EMAIL")?.trim().toLowerCase();
    const password = this.config.get<string>("SYSTEM_ADMIN_PASSWORD");
    const fullName = this.config.get<string>("SYSTEM_ADMIN_FULL_NAME")?.trim() || "System Administrator";

    if (!email && !password) {
      this.logger.warn(
        "System administrator bootstrap skipped; set SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD"
      );
      return;
    }

    if (!email || !password) {
      throw new Error("SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD must be set together");
    }
    if (password.length < 12) {
      throw new Error("SYSTEM_ADMIN_PASSWORD must contain at least 12 characters");
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      this.logger.log(`System administrator bootstrap skipped; ${email} already exists`);
      return;
    }

    await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        fullName,
        role: Role.SYSTEM_ADMIN
      }
    });
    this.logger.log(`Created initial system administrator ${email}`);
  }
}
