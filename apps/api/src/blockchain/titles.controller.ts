import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { Public } from "../auth/public.decorator";

@Controller("titles")
export class TitlesController {
  constructor(private prisma: PrismaService) {}

  @Get("verify/:reference")
  @Public()
  async verify(@Param("reference") reference: string) {
    const title = await this.prisma.landTitle.findFirst({
      where: {
        OR: [
          { tokenId: reference },
          { transactionHash: reference },
          { parcel: { parcelCode: reference } }
        ]
      },
      include: {
        parcel: {
          select: {
            parcelCode: true,
            state: true,
            lga: true,
            tenureType: true,
            status: true,
            geometryHash: true
          }
        }
      }
    });
    if (!title) throw new NotFoundException("No issued title matches this reference");
    return {
      verified: true,
      tokenId: title.tokenId,
      ownerWallet: title.ownerWallet,
      transactionHash: title.transactionHash,
      contractAddress: title.contractAddress,
      metadataHash: title.metadataHash,
      issuedAt: title.issuedAt,
      parcel: title.parcel
    };
  }
}
