import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { HealthController } from "./health/health.controller";
import { ParcelsModule } from "./parcels/parcels.module";
import { ApplicationsModule } from "./applications/applications.module";
import { SyncModule } from "./sync/sync.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ParcelsModule,
    ApplicationsModule,
    SyncModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
