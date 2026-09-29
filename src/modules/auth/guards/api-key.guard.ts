import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Guard that validates API key from Authorization: Bearer <key> header.
 * Resolves the workspace and attaches it to the request.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token: string | undefined;

    const xApiKey = request.headers['x-api-key'];
    if (typeof xApiKey === 'string' && xApiKey.trim()) {
      token = xApiKey.trim();
    } else {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException({
          errorCode: 'MISSING_AUTH_HEADER',
          message: 'Authorization header (Bearer <api_key>) or x-api-key header is required',
        });
      }

      const [scheme, authToken] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !authToken) {
        throw new UnauthorizedException({
          errorCode: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must be: Bearer <api_key>',
        });
      }
      token = authToken;
    }

    try {
      const { workspace, apiKey } = await this.authService.validateApiKey(token!);

      // Attach workspace to request — never trust client-supplied workspace IDs
      request.workspace = {
        id: workspace.id,
        organizationId: workspace.organizationId,
        name: workspace.name,
        slug: workspace.slug,
        settings: workspace.settings,
      };
      request.apiKeyId = apiKey.id;
      request.permissions = apiKey.permissions;

      // Update last used timestamp (fire-and-forget)
      this.authService.updateLastUsed(apiKey.id).catch(() => {});

      return true;
    } catch (error) {
      this.logger.warn(`API key authentication failed: ${error}`);
      throw new UnauthorizedException({
        errorCode: 'INVALID_API_KEY',
        message: 'Invalid or expired API key',
      });
    }
  }
}
