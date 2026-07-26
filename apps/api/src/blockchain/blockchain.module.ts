import { Module } from "@nestjs/common";
import { BlockchainService } from "./blockchain.service";
import { TitlesController } from "./titles.controller";
@Module({
  controllers: [TitlesController],
  providers: [BlockchainService],
  exports: [BlockchainService]
})
export class BlockchainModule {}
