import * as fs from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import cliProgress from 'cli-progress';
import { CommitEvaluationOrchestrator } from '../../src/orchestrator/commit-evaluation-orchestrator';
import { loadConfig, configExists } from '../../src/config/config-loader';
import { generateHtmlReport } from '../../src/formatters/html-report-formatter';
import path from 'path';
import {
  createAgentRegistry,
  generateTimestamp,
  saveEvaluationReports,
  createEvaluationDirectory,
  EvaluationMetadata,
  printEvaluateCompletionMessage,
  updateEvaluationIndex,
} from '../utils/shared.utils';
import { parseCommitStats } from '../../src/common/utils/commit-utils';
import { generateProfessionalPdfReport } from '../../src/formatters/pdf-report-formatter-professional';
import { SlackService } from '../../src/services/slack.service.js';
import { createEvaluationZip } from '../../src/utils/zip-utils.js';

/**
 * Extract commit hash from diff content
 */
function extractCommitHash(diff: string): string | null {
  // Try to find commit hash in diff header (git diff output)
  const commitMatch = diff.match(/^commit ([a-f0-9]{40})/m);
  if (commitMatch) {
    return commitMatch[1].substring(0, 8); // Use short hash
  }

  // Try to find in "From" line (git format-patch)
  const fromMatch = diff.match(/^From ([a-f0-9]{40})/m);
  if (fromMatch) {
    return fromMatch[1].substring(0, 8);
  }

  return null;
}

/**
 * Generate commit hash from diff content if not found
 */
function generateDiffHash(diff: string): string {
  return crypto.createHash('sha256').update(diff).digest('hex').substring(0, 8);
}

/**
 * Create structured output directory for commit evaluation
 */
function createOutputDirectory(diff: string, baseDir: string = '.'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

  // Try to extract commit hash, fallback to generated hash
  const commitHash = extractCommitHash(diff) || generateDiffHash(diff);

  // Create directory: .evaluated-commits/commit-hash_yyyyMMddHHmmss
  const evaluationsRoot = path.join(baseDir, '.evaluated-commits');
  const commitDir = path.join(evaluationsRoot, `${commitHash}_${timestamp}`);

  // Create directories recursively
  if (!fs.existsSync(evaluationsRoot)) {
    fs.mkdirSync(evaluationsRoot, { recursive: true });
  }

  if (!fs.existsSync(commitDir)) {
    fs.mkdirSync(commitDir, { recursive: true });
  }

  return commitDir;
}

/**
 * Get diff from git for a specific commit hash
 */
function getDiffFromCommit(commitHash: string, repoPath: string = '.'): string {
  const result = spawnSync('git', ['show', commitHash], {
    cwd: repoPath,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Git command failed: ${result.stderr}`);
  }

  return result.stdout;
}

/**
 * Get diff from current staged changes
 */
function getDiffFromStaged(repoPath: string = '.'): string {
  const result = spawnSync('git', ['diff', '--cached'], {
    cwd: repoPath,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Git command failed: ${result.stderr}`);
  }

  if (!result.stdout || result.stdout.trim().length === 0) {
    throw new Error('No staged changes found. Use "git add" to stage your changes first.');
  }

  return result.stdout;
}

/**
 * Get diff from current working directory changes (staged + unstaged)
 */
function getDiffFromCurrent(repoPath: string = '.'): string {
  const result = spawnSync('git', ['diff', 'HEAD'], {
    cwd: repoPath,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Git command failed: ${result.stderr}`);
  }

  if (!result.stdout || result.stdout.trim().length === 0) {
    throw new Error('No changes found in working directory.');
  }

  return result.stdout;
}

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
    diff = getDiffFromCommit(commitHash, repoPath);
    source = 'commit';
    sourceDescription = commitHash;
  } else if (args[0] && !args[0].startsWith('--')) {
    console.log(chalk.cyan(`\n📦 Fetching diff for commit: ${args[0]}\n`));
    diff = getDiffFromCommit(args[0], repoPath);
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
    outputDir = await createOutputDirectory(commitHash);

    const commitStats = parseCommitStats(diff);

    const metadata: EvaluationMetadata = {
      timestamp: new Date().toISOString(),
      commitHash,
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
  process.exit(0);
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
