// src/formatters/pdf-report-formatter-professional.ts

import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { AgentResult } from '../agents/agent.interface';
import { EvaluationHistoryEntry } from '../types/output.types';
import { default as chalk } from 'chalk';

type MetricKey =
  | 'functionalImpact'
  | 'idealTimeHours'
  | 'testCoverage'
  | 'codeQuality'
  | 'codeComplexity'
  | 'actualTimeHours'
  | 'technicalDebtHours'
  | 'debtReductionHours';

const PILLAR_METRICS: MetricKey[] = [
  'functionalImpact',
  'idealTimeHours',
  'testCoverage',
  'codeQuality',
  'codeComplexity',
  'actualTimeHours',
  'technicalDebtHours',
  'debtReductionHours',
];

const METRIC_LABELS: Record<MetricKey, string> = {
  functionalImpact: 'Functional Impact',
  idealTimeHours: 'Ideal Time (h)',
  testCoverage: 'Test Coverage',
  codeQuality: 'Code Quality',
  codeComplexity: 'Code Complexity',
  actualTimeHours: 'Actual Time (h)',
  technicalDebtHours: 'Tech Debt (h)',
  debtReductionHours: 'Debt Reduction (h)',
};

interface PdfMetadata {
  commitHash?: string;
  timestamp?: string;
  commitAuthor?: string;
  commitMessage?: string;
  commitDate?: string;
  developerOverview?: string;
}

async function embedFilesIntoPdf(pdfDoc: PDFDocument, files: string[], baseDir: string) {
  for (const file of files) {
    const filePath = path.join(baseDir, file);
    if (!fs.existsSync(filePath)) continue;

    const data = fs.readFileSync(filePath);

    // Attach file to PDF
    await pdfDoc.attach(data, file, {
      mimeType: guessMimeType(file),
      description: `Attached file: ${file}`,
      creationDate: new Date(),
      modificationDate: new Date(),
    });
  }
}

/**
 * Small util for proper MIME types
 */
function guessMimeType(file: string): string {
  if (file.endsWith('.json')) return 'application/json';
  if (file.endsWith('.md')) return 'text/markdown';
  if (file.endsWith('.txt')) return 'text/plain';
  if (file.endsWith('.html')) return 'text/html';
  if (file.endsWith('.diff') || file.endsWith('.patch')) return 'text/x-diff';
  return 'application/octet-stream';
}

export async function generateProfessionalPdfReport(
  results: AgentResult[],
  outputPath: string,
  metadata?: PdfMetadata,
  config?: any
): Promise<string> {
  const pdfDoc = await PDFDocument.create();

  // --- Fonts & base setup ---
  let page = pdfDoc.addPage();
  const pageMargin = 50;
  let cursorY = page.getHeight() - pageMargin;

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = page.getWidth();
  const contentWidth = pageWidth - pageMargin * 2;

  const corporateBlue = rgb(0.15, 0.35, 0.7);
  const lightGray = rgb(0.95, 0.96, 0.97);
  const darkGray = rgb(0.25, 0.25, 0.28);

  const history = loadEvaluationHistory(outputPath);
  const grouped = groupResultsByAgent(results);
  const consensus = calculateConsensus(grouped);
  const timelineEntries = buildTimeline(grouped);

  // ---------- Layout helpers ----------

  function newPage() {
    page = pdfDoc.addPage();
    cursorY = page.getHeight() - pageMargin;
  }

  /**
   * Ensure there is vertical space on the current page for `heightNeeded`.
   * If not, move to a new page.
   */
  function ensureSpace(heightNeeded: number) {
    if (cursorY - heightNeeded < pageMargin) {
      newPage();
    }
  }

  /**
   * Similar to ensureSpace, but for starting a *new section*.
   * Leaves a bit more breathing room at the bottom.
   */
  function ensureSectionStart(heightNeeded: number) {
    if (cursorY - heightNeeded < pageMargin + 20) {
      newPage();
    }
  }

  function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = (text || '').split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function drawText(
    text: string,
    fontSize: number,
    options: {
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) {
    const font = options.bold ? boldFont : regularFont;
    const color = options.color ?? rgb(0, 0, 0);

    const lines = wrapText(text, font, fontSize, contentWidth);

    for (const line of lines) {
      ensureSpace(fontSize + 6);
      page.drawText(line, {
        x: pageMargin,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= fontSize + 6;
    }
  }

  function drawWrappedParagraph(
    text: string,
    fontSize: number,
    font: any,
    color: ReturnType<typeof rgb> = darkGray
  ) {
    const lines = wrapText(text, font, fontSize, contentWidth);
    for (const line of lines) {
      ensureSpace(fontSize + 6);
      page.drawText(line, {
        x: pageMargin,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= fontSize + 6;
    }
  }

  function drawSectionTitle(title: string) {
    const barHeight = 18;
    ensureSectionStart(barHeight + 18);

    // Colored bar
    page.drawRectangle({
      x: pageMargin,
      y: cursorY - barHeight,
      width: contentWidth,
      height: barHeight,
      color: corporateBlue,
    });

    page.drawText(title, {
      x: pageMargin + 8,
      y: cursorY - barHeight + 4,
      size: 11,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    cursorY -= barHeight + 12;
  }

  function drawKeyValue(label: string, value?: string | number) {
    if (!value && value !== 0) return;
    ensureSpace(14 + 4);
    const labelText = `${label}: `;
    const labelWidth = boldFont.widthOfTextAtSize(labelText, 9);

    page.drawText(labelText, {
      x: pageMargin,
      y: cursorY,
      size: 9,
      font: boldFont,
      color: darkGray,
    });

    page.drawText(String(value), {
      x: pageMargin + labelWidth,
      y: cursorY,
      size: 9,
      font: regularFont,
      color: darkGray,
    });

    cursorY -= 14;
  }

  function drawDivider() {
    ensureSpace(10);
    page.drawLine({
      start: { x: pageMargin, y: cursorY },
      end: { x: pageMargin + contentWidth, y: cursorY },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.85),
    });
    cursorY -= 10;
  }

  function measureTextHeight(text: string, font: any, fontSize: number, maxWidth: number): number {
    const lines = wrapText(text, font, fontSize, maxWidth);
    if (lines.length === 0) return 0;
    return lines.length * (fontSize + 4);
  }

  // ---------- HEADER ----------

  ensureSpace(60);
  page.drawText('CodeWave Commit Evaluation Report', {
    x: pageMargin,
    y: cursorY,
    size: 18,
    font: boldFont,
    color: corporateBlue,
  });
  cursorY -= 26;

  drawText('AI-Powered multi-agent review (professional summary)', 10, {
    color: darkGray,
  });

  cursorY -= 8;
  drawKeyValue('Generated', metadata?.timestamp || new Date().toISOString());
  drawKeyValue('Commit Hash', metadata?.commitHash);
  drawKeyValue('Author', metadata?.commitAuthor);
  drawKeyValue('Commit Date', metadata?.commitDate);

  if (metadata?.commitMessage) {
    ensureSpace(16);
    drawText('Commit Message', 9, { bold: true, color: darkGray });
    drawWrappedParagraph(metadata.commitMessage, 9, regularFont);
  }

  drawDivider();

  // ---------- 7-PILLAR SUMMARY (2-column cards, safe layout) ----------

  drawSectionTitle('7-Pillar Evaluation Summary');

  const columns = 2;
  const colGap = 10;
  const colWidth = (contentWidth - colGap) / columns;

  const pillarEntries = PILLAR_METRICS.map((k) => ({
    key: k,
    label: METRIC_LABELS[k],
    value: consensus[k]?.value ?? null,
  }));

  const labelFontSize = 9;
  const valueFontSize = 10;
  const paddingVertical = 8;
  const paddingInner = 4;

  const cardHeight = paddingVertical * 2 + labelFontSize + paddingInner + valueFontSize;

  let currentRowTopY = cursorY;

  pillarEntries.forEach((item, index) => {
    const colIndex = index % columns;

    if (colIndex === 0) {
      // New row: ensure space for the whole row of cards
      ensureSpace(cardHeight + 8);
      currentRowTopY = cursorY;
      cursorY -= cardHeight + 8;
    }

    const x = pageMargin + colIndex * (colWidth + colGap);
    const yTop = currentRowTopY;
    const yBottom = yTop - cardHeight;

    page.drawRectangle({
      x,
      y: yBottom,
      width: colWidth,
      height: cardHeight,
      color: lightGray,
      borderColor: rgb(0.85, 0.86, 0.9),
      borderWidth: 0.5,
    });

    page.drawText(item.label, {
      x: x + 8,
      y: yTop - paddingVertical - labelFontSize,
      size: labelFontSize,
      font: boldFont,
      color: darkGray,
    });

    const valText =
      item.value === null || item.value === undefined
        ? '—'
        : item.key === 'idealTimeHours' ||
            item.key === 'actualTimeHours' ||
            item.key === 'technicalDebtHours' ||
            item.key === 'debtReductionHours'
          ? `${item.value.toFixed(1)} h`
          : item.value.toFixed(1);

    page.drawText(valText, {
      x: x + 8,
      y: yTop - paddingVertical - labelFontSize - paddingInner - valueFontSize,
      size: valueFontSize,
      font: regularFont,
      color: corporateBlue,
    });
  });

  cursorY -= 10;
  drawDivider();

  // ---------- DEVELOPER OVERVIEW ----------

  drawSectionTitle('Developer Overview');

  if (metadata?.developerOverview) {
    drawWrappedParagraph(metadata.developerOverview, 9, regularFont);
  } else {
    drawWrappedParagraph(
      'No explicit developer overview was provided for this commit.',
      9,
      regularFont,
      darkGray
    );
  }

  drawDivider();

  // ---------- AGENT EVALUATIONS (dynamic card height) ----------

  drawSectionTitle('Agent Evaluations');

  for (const [agentName, evals] of Object.entries(grouped)) {
    const latest = evals[evals.length - 1];

    // --- dynamic card height ---
    const leftColumnWidth = contentWidth * 0.55;
    const rightColumnWidth = contentWidth - leftColumnWidth - 24; // 24px for padding

    const summaryText = latest.summary || 'No summary.';
    const summaryHeight = measureTextHeight(summaryText, regularFont, 9, leftColumnWidth - 20);

    const metricLines = latest.metrics ? Object.entries(latest.metrics).slice(0, 7).length : 0;
    const metricHeight = metricLines * 12;

    const baseHeaderHeight = 30; // name + rounds
    const contentPadding = 16;
    const dynamicHeight = baseHeaderHeight + summaryHeight + metricHeight + contentPadding;

    const cardHeight = Math.max(80, dynamicHeight);

    ensureSectionStart(cardHeight + 12);

    const cardTopY = cursorY;
    const cardBottomY = cardTopY - cardHeight;

    page.drawRectangle({
      x: pageMargin,
      y: cardBottomY,
      width: contentWidth,
      height: cardHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.86, 0.9),
      borderWidth: 0.75,
    });

    // Agent name
    page.drawText(agentName, {
      x: pageMargin + 10,
      y: cardTopY - 14,
      size: 11,
      font: boldFont,
      color: corporateBlue,
    });

    // Rounds
    page.drawText(`Rounds: ${evals.length}`, {
      x: pageMargin + 10,
      y: cardTopY - 28,
      size: 9,
      font: regularFont,
      color: darkGray,
    });

    // Summary (left)
    const leftContentX = pageMargin + 10;
    let summaryY = cardTopY - 42;
    const wrappedSummary = wrapText(summaryText, regularFont, 9, leftColumnWidth - 20);

    wrappedSummary.forEach((line) => {
      page.drawText(line, {
        x: leftContentX,
        y: summaryY,
        size: 9,
        font: regularFont,
        color: darkGray,
      });
      summaryY -= 12;
    });

    // Metrics (right)
    if (latest.metrics) {
      const metricX = pageMargin + leftColumnWidth + 20;
      let metricY = cardTopY - 30;

      Object.entries(latest.metrics)
        .slice(0, 7)
        .forEach(([key, value]) => {
          const label = prettifyMetricKey(key);
          page.drawText(`${label}: ${value}`, {
            x: metricX,
            y: metricY,
            size: 8.5,
            font: regularFont,
            color: darkGray,
          });
          metricY -= 11;
        });
    }

    cursorY -= cardHeight + 12;
  }

  drawDivider();

  // ---------- CONVERSATION TIMELINE (wrapped) ----------

  drawSectionTitle('Conversation Timeline (Compact)');

  timelineEntries.forEach((entry) => {
    const prefix = `Round ${entry.round} • ${entry.agent}: `;
    const fullText = prefix + entry.summary;
    const lines = wrapText(fullText, regularFont, 9, contentWidth);

    lines.forEach((line, idx) => {
      ensureSpace(14);
      page.drawText(line, {
        x: pageMargin,
        y: cursorY,
        size: 9,
        font: regularFont,
        color: darkGray,
      });
      cursorY -= 14;
    });
    cursorY -= 4;
  });

  drawDivider();

  // ---------- EVALUATION HISTORY (if available) ----------

  if (history.length > 0) {
    drawSectionTitle('Evaluation History');

    history.forEach((h) => {
      const ts = new Date(h.timestamp).toLocaleString();
      ensureSpace(30);

      const header = `#${h.evaluationNumber} • ${ts}`;
      page.drawText(header, {
        x: pageMargin,
        y: cursorY,
        size: 9,
        font: boldFont,
        color: darkGray,
      });
      cursorY -= 14;

      const m = h.metrics as any;
      const line = `Functional Impact: ${safeNumber(m.functionalImpact)} | Code Quality: ${safeNumber(
        m.codeQuality
      )} | Tech Debt (h): ${safeNumber(m.technicalDebtHours)}`;
      const wrapped = wrapText(line, regularFont, 8.5, contentWidth);
      wrapped.forEach((w) => {
        ensureSpace(12);
        page.drawText(w, {
          x: pageMargin + 10,
          y: cursorY,
          size: 8.5,
          font: regularFont,
          color: darkGray,
        });
        cursorY -= 12;
      });

      cursorY -= 4;
    });
  }

  // ---------- FOOTER ----------

  ensureSpace(30);
  drawDivider();
  drawText('Generated by CodeWave multi-agent evaluation system', 8, {
    color: rgb(0.5, 0.5, 0.55),
  });

  const metadataConfig = config.pdfReport;

  if (metadataConfig?.attachFiles && metadataConfig.filesToAttach?.length) {
    await embedFilesIntoPdf(pdfDoc, metadataConfig.filesToAttach, metadataConfig.outputDir);
  }

  // ---------- SAVE PDF ----------

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

// ----------------- Helpers -------------------

function groupResultsByAgent(results: AgentResult[]): Record<string, AgentResult[]> {
  const grouped: Record<string, AgentResult[]> = {};
  results.forEach((r) => {
    const name = r.agentName || 'Agent';
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(r);
  });
  return grouped;
}

function calculateConsensus(
  grouped: Record<string, AgentResult[]>
): Record<string, { value: number | null; agent: string }> {
  const result: Record<string, { value: number | null; agent: string }> = {};

  PILLAR_METRICS.forEach((metricKey) => {
    let sum = 0;
    let count = 0;
    let lastAgent = '';

    for (const [agentName, evals] of Object.entries(grouped)) {
      const latest = evals[evals.length - 1];
      const value = latest.metrics?.[metricKey];
      if (typeof value === 'number') {
        sum += value;
        count++;
        lastAgent = agentName;
      }
    }

    result[metricKey] = {
      value: count > 0 ? sum / count : null,
      agent: lastAgent || '—',
    };
  });

  return result;
}

function buildTimeline(
  grouped: Record<string, AgentResult[]>
): Array<{ round: number; agent: string; summary: string }> {
  const entries: Array<{ round: number; agent: string; summary: string }> = [];
  let round = 1;
  const agents = Object.keys(grouped);

  // Simple sequence in the order we have the results per agent
  agents.forEach((agentName) => {
    grouped[agentName].forEach((evalResult) => {
      entries.push({
        round,
        agent: agentName,
        summary: evalResult.summary || '(no summary)',
      });
      round++;
    });
  });

  return entries;
}

function loadEvaluationHistory(outputPath: string): EvaluationHistoryEntry[] {
  try {
    const dir = path.dirname(outputPath);
    const historyPath = path.join(dir, 'history.json');
    if (!fs.existsSync(historyPath)) return [];
    const content = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function prettifyMetricKey(key: string): string {
  if ((METRIC_LABELS as any)[key]) return (METRIC_LABELS as any)[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function safeNumber(value: unknown): string {
  return typeof value === 'number' ? value.toFixed(2) : 'N/A';
}
