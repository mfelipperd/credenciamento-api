import { Module } from '@nestjs/common';
import { HowDidYouKnowService } from './how-did-you-know.service';
import { HowDidYouKnowController } from './how-did-you-know.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fair } from '../fairs/entity/fair.entity';
import { HowDidYouKnow } from './how-did-you-know.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HowDidYouKnow, Fair])],
  providers: [HowDidYouKnowService],
  controllers: [HowDidYouKnowController],
})
export class HowDidYouKnowModule {}
