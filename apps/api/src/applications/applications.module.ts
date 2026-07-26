import { Module } from "@nestjs/common";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { EventsModule } from "../events/events.module";
@Module({
  imports: [BlockchainModule, EventsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService]
})
export class ApplicationsModule {}
