import { Test, TestingModule } from '@nestjs/testing';
import { HowDidYouKnowController } from './how-did-you-know.controller';

describe('HowDidYouKnowController', () => {
  let controller: HowDidYouKnowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HowDidYouKnowController],
    }).compile();

    controller = module.get<HowDidYouKnowController>(HowDidYouKnowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
