// src/utils/zip-utils.ts
// ZIP file creation utilities for packaging evaluation results

import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

/**
 * Create a ZIP archive from an evaluation directory
 * Includes all generated files: report-enhanced.html, conversation.md, results.json, summary.txt, commit.diff, history.json
 *
 * @param outputDir - Directory containing evaluation files
 * @param commitHash - Commit hash for filename
 * @returns Path to created ZIP file
 */
export async function createEvaluationZip(outputDir: string, commitHash: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const zipFilename = `codewave-${commitHash.substring(0, 8)}-${timestamp}.zip`;
    const zipPath = path.join(outputDir, zipFilename);

    // Create file stream
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle errors
    archive.on('error', (err) => {
      reject(new Error(`Failed to create ZIP archive: ${err.message}`));
    });

    output.on('error', (err) => {
      reject(new Error(`Failed to write ZIP file: ${err.message}`));
    });

    // Resolve when archive is finalized
    output.on('close', () => {
      resolve(zipPath);
    });

    // Pipe archive data to file
    archive.pipe(output);

    // Files to include in ZIP
    const filesToInclude = [
      'report-enhanced.html',
      'conversation.md',
      'results.json',
      'summary.txt',
      'commit.diff',
      'history.json', // Optional, may not exist
    ];

    // Add files to archive
    for (const filename of filesToInclude) {
      const filePath = path.join(outputDir, filename);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: filename });
      }
    }

    // Finalize the archive
    archive.finalize();
  });
}
