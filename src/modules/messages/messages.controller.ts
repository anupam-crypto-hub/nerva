import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a message by ID' })
  async getMessage(@CurrentWorkspace() workspace: WorkspaceContext, @Param('id') id: string) {
    return this.messagesService.getById(workspace.id, id);
  }
}
