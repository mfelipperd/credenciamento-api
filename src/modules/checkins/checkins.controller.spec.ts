import { Test, TestingModule } from '@nestjs/testing';
import { CheckInsController } from './checkins.controller';

describe('CheckinsController', () => {
  let controller: CheckInsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInsController],
    }).compile();

    controller = module.get<CheckInsController>(CheckInsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
