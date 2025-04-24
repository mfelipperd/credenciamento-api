import { Test, TestingModule } from '@nestjs/testing';
import { CheckInsService } from './checkins.service';

describe('CheckinsService', () => {
  let service: CheckInsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckInsService],
    }).compile();

    service = module.get<CheckInsService>(CheckInsService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
