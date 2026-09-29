import { Module } from '@nestjs/common';
import { ConversationProcessor } from './conversation.processor';
@Module({ providers: [ConversationProcessor] })
export class ConversationProcessorModule {}
