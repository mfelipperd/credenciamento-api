import { Module } from '@nestjs/common';
import { HowDidYouKnowService } from './how-did-you-know.service';
import { HowDidYouKnowController } from './how-did-you-know.controller';

@Module({
  providers: [HowDidYouKnowService],
  controllers: [HowDidYouKnowController]
})
export class HowDidYouKnowModule {}
