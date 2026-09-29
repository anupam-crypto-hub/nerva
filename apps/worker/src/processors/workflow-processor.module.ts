import { Module } from '@nestjs/common';
import { WorkflowProcessor } from './workflow.processor';
import { WorkflowsModule } from '@modules/workflows/workflows.module';

@Module({
  imports: [WorkflowsModule],
  providers: [WorkflowProcessor],
})
export class WorkflowProcessorModule {}
