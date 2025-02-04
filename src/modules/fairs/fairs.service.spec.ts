import { Test, TestingModule } from '@nestjs/testing';
import { FairsService } from './fairs.service';

describe('FairsService', () => {
  let service: FairsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FairsService],
    }).compile();

    service = module.get<FairsService>(FairsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
