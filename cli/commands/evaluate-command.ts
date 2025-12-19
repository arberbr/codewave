import * as fs from 'fs';
import chalk from 'chalk';
import { spawnSync } from 'child_process';
import { CommitEvaluationOrchestrator } from '../../src/orchestrator/commit-evaluation-orchestrator';
import { loadConfig, configExists } from '../../src/config/config-loader';
import * as path from 'path';
import {
  createAgentRegistry,
  saveEvaluationReports,
  createEvaluationDirectory,
  EvaluationMetadata,
  printEvaluateCompletionMessage,
  getEvaluationRoot,
} from '../utils/shared.utils';
import { parseCommitStats } from '../../src/common/utils/commit-utils';
import { promptAndGenerateOkrs } from '../utils/okr-prompt.utils';
import {
  getCommitDiff,
  getDiffFromStaged,
  getDiffFromCurrent,
  extractCommitHash,
  generateDiffHash,
} from '../utils/git-utils';
import { generateProfessionalPdfReport } from '../../src/formatters/pdf-report-formatter-professional';
import { SlackService } from '../../src/services/slack.service.js';
import { createEvaluationZip } from '../../src/utils/zip-utils.js';

export async function runEvaluateCommand(args: string[]) {
  // -----------------------------
  // Initial state
  // -----------------------------
  let diff: string | null = null;
  let source = 'commit';
  let sourceDescription = '';
  let repoPath = '.';
  let depthMode: 'fast' | 'normal' | 'deep' = 'normal';
  const attachOnly = args.includes('--attach');

  // -----------------------------
  // Repo path
  // -----------------------------
  if (args.includes('--repo')) {
    const repoIdx = args.indexOf('--repo');
    repoPath = args[repoIdx + 1];
    if (!repoPath) {
      console.error(chalk.red('Error: --repo requires a path'));
      process.exit(1);
    }
  }

  // -----------------------------
  // Depth mode
  // -----------------------------
  if (args.includes('--depth')) {
    const depthIdx = args.indexOf('--depth');
    const depthValue = args[depthIdx + 1];
    if (!depthValue || !['fast', 'normal', 'deep'].includes(depthValue)) {
      console.error(chalk.red('Error: --depth must be one of: fast, normal, deep'));
      process.exit(1);
    }
    depthMode = depthValue as 'fast' | 'normal' | 'deep';
  }

  // -----------------------------
  // Diff resolution (UNCHANGED)
  // -----------------------------
  if (args.includes('--staged')) {
    console.log(chalk.cyan('\n📝 Evaluating staged changes...\n'));
    diff = getDiffFromStaged(repoPath);
    source = 'staged';
    sourceDescription = 'staged changes';
  } else if (args.includes('--current')) {
    console.log(chalk.cyan('\n📝 Evaluating current changes...\n'));
    diff = getDiffFromCurrent(repoPath);
    source = 'current';
    sourceDescription = 'current changes';
  } else if (args.includes('--file')) {
    const fileIdx = args.indexOf('--file');
    const diffFile = args[fileIdx + 1];
    if (!diffFile) {
      console.error(chalk.red('Error: --file requires a file path'));
      process.exit(1);
    }
    if (!fs.existsSync(diffFile)) {
      console.error(chalk.red(`Error: Diff file not found: ${diffFile}`));
      process.exit(1);
    }
    diff = fs.readFileSync(diffFile, 'utf-8');
    source = 'file';
    sourceDescription = path.basename(diffFile);
  } else if (args.includes('--commit')) {
    const commitIdx = args.indexOf('--commit');
    const commitHash = args[commitIdx + 1];
    if (!commitHash) {
      console.error(chalk.red('Error: --commit requires a commit hash'));
      process.exit(1);
    }
    console.log(chalk.cyan(`\n📦 Fetching diff for commit: ${commitHash}\n`));
    diff = getCommitDiff(commitHash, repoPath);
    source = 'commit';
    sourceDescription = commitHash;
  } else if (args[0] && !args[0].startsWith('--')) {
    // Positional argument: treat as commit hash (default behavior)
    const commitHash = args[0];
    console.log(chalk.cyan(`\n📦 Fetching diff for commit: ${commitHash}\n`));
    diff = getCommitDiff(commitHash, repoPath);
    source = 'commit';
    sourceDescription = args[0];
  } else {
    console.error(chalk.red('Error: No input provided'));
    process.exit(1);
  }

  if (!diff || diff.trim().length === 0) {
    console.error(chalk.red('Error: No diff content found'));
    process.exit(1);
  }

  // -----------------------------
  // Config validation (UNCHANGED)
  // -----------------------------
  if (!configExists()) {
    console.log(chalk.red('\n❌ No configuration found!\n'));
    console.log(chalk.yellow('You need to set up the configuration before evaluating commits.\n'));
    console.log(chalk.cyan('Quick setup:'));
    console.log(chalk.white('  1. Run: ') + chalk.green('codewave config --init'));
    console.log(chalk.white('  2. Follow the interactive setup'));
    console.log(chalk.white('  3. Run evaluate again\n'));
    process.exit(1);
  }

  const config = loadConfig();
  if (!config) {
    console.log(chalk.red('\n❌ Failed to load configuration file!\n'));
    console.log(chalk.yellow('Run: codewave config --init\n'));
    process.exit(1);
  }

  config.agents.depthMode = depthMode;

  // -----------------------------
  // Commit hash resolution (UNCHANGED)
  // -----------------------------
  let commitHash = extractCommitHash(diff);
  if (source === 'commit' && sourceDescription) {
    commitHash = sourceDescription.substring(0, 8);
  } else if (!commitHash) {
    commitHash = generateDiffHash(diff);
  }

  // -----------------------------
  // Attach vs Evaluate
  // -----------------------------
  let outputDir: string;
  let evaluationResult: any;

  if (attachOnly) {
    outputDir = findExistingEvaluationDirectory(commitHash);
    if (!outputDir) {
      console.error(
        chalk.red(`❌ No existing evaluation found for commit ${commitHash}`)
      );
      process.exit(1);
    }

    console.log(
      chalk.cyan(`📎 Attaching existing evaluation: ${path.basename(outputDir)}`)
    );

    evaluationResult = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'results.json'), 'utf-8')
    );
  } else {
    // -----------------------------
    // ORIGINAL evaluation flow (UNCHANGED)
    // -----------------------------
    console.log(chalk.cyan('\n🚀 Starting commit evaluation...\n'));

    const agentRegistry = createAgentRegistry(config);
    const orchestrator = new CommitEvaluationOrchestrator(agentRegistry, config);

    const context = {
      commitDiff: diff,
      filesChanged: [],
      commitHash,
      config,
    };

    evaluationResult = await orchestrator.evaluateCommit(context, {
      streaming: !args.includes('--no-stream'),
      threadId: `eval-${Date.now()}`,
    });

    // IMPORTANT: use canonical creator
    outputDir = await createEvaluationDirectory(commitHash);

    const commitStats = parseCommitStats(diff);

    // Extract commit metadata if available
    let commitAuthor: string | undefined;
    let commitMessage: string | undefined;
    let commitDate: string | undefined;

    if (source === 'commit' && sourceDescription) {
      // Get commit metadata
      const showResult = spawnSync(
        'git',
        ['show', '--no-patch', '--format=%an|||%s|||%aI', sourceDescription],
        {
          cwd: repoPath,
          encoding: 'utf-8',
        }
      );

      if (showResult.status === 0 && showResult.stdout) {
        const [author, message, date] = showResult.stdout.trim().split('|||');
        commitAuthor = author;
        commitMessage = message;
        commitDate = date;
      }
    }

    const metadata: EvaluationMetadata = {
      timestamp: new Date().toISOString(),
      commitHash,
      commitAuthor,
      commitMessage,
      commitDate,
      source,
      developerOverview: evaluationResult.developerOverview,
      commitStats,
    };

    await saveEvaluationReports({
      agentResults: evaluationResult.agentResults,
      outputDir,
      metadata,
      diff,
      developerOverview: evaluationResult.developerOverview,
    });
  }

  // -----------------------------
  // PDF generation (UNCHANGED)
  // -----------------------------


  console.log(
    chalk.cyan(`\n🚀 config... pdfReport enabled: ${config.pdfReport?.enabled}\n`)
  );


  let generatedPdfPath = '';
  if (config.pdfReport?.enabled) {
    generatedPdfPath = await generateProfessionalPdfReport(
      evaluationResult.agentResults,
      path.join(outputDir, 'report-enhanced.pdf'),
      {
        commitHash,
        developerOverview: evaluationResult.developerOverview,
        timestamp: new Date().toISOString(),
      },
      config
    );
  }

  // -----------------------------
  // Slack notification (UNCHANGED)
  // -----------------------------
  if (config.slack?.enabled && config.slack.notifyOnSingle) {
    try {
      const slackService = new SlackService(config.slack.botToken);
      if (slackService.isConfigured()) {
        const uploadPath = config.pdfReport?.enabled
          ? generatedPdfPath
          : await createEvaluationZip(outputDir, commitHash);

        await slackService.uploadZipFile(
          config.slack.channelId,
          uploadPath,
          commitHash,
          { commitHash }
        );

        console.log(
          chalk.green(`\n✅ Evaluation results sent to Slack: ${config.slack.channelId}`)
        );
      }
    } catch (err) {
      console.log(
        chalk.yellow(
          `⚠️ Failed to send Slack notification: ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      );
    }
  }

  // -----------------------------
  // Completion
  // -----------------------------
  printEvaluateCompletionMessage(outputDir);

  // Prompt for OKR generation if commit author is available
  if (commitAuthor) {
    const evalRoot = getEvaluationRoot();
    await promptAndGenerateOkrs(config, [commitAuthor], evalRoot);
  }
}

/* ---------------------------------------
   Helper (read-only, non-creating)
---------------------------------------- */
function findExistingEvaluationDirectory(commitHash: string): string {
  const baseDir = path.resolve('.evaluated-commits');
  if (!fs.existsSync(baseDir)) return '';
  return (
    fs
      .readdirSync(baseDir)
      .map(d => path.join(baseDir, d))
      .find(d => d.includes(commitHash)) || ''
  );
}
