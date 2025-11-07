import { Test, TestingModule } from '@nestjs/testing';
import { CommitEvaluatorController } from '../src/modules/codewave/codewave.controller';
import { CommitEvaluatorService } from '../src/modules/codewave/codewave.service';
import { EvaluateCommitDto } from '../src/modules/codewave/dtos/evaluate-commit.dto';

describe('CommitEvaluatorController (e2e)', () => {
  let app: TestingModule;
  let controller: CommitEvaluatorController;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [CommitEvaluatorController],
      providers: [
        {
          provide: CommitEvaluatorService,
          useValue: {
            evaluateCommit: jest.fn().mockResolvedValue({ score: 10 }),
          },
        },
      ],
    }).compile();

    controller = app.get<CommitEvaluatorController>(CommitEvaluatorController);
  });

  it('should evaluate a commit', async () => {
    const dto: EvaluateCommitDto = {
      commitMessage: 'Fix bug in feature X',
      author: 'user@example.com',
      // Add other necessary properties for evaluation
    };

    const result = await controller.evaluateCommit(dto);
    expect(result).toEqual({ score: 10 });
  });

  afterAll(async () => {
    await app.close();
  });
});