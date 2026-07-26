import { Controller, Get, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import { EvaluationService } from "./evaluation.service";
@Controller("evaluation")
@Roles(Role.AUDITOR, Role.SYSTEM_ADMIN, Role.LAND_ADMINISTRATOR)
export class EvaluationController {
  constructor(private evaluation: EvaluationService) {}
  @Get("dashboard") dashboard() {
    return this.evaluation.dashboard();
  }
  @Get("metrics") metrics(@Query("metric") metric?: string) {
    return this.evaluation.history(metric);
  }
}
