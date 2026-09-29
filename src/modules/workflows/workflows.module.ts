import { Module } from '@nestjs/common';
import { WorkflowRegistryService } from './core/workflow-registry.service';
import { WorkflowExecutionService } from './core/workflow-execution.service';
import { WorkflowConfigService } from './core/workflow-config.service';
import { WorkflowsController, ExecutionsController } from './workflows.controller';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WorkflowsController, ExecutionsController],
  providers: [
    WorkflowRegistryService,
    WorkflowExecutionService,
    WorkflowConfigService,
  ],
  exports: [
    WorkflowRegistryService,
    WorkflowExecutionService,
    WorkflowConfigService,
  ],
})
export class WorkflowsModule {}
