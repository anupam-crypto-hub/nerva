import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';
import { IsString, IsOptional, IsArray } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('api-keys')
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth('api-key')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created. Raw key is only returned once.' })
  async createApiKey(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.authService.createApiKey(workspace.id, dto.name, dto.permissions);
  }

  @Get('api-keys')
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth('api-key')
  @ApiOperation({ summary: 'List all API keys for workspace' })
  async listApiKeys(@CurrentWorkspace() workspace: WorkspaceContext) {
    return this.authService.listApiKeys(workspace.id);
  }

  @Delete('api-keys/:id')
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth('api-key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    await this.authService.revokeApiKey(workspace.id, id);
  }
}
