import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('Conversations')
@Controller()
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  async getConversation(@CurrentWorkspace() workspace: WorkspaceContext, @Param('id') id: string) {
    return this.conversationsService.getById(workspace.id, id);
  }

  @Get('customers/:id/conversations')
  @ApiOperation({ summary: 'Get conversations for a customer' })
  async getCustomerConversations(@CurrentWorkspace() workspace: WorkspaceContext, @Param('id') id: string) {
    return this.conversationsService.getByCustomerId(workspace.id, id);
  }
}
