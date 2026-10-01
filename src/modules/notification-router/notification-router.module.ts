import { Module } from '@nestjs/common';
import { NotificationRouterService } from './notification-router.service';
import { AgentsModule } from '@modules/agents/agents.module';

@Module({
  imports: [AgentsModule],
  providers: [NotificationRouterService],
  exports: [NotificationRouterService],
})
export class NotificationRouterModule {}
