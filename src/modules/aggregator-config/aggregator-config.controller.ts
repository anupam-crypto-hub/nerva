import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AggregatorConfigService } from './aggregator-config.service';
import { CreateAggregatorConfigDto } from './dto/create-aggregator-config.dto';
import { UpdateAggregatorConfigDto } from './dto/update-aggregator-config.dto';

@ApiTags('Aggregator Configs')
@Controller('aggregators')
export class AggregatorConfigController {
  constructor(private readonly aggregatorConfigService: AggregatorConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new courier aggregator' })
  create(@Body() dto: CreateAggregatorConfigDto) {
    return this.aggregatorConfigService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered aggregators' })
  findAll() {
    return this.aggregatorConfigService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get aggregator by slug' })
  @ApiParam({ name: 'slug', example: 'quickflo' })
  findOne(@Param('slug') slug: string) {
    return this.aggregatorConfigService.findBySlug(slug);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update aggregator config' })
  @ApiParam({ name: 'slug', example: 'quickflo' })
  update(@Param('slug') slug: string, @Body() dto: UpdateAggregatorConfigDto) {
    return this.aggregatorConfigService.update(slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove aggregator' })
  @ApiParam({ name: 'slug', example: 'quickflo' })
  remove(@Param('slug') slug: string) {
    return this.aggregatorConfigService.remove(slug);
  }
}
