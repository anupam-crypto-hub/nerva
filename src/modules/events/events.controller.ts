import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EventsService, CreateEventDto } from './events.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext, CorrelationId } from '@shared/common';
import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';

class IngestEventDto implements CreateEventDto {
  @IsString()
  event_id: string;

  @IsString()
  type: string;

  @IsDateString()
  occurred_at: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsObject()
  data: Record<string, any>;
}

@ApiTags('Events')
@Controller('events')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest a business event' })
  @ApiResponse({ status: 202, description: 'Event accepted for processing' })
  @ApiBody({ type: IngestEventDto })
  async ingestEvent(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @CorrelationId() correlationId: string,
    @Body() dto: IngestEventDto,
  ) {
    return this.eventsService.ingestEvent(workspace.id, dto, correlationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event by ID' })
  async getEvent(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const event = await this.eventsService.getEvent(workspace.id, id);
    if (!event) {
      throw new NotFoundException({
        errorCode: 'EVENT_NOT_FOUND',
        message: 'Event not found',
      });
    }
    return event;
  }
}
