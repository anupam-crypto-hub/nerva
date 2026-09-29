import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NdrService } from './ndr.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('NDR')
@Controller('ndrs')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class NdrController {
  constructor(private readonly ndrService: NdrService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get an NDR by ID' })
  async getNdr(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.ndrService.getById(workspace.id, id);
  }
}
