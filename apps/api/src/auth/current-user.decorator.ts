import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Role } from "@prisma/client";
export type AuthenticatedUser = { sub: string; email: string; role: Role };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user
);
