import { Body, Controller, Get, Patch } from "@nestjs/common";
import { IsEthereumAddress } from "class-validator";
import { AuthenticatedUser, CurrentUser } from "./current-user.decorator";
import { ProfileService } from "./profile.service";

class UpdateWalletDto {
  @IsEthereumAddress() walletAddress!: string;
}

@Controller("profile")
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.profile.get(user.sub);
  }

  @Patch("wallet")
  updateWallet(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateWalletDto) {
    return this.profile.updateWallet(user.sub, body.walletAddress);
  }
}
