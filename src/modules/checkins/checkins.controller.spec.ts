import { Test, TestingModule } from '@nestjs/testing';
import { CheckinsController } from './checkins.controller';

describe('CheckinsController', () => {
  let controller: CheckinsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckinsController],
    }).compile();

    controller = module.get<CheckinsController>(CheckinsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
