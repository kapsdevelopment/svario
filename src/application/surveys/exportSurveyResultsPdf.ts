import { jsPDF } from 'jspdf';

import {
  buildFreeTextWordCloud,
  type FreeTextWordCloudItem,
} from './buildFreeTextWordCloud';
import type {
  QuestionVisualizationColorMode,
  QuestionVisualizationType,
  SurveyChoiceResult,
  SurveyFreeTextResult,
  SurveyLikertResult,
  SurveyQuestionResult,
  SurveyResults,
} from '../../domain/surveys/survey';

type PdfColumn = {
  header: string;
  width: number;
  align?: 'left' | 'right';
};

type SummaryStat = {
  label: string;
  value: string;
};

type PreparedPdfTableRow = {
  cellLines: string[][];
  rowHeight: number;
};

type PdfWordCloudItem = FreeTextWordCloudItem & {
  fontSize: number;
  height: number;
  rotation: number;
  width: number;
  x: number;
  y: number;
};

type PdfDistributionItem = {
  color: string;
  count: number;
  id: string;
  label: string;
  percentage: number;
};

type PdfChartType = Extract<QuestionVisualizationType, 'bar' | 'pie'>;

const colors = {
  ink: '#17201d',
  pine: '#183a34',
  moss: '#4f6c5d',
  muted: '#607681',
  line: '#d9d3c7',
  paper: '#fffdf8',
  soft: '#f3f0e8',
  white: '#ffffff',
  fjord: '#375c68',
  rust: '#b86b3b',
  gold: '#c2933a',
};
const colorfulPalette = [
  '#2f6f73',
  colors.rust,
  '#6f6ca8',
  colors.gold,
  '#8a536b',
  '#4d7f54',
  '#c35f4b',
  '#4d7fa0',
];
const wordCloudToneColors = {
  1: colors.pine,
  2: colors.moss,
  3: colors.fjord,
  4: '#7a5b45',
  5: colors.muted,
} satisfies Record<FreeTextWordCloudItem['tone'], string>;

const margins = {
  page: 48,
  footer: 34,
};
const tableHeaderHeight = 26;
const tableStartPadding = 48;
const wordCloudHeight = 166;
const wordCloudPadding = 14;
const wordCloudFontSizes = {
  1: 9,
  2: 12,
  3: 16,
  4: 22,
  5: 30,
} satisfies Record<FreeTextWordCloudItem['weight'], number>;

export function buildSurveyResultsPdf(
  results: SurveyResults,
  generatedAt = new Date(),
) {
  const doc = new jsPDF({
    format: 'a4',
    orientation: 'portrait',
    unit: 'pt',
  });
  const report = new PdfReportWriter(doc, generatedAt);

  report.addIntro(results);
  report.addSummary([
    { label: 'Svar', value: String(results.responseCount) },
    { label: 'Spørsmål', value: String(results.questionResults.length) },
    {
      label: 'Siste svar',
      value: results.lastSubmittedAt
        ? formatDateTime(results.lastSubmittedAt)
        : 'Ingen svar',
    },
  ]);
  report.addMetadata(results);
  report.addQuestionResults(results);
  report.finish();

  return doc.output('blob');
}

export function createSurveyResultsPdfFileName(
  results: Pick<SurveyResults, 'slug' | 'title'>,
  generatedAt = new Date(),
) {
  const fileStem = sanitizeFileNamePart(results.slug || results.title || 'svario');
  return `${fileStem}-report-${formatDateStamp(generatedAt)}.pdf`;
}

class PdfReportWriter {
  private readonly contentWidth: number;
  private readonly pageHeight: number;
  private readonly pageWidth: number;
  private y = margins.page;

  constructor(
    private readonly doc: jsPDF,
    private readonly generatedAt: Date,
  ) {
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - margins.page * 2;
    this.doc.setProperties({
      author: 'Svario',
      creator: 'Svario',
      subject: 'Spørreskjemaresultater',
      title: 'Svario resultatrapport',
    });
  }

  addIntro(results: SurveyResults) {
    this.doc.setFillColor(colors.soft);
    this.doc.rect(0, 0, this.pageWidth, 168, 'F');

    this.y = 58;
    this.addWrappedText('Svario', {
      color: colors.muted,
      fontSize: 10,
      fontStyle: 'bold',
      gapAfter: 10,
      lineHeight: 13,
    });
    this.addWrappedText('Resultatrapport', {
      color: colors.pine,
      fontSize: 13,
      fontStyle: 'bold',
      gapAfter: 8,
      lineHeight: 16,
    });
    this.addWrappedText(results.title, {
      color: colors.ink,
      fontSize: 25,
      fontStyle: 'bold',
      gapAfter: 10,
      lineHeight: 31,
      width: this.contentWidth - 40,
    });

    const modeLabel =
      results.responseMode === 'anonymous'
        ? 'Anonyme besvarelser'
        : 'Identifiserte besvarelser';
    this.addWrappedText(`${modeLabel} - ${statusLabel[results.status]}`, {
      color: colors.muted,
      fontSize: 10,
      gapAfter: 28,
      lineHeight: 13,
    });

    if (results.description) {
      this.addWrappedText(results.description, {
        color: colors.ink,
        fontSize: 10,
        gapAfter: 16,
        lineHeight: 15,
      });
    }
  }

  addSummary(stats: SummaryStat[]) {
    const gap = 10;
    const cardHeight = 62;
    const cardWidth = (this.contentWidth - gap * (stats.length - 1)) / stats.length;

    this.ensureSpace(cardHeight + 18);

    stats.forEach((stat, index) => {
      const x = margins.page + index * (cardWidth + gap);
      this.doc.setFillColor(colors.white);
      this.doc.setDrawColor(colors.line);
      this.doc.roundedRect(x, this.y, cardWidth, cardHeight, 8, 8, 'FD');

      this.setTextStyle(9, 'bold', colors.muted);
      this.doc.text(stat.label, x + 14, this.y + 22);
      this.setTextStyle(18, 'bold', colors.pine);
      this.doc.text(stat.value, x + 14, this.y + 47);
    });

    this.y += cardHeight + 18;
  }

  addMetadata(results: SurveyResults) {
    this.addSectionHeading('Om rapporten');
    this.addTable(
      [
        { header: 'Felt', width: 150 },
        { header: 'Verdi', width: this.contentWidth - 150 },
      ],
      [
        ['Skjema', results.slug],
        ['Status', statusLabel[results.status]],
        [
          'Svarmodus',
          results.responseMode === 'anonymous'
            ? 'Anonyme besvarelser'
            : 'Identifiserte besvarelser',
        ],
        ['Opprettet', formatDateTime(results.createdAt)],
        [
          'Publisert',
          results.publishedAt ? formatDateTime(results.publishedAt) : 'Ikke publisert',
        ],
        ['Tidsrom', formatSurveyWindow(results)],
        ['Rapport generert', formatDateTime(this.generatedAt.toISOString())],
      ],
    );
  }

  addQuestionResults(results: SurveyResults) {
    if (results.questionResults.length === 0) {
      this.ensureSpace(this.measureSectionHeadingHeight('Spørsmål og svar') + 23);
      this.addSectionHeading('Spørsmål og svar');
      this.addMutedLine('Skjemaet har ingen spørsmål ennå.');
      return;
    }

    this.ensureSpace(
      this.measureSectionHeadingHeight('Spørsmål og svar') +
        this.measureQuestionKeepHeight(
          results.questionResults[0],
          1,
          results.responseCount,
        ),
    );
    this.addSectionHeading('Spørsmål og svar');

    const sectionTitleById = new Map(
      results.sections
        .filter((section) => section.title)
        .map((section) => [section.id, section.title as string]),
    );
    let currentSectionId: string | null = null;

    results.questionResults.forEach((result, index) => {
      let startsAfterHeading = index === 0;

      if (result.question.sectionId !== currentSectionId) {
        currentSectionId = result.question.sectionId;
        const sectionTitle = currentSectionId
          ? sectionTitleById.get(currentSectionId)
          : null;

        if (sectionTitle) {
          this.ensureSpace(
            this.measureSubsectionHeadingHeight(sectionTitle) +
              this.measureQuestionKeepHeight(result, index + 1, results.responseCount),
          );
          this.addSubsectionHeading(sectionTitle);
          startsAfterHeading = true;
        }
      }

      this.addQuestionResult(
        result,
        index + 1,
        results.responseCount,
        startsAfterHeading ? 'start' : 'full',
      );
    });
  }

  finish() {
    const pageCount = this.doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      this.doc.setPage(page);
      this.setTextStyle(8, 'normal', colors.muted);
      this.doc.text(
        `Svario - generert ${formatDateTime(this.generatedAt.toISOString())}`,
        margins.page,
        this.pageHeight - 20,
      );
      this.doc.text(
        `${page}/${pageCount}`,
        this.pageWidth - margins.page,
        this.pageHeight - 20,
        { align: 'right' },
      );
    }
  }

  private addQuestionResult(
    result: SurveyQuestionResult,
    index: number,
    responseCount: number,
    keepMode: 'full' | 'start' = 'full',
  ) {
    this.ensureSpace(
      keepMode === 'start'
        ? this.measureQuestionStartKeepHeight(result, index, responseCount)
        : this.measureQuestionKeepHeight(result, index, responseCount),
    );
    this.addGap(8);
    this.addWrappedText(`Spørsmål ${index}`, {
      color: colors.muted,
      fontSize: 8,
      fontStyle: 'bold',
      gapAfter: 5,
      lineHeight: 11,
    });
    this.addWrappedText(result.question.prompt, {
      color: colors.ink,
      fontSize: 14,
      fontStyle: 'bold',
      gapAfter: 5,
      lineHeight: 18,
    });
    this.addWrappedText(
      `${getQuestionTypeLabel(result.question)} - ${result.answeredCount}/${responseCount} besvart`,
      {
        color: colors.muted,
        fontSize: 9,
        gapAfter: result.question.description ? 8 : 12,
        lineHeight: 12,
      },
    );

    if (result.question.description) {
      this.addWrappedText(result.question.description, {
        color: colors.ink,
        fontSize: 9,
        gapAfter: 12,
        lineHeight: 13,
      });
    }

    if (result.question.type === 'multiple_choice') {
      this.addChoiceResults(
        result.choiceResults,
        result.question.visualizationType,
        result.question.visualizationColorMode,
      );
    }

    if (result.question.type === 'likert_scale') {
      this.addLikertResults(
        result.likertResults,
        result.likertAverage,
        result.question.scaleVariant,
        result.question.visualizationType,
        result.question.visualizationColorMode,
      );
    }

    if (result.question.type === 'free_text') {
      this.addFreeTextResults(
        result.freeTextResults,
        result.question.visualizationType,
        result.question.visualizationColorMode,
      );
    }

    if (result.skippedCount > 0) {
      this.addMutedLine(`${result.skippedCount} uten svar på dette spørsmålet.`);
    }

    this.addRule(18);
  }

  private addChoiceResults(
    results: SurveyChoiceResult[],
    visualizationType: QuestionVisualizationType,
    colorMode: QuestionVisualizationColorMode,
  ) {
    this.addDistributionVisual(
      toChoiceDistributionItems(results, colorMode, colors.pine),
      getPdfChartType(visualizationType),
      'Ingen alternativer er registrert.',
    );
  }

  private addLikertResults(
    results: SurveyLikertResult[],
    average: number | null,
    scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
    visualizationType: QuestionVisualizationType,
    colorMode: QuestionVisualizationColorMode,
  ) {
    this.addWrappedText(formatLikertSummary(results, average, scaleVariant), {
      color: colors.pine,
      fontSize: 10,
      fontStyle: 'bold',
      gapAfter: 8,
      lineHeight: 14,
    });
    this.addDistributionVisual(
      toLikertDistributionItems(results, colorMode),
      getPdfChartType(visualizationType),
      'Ingen skalaverdier er registrert.',
    );
  }

  private addFreeTextResults(
    results: SurveyFreeTextResult[],
    visualizationType: QuestionVisualizationType,
    colorMode: QuestionVisualizationColorMode,
  ) {
    if (results.length === 0) {
      this.addMutedLine('Ingen fritekstsvar ennå.');
      return;
    }

    const wordCloud = buildFreeTextWordCloud(results);

    if (visualizationType === 'word_cloud' && wordCloud.length > 0) {
      this.addWordCloud(wordCloud, colorMode);
    }

    results.forEach((result, index) => {
      this.ensureSpace(this.measureFreeTextResultHeight(result));
      this.addWrappedText(
        `${result.respondentLabel ?? `Svar ${index + 1}`} - ${formatDateTime(
          result.submittedAt,
        )}`,
        {
          color: colors.muted,
          fontSize: 8,
          fontStyle: 'bold',
          gapAfter: 4,
          lineHeight: 11,
        },
      );
      this.addWrappedText(result.text, {
        color: colors.ink,
        fontSize: 10,
        gapAfter: 8,
        lineHeight: 14,
      });
      this.addRule(8);
    });
  }

  private addDistributionVisual(
    items: PdfDistributionItem[],
    chartType: PdfChartType,
    emptyMessage: string,
  ) {
    if (items.length === 0) {
      this.addMutedLine(emptyMessage);
      return;
    }

    if (chartType === 'pie') {
      this.addPieDistribution(items);
      return;
    }

    this.addBarDistribution(items);
  }

  private addBarDistribution(items: PdfDistributionItem[]) {
    const chartHeight = this.getBarDistributionHeight(items);
    const rowGap = 6;
    const rowHeight = Math.min(
      22,
      (chartHeight - 18 - rowGap * Math.max(0, items.length - 1)) /
        Math.max(1, items.length),
    );
    const labelWidth = Math.min(168, this.contentWidth * 0.34);
    const valueWidth = 76;
    const trackX = margins.page + labelWidth + 10;
    const trackWidth = this.contentWidth - labelWidth - valueWidth - 24;
    const maxCount = Math.max(1, ...items.map((item) => item.count));

    this.ensureSpace(chartHeight + 14);
    this.doc.setFillColor(colors.paper);
    this.doc.roundedRect(
      margins.page,
      this.y,
      this.contentWidth,
      chartHeight,
      8,
      8,
      'F',
    );

    let rowY = this.y + 14;
    items.forEach((item) => {
      const barWidth = Math.max(3, (item.count / maxCount) * trackWidth);
      const textY = rowY + rowHeight / 2 + 3;

      this.setTextStyle(8, 'bold', colors.ink);
      this.doc.text(
        this.truncateTextToWidth(item.label, labelWidth - 8),
        margins.page + 10,
        textY,
      );

      this.doc.setFillColor(colors.soft);
      this.doc.roundedRect(trackX, rowY + 3, trackWidth, rowHeight - 6, 4, 4, 'F');
      this.doc.setFillColor(item.color);
      this.doc.roundedRect(trackX, rowY + 3, barWidth, rowHeight - 6, 4, 4, 'F');

      this.setTextStyle(8, 'bold', colors.muted);
      this.doc.text(
        `${item.count} (${formatPercentage(item.percentage)})`,
        margins.page + this.contentWidth - 10,
        textY,
        { align: 'right' },
      );

      rowY += rowHeight + rowGap;
    });

    this.y += chartHeight + 14;
  }

  private addPieDistribution(items: PdfDistributionItem[]) {
    const chartHeight = this.getPieDistributionHeight(items);
    const total = items.reduce((sum, item) => sum + item.count, 0);
    const radius = 54;
    const centerX = margins.page + 74;
    const centerY = this.y + chartHeight / 2;
    const legendX = margins.page + 154;
    const legendWidth = this.contentWidth - 166;

    this.ensureSpace(chartHeight + 14);
    this.doc.setFillColor(colors.paper);
    this.doc.roundedRect(
      margins.page,
      this.y,
      this.contentWidth,
      chartHeight,
      8,
      8,
      'F',
    );

    if (total > 0) {
      let startAngle = -Math.PI / 2;
      items.forEach((item) => {
        if (item.count === 0) {
          return;
        }

        const endAngle = startAngle + (item.count / total) * Math.PI * 2;
        this.drawPieSlice(centerX, centerY, radius, startAngle, endAngle, item.color);
        startAngle = endAngle;
      });
    } else {
      this.doc.setFillColor(colors.soft);
      this.doc.circle(centerX, centerY, radius, 'F');
    }

    this.doc.setDrawColor(colors.white);
    this.doc.setLineWidth(1.2);
    this.doc.circle(centerX, centerY, radius, 'S');
    this.doc.setLineWidth(0.2);

    let legendY = this.y + 22;
    items.forEach((item) => {
      this.doc.setFillColor(item.color);
      this.doc.roundedRect(legendX, legendY - 8, 8, 8, 2, 2, 'F');

      this.setTextStyle(8, 'normal', colors.ink);
      this.doc.text(
        this.truncateTextToWidth(item.label, legendWidth - 96),
        legendX + 15,
        legendY,
      );
      this.setTextStyle(8, 'bold', colors.muted);
      this.doc.text(
        `${item.count} (${formatPercentage(item.percentage)})`,
        margins.page + this.contentWidth - 10,
        legendY,
        { align: 'right' },
      );

      legendY += 16;
    });

    this.y += chartHeight + 14;
  }

  private drawPieSlice(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string,
  ) {
    const angleSpan = endAngle - startAngle;
    const segments = Math.max(6, Math.ceil(angleSpan / (Math.PI / 18)));
    const lines: number[][] = [
      [
        Math.cos(startAngle) * radius,
        Math.sin(startAngle) * radius,
      ],
    ];

    let previousX = centerX + Math.cos(startAngle) * radius;
    let previousY = centerY + Math.sin(startAngle) * radius;

    for (let index = 1; index <= segments; index += 1) {
      const angle = startAngle + (angleSpan * index) / segments;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      lines.push([x - previousX, y - previousY]);
      previousX = x;
      previousY = y;
    }

    this.doc.setFillColor(color);
    this.doc.lines(lines, centerX, centerY, [1, 1], 'F', true);
  }

  private addWordCloud(
    items: FreeTextWordCloudItem[],
    colorMode: QuestionVisualizationColorMode,
  ) {
    const placedItems = this.buildWordCloudLayout(items);

    if (placedItems.length === 0) {
      return;
    }

    const headerHeight = 19;
    this.ensureSpace(headerHeight + wordCloudHeight + 18);

    this.setTextStyle(9, 'bold', colors.pine);
    this.doc.text('Ordsky', margins.page, this.y + 10);
    this.setTextStyle(8, 'bold', colors.muted);
    this.doc.text(`${placedItems.length} ord`, margins.page + this.contentWidth, this.y + 10, {
      align: 'right',
    });
    this.y += headerHeight;

    this.doc.setFillColor(colors.paper);
    this.doc.roundedRect(
      margins.page,
      this.y,
      this.contentWidth,
      wordCloudHeight,
      8,
      8,
      'F',
    );

    placedItems.forEach((item) => {
      this.setTextStyle(
        item.fontSize,
        'bold',
        getWordCloudColor(item, colorMode),
      );
      this.doc.text(item.word, margins.page + item.x, this.y + item.y, {
        align: 'center',
        angle: item.rotation,
        baseline: 'middle',
      });
    });

    this.y += wordCloudHeight + 18;
  }

  private addSectionHeading(title: string) {
    this.ensureSpace(this.measureSectionHeadingHeight(title));
    this.addGap(8);
    this.addWrappedText(title, {
      color: colors.pine,
      fontSize: 15,
      fontStyle: 'bold',
      gapAfter: 10,
      lineHeight: 19,
    });
  }

  private addSubsectionHeading(title: string) {
    this.ensureSpace(this.measureSubsectionHeadingHeight(title));
    this.addWrappedText(title, {
      color: colors.moss,
      fontSize: 11,
      fontStyle: 'bold',
      gapAfter: 8,
      lineHeight: 15,
    });
  }

  private addTable(
    columns: PdfColumn[],
    rows: string[][],
    emptyMessage = 'Ingen data.',
  ) {
    if (rows.length === 0) {
      this.addMutedLine(emptyMessage);
      return;
    }

    const preparedRows = this.prepareTableRows(columns, rows);
    const firstRowHeight = preparedRows[0]?.rowHeight ?? 0;

    if (
      this.y + tableHeaderHeight + firstRowHeight + tableStartPadding >
      this.bottomY
    ) {
      this.addPage();
    }
    this.drawTableHeader(columns);

    preparedRows.forEach(({ cellLines, rowHeight }, rowIndex) => {
      if (this.y + rowHeight > this.bottomY) {
        this.addPage();
        this.drawTableHeader(columns);
      }

      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(colors.paper);
        this.doc.rect(margins.page, this.y, this.contentWidth, rowHeight, 'F');
      }

      this.doc.setDrawColor(colors.line);
      this.doc.line(
        margins.page,
        this.y + rowHeight,
        margins.page + this.contentWidth,
        this.y + rowHeight,
      );

      let x = margins.page;
      cellLines.forEach((lines, columnIndex) => {
        const column = columns[columnIndex];
        const align = column.align ?? 'left';
        const textX = align === 'right' ? x + column.width - 8 : x + 8;

        this.setTextStyle(9, 'normal', colors.ink);
        lines.forEach((line, lineIndex) => {
          this.doc.text(line, textX, this.y + 18 + lineIndex * 12, { align });
        });
        x += column.width;
      });

      this.y += rowHeight;
    });

    this.addGap(12);
  }

  private measureQuestionKeepHeight(
    result: SurveyQuestionResult,
    index: number,
    responseCount: number,
  ) {
    const fullHeight = this.measureQuestionHeight(result, index, responseCount);
    const minHeight = this.measureQuestionStartKeepHeight(
      result,
      index,
      responseCount,
    );

    return fullHeight <= this.bodyHeight
      ? fullHeight
      : Math.min(minHeight, this.bodyHeight);
  }

  private measureQuestionStartKeepHeight(
    result: SurveyQuestionResult,
    index: number,
    responseCount: number,
  ) {
    return Math.min(
      this.measureQuestionIntroHeight(result, index, responseCount) +
        this.measureQuestionFirstResponseHeight(result),
      this.bodyHeight,
    );
  }

  private measureQuestionHeight(
    result: SurveyQuestionResult,
    index: number,
    responseCount: number,
  ) {
    return (
      this.measureQuestionIntroHeight(result, index, responseCount) +
      this.measureQuestionResponsesHeight(result) +
      this.measureSkippedHeight(result) +
      18
    );
  }

  private measureQuestionIntroHeight(
    result: SurveyQuestionResult,
    index: number,
    responseCount: number,
  ) {
    const metaGapAfter = result.question.description ? 8 : 12;

    return (
      8 +
      this.measureWrappedTextHeight(`Spørsmål ${index}`, {
        fontSize: 8,
        fontStyle: 'bold',
        gapAfter: 5,
        lineHeight: 11,
      }) +
      this.measureWrappedTextHeight(result.question.prompt, {
        fontSize: 14,
        fontStyle: 'bold',
        gapAfter: 5,
        lineHeight: 18,
      }) +
      this.measureWrappedTextHeight(
        `${getQuestionTypeLabel(result.question)} - ${result.answeredCount}/${responseCount} besvart`,
        {
          fontSize: 9,
          gapAfter: metaGapAfter,
          lineHeight: 12,
        },
      ) +
      (result.question.description
        ? this.measureWrappedTextHeight(result.question.description, {
            fontSize: 9,
            gapAfter: 12,
            lineHeight: 13,
          })
        : 0)
    );
  }

  private measureQuestionResponsesHeight(result: SurveyQuestionResult) {
    if (result.question.type === 'multiple_choice') {
      return this.measureChoiceResultsHeight(
        result.choiceResults,
        result.question.visualizationType,
      );
    }

    if (result.question.type === 'likert_scale') {
      return this.measureLikertResultsHeight(
        result.likertResults,
        result.likertAverage,
        result.question.scaleVariant,
        result.question.visualizationType,
      );
    }

    return this.measureFreeTextResultsHeight(
      result.freeTextResults,
      result.question.visualizationType,
    );
  }

  private measureQuestionFirstResponseHeight(result: SurveyQuestionResult) {
    if (result.question.type === 'multiple_choice') {
      return this.measureChoiceResultsStartHeight(
        result.choiceResults,
        result.question.visualizationType,
      );
    }

    if (result.question.type === 'likert_scale') {
      return this.measureLikertResultsStartHeight(
        result.likertResults,
        result.likertAverage,
        result.question.scaleVariant,
        result.question.visualizationType,
      );
    }

    return this.measureFreeTextResultsStartHeight(
      result.freeTextResults,
      result.question.visualizationType,
    );
  }

  private measureChoiceResultsHeight(
    results: SurveyChoiceResult[],
    visualizationType: QuestionVisualizationType,
  ) {
    if (results.length === 0) {
      return this.measureMutedLineHeight('Ingen alternativer er registrert.');
    }

    return this.measureDistributionHeight(results.length, visualizationType);
  }

  private measureChoiceResultsStartHeight(
    results: SurveyChoiceResult[],
    visualizationType: QuestionVisualizationType,
  ) {
    if (results.length === 0) {
      return this.measureMutedLineHeight('Ingen alternativer er registrert.');
    }

    return Math.min(
      this.measureDistributionHeight(results.length, visualizationType),
      this.bodyHeight,
    );
  }

  private measureLikertResultsHeight(
    results: SurveyLikertResult[],
    average: number | null,
    scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
    visualizationType: QuestionVisualizationType,
  ) {
    return (
      this.measureLikertSummaryHeight(results, average, scaleVariant) +
      (results.length === 0
        ? this.measureMutedLineHeight('Ingen skalaverdier er registrert.')
        : this.measureDistributionHeight(results.length, visualizationType))
    );
  }

  private measureLikertResultsStartHeight(
    results: SurveyLikertResult[],
    average: number | null,
    scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
    visualizationType: QuestionVisualizationType,
  ) {
    return (
      this.measureLikertSummaryHeight(results, average, scaleVariant) +
      Math.min(
        results.length === 0
          ? this.measureMutedLineHeight('Ingen skalaverdier er registrert.')
          : this.measureDistributionHeight(results.length, visualizationType),
        this.bodyHeight,
      )
    );
  }

  private measureLikertSummaryHeight(
    results: SurveyLikertResult[],
    average: number | null,
    scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
  ) {
    return this.measureWrappedTextHeight(
      formatLikertSummary(results, average, scaleVariant),
      {
        fontSize: 10,
        fontStyle: 'bold',
        gapAfter: 8,
        lineHeight: 14,
      },
    );
  }

  private measureFreeTextResultsHeight(
    results: SurveyFreeTextResult[],
    visualizationType: QuestionVisualizationType,
  ) {
    if (results.length === 0) {
      return this.measureMutedLineHeight('Ingen fritekstsvar ennå.');
    }

    const wordCloudHeight = this.measureWordCloudHeight(results, visualizationType);

    return results.reduce(
      (height, result) => height + this.measureFreeTextResultHeight(result),
      wordCloudHeight,
    );
  }

  private measureFreeTextResultsStartHeight(
    results: SurveyFreeTextResult[],
    visualizationType: QuestionVisualizationType,
  ) {
    if (results.length === 0) {
      return this.measureMutedLineHeight('Ingen fritekstsvar ennå.');
    }

    const wordCloudHeight = this.measureWordCloudHeight(results, visualizationType);
    return wordCloudHeight > 0
      ? wordCloudHeight
      : this.measureFreeTextResultHeight(results[0]);
  }

  private measureFreeTextResultHeight(result: SurveyFreeTextResult) {
    return (
      this.measureWrappedTextHeight(
        `${result.respondentLabel ?? 'Svar'} - ${formatDateTime(result.submittedAt)}`,
        {
          fontSize: 8,
          fontStyle: 'bold',
          gapAfter: 4,
          lineHeight: 11,
        },
      ) +
      this.measureWrappedTextHeight(result.text, {
        fontSize: 10,
        gapAfter: 8,
        lineHeight: 14,
      }) +
      8
    );
  }

  private measureWordCloudHeight(
    results: SurveyFreeTextResult[],
    visualizationType: QuestionVisualizationType,
  ) {
    return visualizationType === 'word_cloud' &&
      buildFreeTextWordCloud(results).length > 0
      ? 19 + wordCloudHeight + 18
      : 0;
  }

  private measureSkippedHeight(result: SurveyQuestionResult) {
    if (result.skippedCount === 0) {
      return 0;
    }

    return this.measureMutedLineHeight(
      `${result.skippedCount} uten svar på dette spørsmålet.`,
    );
  }

  private measureSectionHeadingHeight(title: string) {
    return (
      8 +
      this.measureWrappedTextHeight(title, {
        fontSize: 15,
        fontStyle: 'bold',
        gapAfter: 10,
        lineHeight: 19,
      })
    );
  }

  private measureSubsectionHeadingHeight(title: string) {
    return this.measureWrappedTextHeight(title, {
      fontSize: 11,
      fontStyle: 'bold',
      gapAfter: 8,
      lineHeight: 15,
    });
  }

  private measureMutedLineHeight(text: string) {
    return this.measureWrappedTextHeight(text, {
      fontSize: 9,
      gapAfter: 10,
      lineHeight: 13,
    });
  }

  private measureWrappedTextHeight(
    text: string,
    options: {
      fontSize: number;
      fontStyle?: 'bold' | 'normal';
      gapAfter?: number;
      lineHeight: number;
      width?: number;
    },
  ) {
    this.setTextStyle(options.fontSize, options.fontStyle ?? 'normal');
    return (
      this.wrapText(text, options.width ?? this.contentWidth).length *
        options.lineHeight +
      (options.gapAfter ?? 0)
    );
  }

  private measureTableHeight(columns: PdfColumn[], rows: string[][]) {
    if (rows.length === 0) {
      return this.measureMutedLineHeight('Ingen data.');
    }

    const preparedRows = this.prepareTableRows(columns, rows);
    return (
      tableHeaderHeight +
      preparedRows.reduce((height, row) => height + row.rowHeight, 0) +
      tableStartPadding +
      12
    );
  }

  private measureTableStartHeight(columns: PdfColumn[], rows: string[][]) {
    if (rows.length === 0) {
      return this.measureMutedLineHeight('Ingen data.');
    }

    return (
      tableHeaderHeight +
      this.prepareTableRows(columns, rows)[0].rowHeight +
      tableStartPadding +
      12
    );
  }

  private measureDistributionHeight(
    itemCount: number,
    visualizationType: QuestionVisualizationType,
  ) {
    return getPdfChartType(visualizationType) === 'pie'
      ? this.getPieDistributionHeight(itemCount) + 14
      : this.getBarDistributionHeight(itemCount) + 14;
  }

  private getBarDistributionHeight(itemCountOrItems: number | { length: number }) {
    const itemCount =
      typeof itemCountOrItems === 'number'
        ? itemCountOrItems
        : itemCountOrItems.length;

    return Math.min(260, Math.max(112, itemCount * 28 + 18));
  }

  private getPieDistributionHeight(itemCountOrItems: number | { length: number }) {
    const itemCount =
      typeof itemCountOrItems === 'number'
        ? itemCountOrItems
        : itemCountOrItems.length;

    return Math.max(150, itemCount * 16 + 34);
  }

  private prepareTableRows(
    columns: PdfColumn[],
    rows: string[][],
  ): PreparedPdfTableRow[] {
    this.setTextStyle(9, 'normal', colors.ink);

    return rows.map((row) => {
      const cellLines = row.map((cell, columnIndex) =>
        this.wrapText(cell, columns[columnIndex].width - 16),
      );
      const rowHeight = Math.max(
        28,
        Math.max(...cellLines.map((lines) => lines.length)) * 12 + 16,
      );

      return { cellLines, rowHeight };
    });
  }

  private drawTableHeader(columns: PdfColumn[]) {
    this.ensureSpace(tableHeaderHeight);
    this.doc.setFillColor(colors.pine);
    this.doc.roundedRect(
      margins.page,
      this.y,
      this.contentWidth,
      tableHeaderHeight,
      6,
      6,
      'F',
    );

    let x = margins.page;
    columns.forEach((column) => {
      const align = column.align ?? 'left';
      const textX = align === 'right' ? x + column.width - 8 : x + 8;

      this.setTextStyle(8, 'bold', colors.white);
      this.doc.text(column.header, textX, this.y + 17, { align });
      x += column.width;
    });

    this.y += tableHeaderHeight;
  }

  private addRule(gapAfter = 10) {
    this.ensureSpace(1);
    this.doc.setDrawColor(colors.line);
    this.doc.line(margins.page, this.y, margins.page + this.contentWidth, this.y);
    this.y += gapAfter;
  }

  private addMutedLine(text: string) {
    this.addWrappedText(text, {
      color: colors.muted,
      fontSize: 9,
      gapAfter: 10,
      lineHeight: 13,
    });
  }

  private addWrappedText(
    text: string,
    options: {
      align?: 'left' | 'right';
      color?: string;
      fontSize?: number;
      fontStyle?: 'bold' | 'normal';
      gapAfter?: number;
      lineHeight?: number;
      width?: number;
      x?: number;
    } = {},
  ) {
    const fontSize = options.fontSize ?? 10;
    const lineHeight = options.lineHeight ?? fontSize * 1.35;
    const width = options.width ?? this.contentWidth;
    const x = options.x ?? margins.page;
    const align = options.align ?? 'left';
    const lines = this.wrapText(text, width);

    this.setTextStyle(fontSize, options.fontStyle ?? 'normal', options.color);

    lines.forEach((line) => {
      this.ensureSpace(lineHeight);
      this.doc.text(line, x, this.y, { align });
      this.y += lineHeight;
    });

    this.addGap(options.gapAfter ?? 0);
  }

  private wrapText(text: string, width: number) {
    const normalizedText = text.trim() || ' ';
    return this.doc.splitTextToSize(normalizedText, width) as string[];
  }

  private truncateTextToWidth(text: string, width: number) {
    if (this.doc.getTextWidth(text) <= width) {
      return text;
    }

    let truncatedText = text;
    while (
      truncatedText.length > 1 &&
      this.doc.getTextWidth(`${truncatedText}...`) > width
    ) {
      truncatedText = truncatedText.slice(0, -1);
    }

    return `${truncatedText.trimEnd()}...`;
  }

  private setTextStyle(
    fontSize: number,
    fontStyle: 'bold' | 'normal' = 'normal',
    color = colors.ink,
  ) {
    this.doc.setFont('helvetica', fontStyle);
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(color);
  }

  private addGap(gap: number) {
    this.y += gap;
  }

  private ensureSpace(height: number) {
    if (this.y + height > this.bottomY) {
      this.addPage();
    }
  }

  private addPage() {
    this.doc.addPage();
    this.y = margins.page;
  }

  private buildWordCloudLayout(items: FreeTextWordCloudItem[]) {
    const placedItems: PdfWordCloudItem[] = [];

    items.forEach((item, index) => {
      const fontSize = this.getWordCloudFontSize(item);
      const rotation = this.getWordCloudRotation(item, index);
      const bounds = this.estimateWordCloudBounds(item.word, fontSize, rotation);
      const position = this.findWordCloudPosition(
        bounds,
        placedItems,
        item.word,
        index,
      );

      if (!position) {
        return;
      }

      placedItems.push({
        ...item,
        ...bounds,
        ...position,
        fontSize,
        rotation,
      });
    });

    return placedItems;
  }

  private getWordCloudFontSize(item: FreeTextWordCloudItem) {
    const baseSize = wordCloudFontSizes[item.weight];
    let adjustedSize = baseSize;

    if (item.word.length > 15) {
      adjustedSize = Math.round(baseSize * 0.82);
    } else if (item.word.length > 11) {
      adjustedSize = Math.round(baseSize * 0.9);
    }

    const maxWordWidth = this.contentWidth * 0.48;
    const widthLimitedSize = Math.floor(
      maxWordWidth / Math.max(1, item.word.length * 0.58),
    );
    return Math.max(7, Math.min(adjustedSize, widthLimitedSize));
  }

  private getWordCloudRotation(item: FreeTextWordCloudItem, index: number) {
    if (index < 5) {
      return 0;
    }

    const rotations = [0, 0, 0, -10, 10, -16, 16, -24, 24];
    return rotations[(hashWord(item.word) + index) % rotations.length];
  }

  private estimateWordCloudBounds(
    word: string,
    fontSize: number,
    rotation: number,
  ) {
    const textWidth = Math.max(fontSize * 1.8, word.length * fontSize * 0.56);
    const textHeight = fontSize * 0.84;
    const radians = (Math.abs(rotation) * Math.PI) / 180;
    const width =
      Math.cos(radians) * textWidth + Math.sin(radians) * textHeight + 4;
    const height =
      Math.sin(radians) * textWidth + Math.cos(radians) * textHeight + 3;

    return { height, width };
  }

  private findWordCloudPosition(
    bounds: Pick<PdfWordCloudItem, 'height' | 'width'>,
    placedItems: PdfWordCloudItem[],
    word: string,
    index: number,
  ) {
    const centerX = this.contentWidth / 2;
    const centerY = wordCloudHeight / 2;
    const startAngle = ((hashWord(word) % 360) * Math.PI) / 180;

    if (index === 0) {
      return { x: centerX, y: centerY };
    }

    for (let step = 0; step < 2600; step += 1) {
      const angle = startAngle + step * 0.38;
      const radius = step * 0.23;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.55;

      if (this.canPlaceWordCloudItem(x, y, bounds, placedItems)) {
        return { x: Math.round(x), y: Math.round(y) };
      }
    }

    return null;
  }

  private canPlaceWordCloudItem(
    x: number,
    y: number,
    bounds: Pick<PdfWordCloudItem, 'height' | 'width'>,
    placedItems: PdfWordCloudItem[],
  ) {
    const candidate = {
      bottom: y + bounds.height / 2,
      left: x - bounds.width / 2,
      right: x + bounds.width / 2,
      top: y - bounds.height / 2,
    };

    if (
      candidate.left < wordCloudPadding ||
      candidate.right > this.contentWidth - wordCloudPadding ||
      candidate.top < wordCloudPadding ||
      candidate.bottom > wordCloudHeight - wordCloudPadding
    ) {
      return false;
    }

    return placedItems.every((item) => {
      const padding = 1.5;
      const existing = {
        bottom: item.y + item.height / 2 + padding,
        left: item.x - item.width / 2 - padding,
        right: item.x + item.width / 2 + padding,
        top: item.y - item.height / 2 - padding,
      };

      return (
        candidate.right < existing.left ||
        candidate.left > existing.right ||
        candidate.bottom < existing.top ||
        candidate.top > existing.bottom
      );
    });
  }

  private get bottomY() {
    return this.pageHeight - margins.page - margins.footer;
  }

  private get bodyHeight() {
    return this.bottomY - margins.page;
  }
}

const questionTypeLabel = {
  free_text: 'Fritekst',
  likert_scale: 'Skala',
  multiple_choice: 'Flervalg',
} satisfies Record<SurveyQuestionResult['question']['type'], string>;

function getQuestionTypeLabel(question: SurveyQuestionResult['question']) {
  if (question.type !== 'likert_scale') {
    return questionTypeLabel[question.type];
  }

  if (question.scaleVariant === 'stars') {
    return 'Stjerner';
  }

  if (question.scaleVariant === 'nps') {
    return 'NPS';
  }

  return questionTypeLabel.likert_scale;
}

function formatLikertSummary(
  results: SurveyLikertResult[],
  average: number | null,
  scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
) {
  if (scaleVariant !== 'nps') {
    return `Gjennomsnitt: ${
      average === null ? 'Ingen svar' : average.toLocaleString('nb-NO')
    }`;
  }

  const summary = calculateNpsSummary(results);

  if (summary.score === null) {
    return 'NPS: Ingen svar';
  }

  return `NPS: ${summary.score} (${summary.promoters} promotører, ${summary.passives} passive, ${summary.detractors} kritikere)`;
}

function calculateNpsSummary(results: SurveyLikertResult[]) {
  const total = results.reduce((sum, result) => sum + result.count, 0);
  const promoters = sumNpsGroup(results, (value) => value >= 9);
  const passives = sumNpsGroup(results, (value) => value >= 7 && value <= 8);
  const detractors = sumNpsGroup(results, (value) => value <= 6);
  const score =
    total === 0 ? null : Math.round(((promoters - detractors) / total) * 100);

  return {
    detractors,
    passives,
    promoters,
    score,
  };
}

function sumNpsGroup(
  results: SurveyLikertResult[],
  predicate: (value: number) => boolean,
) {
  return results
    .filter((result) => predicate(result.value))
    .reduce((sum, result) => sum + result.count, 0);
}

function toChoiceDistributionItems(
  results: SurveyChoiceResult[],
  colorMode: QuestionVisualizationColorMode,
  mutedColor: string,
) {
  return results.map((result, index) => ({
    color: getChartColor(index, colorMode, mutedColor),
    count: result.count,
    id: result.optionId,
    label: result.label,
    percentage: result.percentage,
  }));
}

function toLikertDistributionItems(
  results: SurveyLikertResult[],
  colorMode: QuestionVisualizationColorMode,
) {
  return results.map((result, index) => ({
    color: getChartColor(index, colorMode, colors.moss),
    count: result.count,
    id: String(result.value),
    label: String(result.value),
    percentage: result.percentage,
  }));
}

function getChartColor(
  index: number,
  colorMode: QuestionVisualizationColorMode,
  mutedColor: string,
) {
  if (colorMode === 'muted') {
    return mutedColor;
  }

  return colorfulPalette[index % colorfulPalette.length];
}

function getPdfChartType(
  visualizationType: QuestionVisualizationType,
): PdfChartType {
  return visualizationType === 'pie' ? 'pie' : 'bar';
}

function getWordCloudColor(
  item: FreeTextWordCloudItem,
  colorMode: QuestionVisualizationColorMode,
) {
  if (colorMode === 'muted') {
    return wordCloudToneColors[item.tone];
  }

  return colorfulPalette[
    (hashWord(item.word) + item.tone) % colorfulPalette.length
  ];
}

const statusLabel = {
  closed: 'Lukket',
  draft: 'Utkast',
  published: 'Publisert',
} satisfies Record<SurveyResults['status'], string>;

function formatSurveyWindow(
  results: Pick<SurveyResults, 'endsAt' | 'startsAt'>,
) {
  if (!results.startsAt && !results.endsAt) {
    return 'Ingen tidsavgrensning';
  }

  const startsAt = results.startsAt ? formatDateTime(results.startsAt) : 'Uten start';
  const endsAt = results.endsAt ? formatDateTime(results.endsAt) : 'Uten slutt';
  return `${startsAt} - ${endsAt}`;
}

function formatPercentage(value: number) {
  return `${value} %`;
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Ukjent tidspunkt';
  }

  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function sanitizeFileNamePart(value: string) {
  const normalizedValue = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nb-NO')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');

  return normalizedValue || 'svario';
}

function hashWord(word: string) {
  return [...word].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

function formatDateStamp(value: Date) {
  const year = value.getFullYear();
  const month = padDatePart(value.getMonth() + 1);
  const day = padDatePart(value.getDate());
  const hour = padDatePart(value.getHours());
  const minute = padDatePart(value.getMinutes());

  return `${year}${month}${day}-${hour}${minute}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}
