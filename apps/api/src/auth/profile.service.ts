import { Injectable, NotFoundException } from "@nestjs/common";
import { getAddress } from "ethers";
import { PrismaService } from "../common/prisma.service";

const publicProfile = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  walletAddress: true
} as const;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicProfile });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateWallet(id: string, walletAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return this.prisma.user.update({
      where: { id },
      data: { walletAddress: getAddress(walletAddress) },
      select: publicProfile
    });
  }
}
