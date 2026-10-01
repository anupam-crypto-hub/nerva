import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthConfig } from '@config/configuration';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    const authConfig = this.configService.get<AuthConfig>('auth');
    if (apiKey !== authConfig?.adminApiKey) {
      this.logger.warn(`Invalid API key attempt from IP: ${request.ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
