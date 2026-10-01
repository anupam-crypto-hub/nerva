import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AggregatorConfigService } from '@modules/aggregator-config/aggregator-config.service';
import { AggregatorConfigDocument } from '@modules/aggregator-config/schemas/aggregator-config.schema';

// Extend Express Request to carry aggregatorConfig
declare global {
  namespace Express {
    interface Request {
      aggregatorConfig?: AggregatorConfigDocument;
    }
  }
}

@Injectable()
export class AggregatorAuthGuard implements CanActivate {
  private readonly logger = new Logger(AggregatorAuthGuard.name);

  constructor(
    private readonly aggregatorConfigService: AggregatorConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const aggregatorSlug = request.params.aggregatorSlug;

    if (!aggregatorSlug) {
      throw new UnauthorizedException('Missing aggregator slug');
    }

    // Lookup aggregator config
    const config = await this.aggregatorConfigService.findBySlug(aggregatorSlug);
    if (!config) {
      throw new NotFoundException(`Aggregator not found: ${aggregatorSlug}`);
    }

    // Validate based on authType
    switch (config.authType) {
      case 'api_key': {
        const apiKey = request.headers['x-aggregator-key'] as string;
        if (!apiKey || apiKey !== config.credentials.apiKey) {
          throw new UnauthorizedException('Invalid aggregator API key');
        }
        break;
      }
      case 'ip_whitelist': {
        const clientIp = request.ip || '';
        if (!config.credentials.allowedIPs?.includes(clientIp)) {
          this.logger.warn(`IP ${clientIp} not whitelisted for ${aggregatorSlug}`);
          throw new UnauthorizedException('IP not whitelisted');
        }
        break;
      }
      case 'bearer_token': {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedException('Missing Bearer token');
        }
        const token = authHeader.substring(7);
        if (token !== config.credentials.apiKey) {
          throw new UnauthorizedException('Invalid Bearer token');
        }
        break;
      }
      default:
        // hmac and other types — pass through for now
        break;
    }

    // Attach config to request for downstream use
    request.aggregatorConfig = config;
    this.logger.log(`Aggregator authenticated: ${aggregatorSlug}`);
    return true;
  }
}
