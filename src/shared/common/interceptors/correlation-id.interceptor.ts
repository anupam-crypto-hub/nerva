import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique request_id and correlation_id to every request.
 * These propagate through SQS messages and logs for traceability.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Use incoming correlation ID if provided, otherwise generate one
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      uuidv4();

    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    // Attach to request object for downstream use
    request.correlationId = correlationId;
    request.requestId = requestId;

    // Set response headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Correlation-Id', correlationId);

    return next.handle();
  }
}
