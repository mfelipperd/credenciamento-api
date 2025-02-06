import { Test, TestingModule } from '@nestjs/testing';
import { HowDidYouKnowService } from './how-did-you-know.service';

describe('HowDidYouKnowService', () => {
  let service: HowDidYouKnowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HowDidYouKnowService],
    }).compile();

    service = module.get<HowDidYouKnowService>(HowDidYouKnowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
