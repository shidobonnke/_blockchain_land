import { Module } from "@nestjs/common";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { EventsModule } from "../events/events.module";
import { GovernanceController } from "./governance.controller";
import { GovernanceService } from "./governance.service";
@Module({
  imports: [BlockchainModule, EventsModule],
  controllers: [GovernanceController],
  providers: [GovernanceService]
})
export class GovernanceModule {}
