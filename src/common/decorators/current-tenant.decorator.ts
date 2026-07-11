import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from '../guards/tenant.guard';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return req.tenant;
  },
);
