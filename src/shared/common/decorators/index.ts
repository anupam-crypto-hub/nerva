import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the resolved workspace from the request.
 * Set by ApiKeyGuard after authentication.
 *
 * Usage:
 *   @Get()
 *   handler(@CurrentWorkspace() workspace: WorkspaceContext) { ... }
 */
export const CurrentWorkspace = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const workspace = request.workspace;
    return data ? workspace?.[data] : workspace;
  },
);

export interface WorkspaceContext {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  settings?: Record<string, any>;
}

/**
 * Extract the request ID from the request.
 */
export const RequestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.requestId;
  },
);

/**
 * Extract the correlation ID from the request.
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.correlationId;
  },
);
