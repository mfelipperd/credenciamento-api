import { Test, TestingModule } from '@nestjs/testing';
import { FairsController } from './fairs.controller';

describe('FairsController', () => {
  let controller: FairsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FairsController],
    }).compile();

    controller = module.get<FairsController>(FairsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
