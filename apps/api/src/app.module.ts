import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { HealthController } from "./health/health.controller";
import { ParcelsModule } from "./parcels/parcels.module";
import { ApplicationsModule } from "./applications/applications.module";
import { SyncModule } from "./sync/sync.module";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { GovernanceModule } from "./governance/governance.module";
import { EvaluationModule } from "./evaluation/evaluation.module";
import { DocumentsModule } from "./documents/documents.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ParcelsModule,
    ApplicationsModule,
    SyncModule,
    GovernanceModule,
    EvaluationModule,
    DocumentsModule
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
