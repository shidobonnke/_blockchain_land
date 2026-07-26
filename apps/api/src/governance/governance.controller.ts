import { Body, Controller, Param, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { IsEthereumAddress, IsInt, IsString, IsUUID, Min, MinLength } from "class-validator";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { GovernanceService } from "./governance.service";

class TransferDto {
  @IsUUID() parcelId!: string;
  @IsUUID() newOwnerId!: string;
  @IsEthereumAddress() newOwnerWallet!: string;
}
class DisputeDto {
  @IsUUID() parcelId!: string;
  @MinLength(10) summary!: string;
}
class ResolveDto {
  @MinLength(10) resolution!: string;
}
class RevocationDto {
  @IsUUID() parcelId!: string;
  @MinLength(20) publicInterestReason!: string;
  @IsInt() @Min(4) validatorCount!: number;
}
class VoteDto {
  approve!: boolean;
}

@Controller("governance")
export class GovernanceController {
  constructor(private governance: GovernanceService) {}
  @Post("transfers")
  requestTransfer(@CurrentUser() user: AuthenticatedUser, @Body() body: TransferDto) {
    return this.governance.requestTransfer({ ...body, requestedById: user.sub });
  }
  @Post("transfers/:id/legal-approve")
  @Roles(Role.LEGAL_OFFICER)
  legal(@Param("id") id: string) {
    return this.governance.approveTransfer(id, "LEGAL");
  }
  @Post("transfers/:id/registrar-approve")
  @Roles(Role.REGISTRAR)
  registrar(@Param("id") id: string) {
    return this.governance.approveTransfer(id, "REGISTRAR");
  }
  @Post("disputes")
  dispute(@CurrentUser() user: AuthenticatedUser, @Body() body: DisputeDto) {
    return this.governance.openDispute({ ...body, raisedById: user.sub });
  }
  @Post("disputes/:id/resolve")
  @Roles(Role.LEGAL_OFFICER, Role.JUDICIARY)
  resolve(@Param("id") id: string, @Body() body: ResolveDto) {
    return this.governance.resolveDispute(id, body.resolution);
  }
  @Post("revocations")
  @Roles(Role.GOVERNOR)
  revoke(@CurrentUser() user: AuthenticatedUser, @Body() body: RevocationDto) {
    return this.governance.requestRevocation({ ...body, requestedById: user.sub });
  }
  @Post("revocations/:id/vote")
  @Roles(Role.LAND_ADMINISTRATOR, Role.REGISTRAR, Role.AUDITOR, Role.SYSTEM_ADMIN)
  vote(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: VoteDto) {
    return this.governance.recordValidatorVote(id, user.sub, body.approve);
  }
  @Post("revocations/:id/judiciary-approve")
  @Roles(Role.JUDICIARY)
  judiciary(@Param("id") id: string) {
    return this.governance.judiciaryApprove(id);
  }
  @Post("revocations/:id/execute")
  @Roles(Role.REGISTRAR)
  execute(@Param("id") id: string) {
    return this.governance.executeRevocation(id);
  }
}
