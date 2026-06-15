import { jsPDF } from 'jspdf';

import type {
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

const colors = {
  ink: '#17201d',
  pine: '#183a34',
  moss: '#4f6c5d',
  muted: '#607681',
  line: '#d9d3c7',
  paper: '#fffdf8',
  soft: '#f3f0e8',
  white: '#ffffff',
};

const margins = {
  page: 48,
  footer: 34,
};
const tableHeaderHeight = 26;
const tableStartPadding = 48;

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
        }
      }

      this.addQuestionResult(result, index + 1, results.responseCount);
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
  ) {
    this.ensureSpace(this.measureQuestionKeepHeight(result, index, responseCount));
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
      `${questionTypeLabel[result.question.type]} - ${result.answeredCount}/${responseCount} besvart`,
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
      this.addChoiceResults(result.choiceResults);
    }

    if (result.question.type === 'likert_scale') {
      this.addLikertResults(result.likertResults, result.likertAverage);
    }

    if (result.question.type === 'free_text') {
      this.addFreeTextResults(result.freeTextResults);
    }

    if (result.skippedCount > 0) {
      this.addMutedLine(`${result.skippedCount} uten svar på dette spørsmålet.`);
    }

    this.addRule(18);
  }

  private addChoiceResults(results: SurveyChoiceResult[]) {
    const rows = this.getChoiceRows(results);

    this.addTable(
      [
        { header: 'Alternativ', width: this.contentWidth - 148 },
        { align: 'right', header: 'Svar', width: 64 },
        { align: 'right', header: 'Andel', width: 84 },
      ],
      rows,
      'Ingen alternativer er registrert.',
    );
  }

  private addLikertResults(
    results: SurveyLikertResult[],
    average: number | null,
  ) {
    const rows = this.getLikertRows(results);

    this.addWrappedText(
      `Gjennomsnitt: ${
        average === null ? 'Ingen svar' : average.toLocaleString('nb-NO')
      }`,
      {
        color: colors.pine,
        fontSize: 10,
        fontStyle: 'bold',
        gapAfter: 8,
        lineHeight: 14,
      },
    );
    this.addTable(
      [
        { header: 'Verdi', width: this.contentWidth - 148 },
        { align: 'right', header: 'Svar', width: 64 },
        { align: 'right', header: 'Andel', width: 84 },
      ],
      rows,
      'Ingen skalaverdier er registrert.',
    );
  }

  private addFreeTextResults(results: SurveyFreeTextResult[]) {
    if (results.length === 0) {
      this.addMutedLine('Ingen fritekstsvar ennå.');
      return;
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
    const minHeight =
      this.measureQuestionIntroHeight(result, index, responseCount) +
      this.measureQuestionFirstResponseHeight(result);

    return fullHeight <= this.bodyHeight
      ? fullHeight
      : Math.min(minHeight, this.bodyHeight);
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
        `${questionTypeLabel[result.question.type]} - ${result.answeredCount}/${responseCount} besvart`,
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
      return this.measureChoiceResultsHeight(result.choiceResults);
    }

    if (result.question.type === 'likert_scale') {
      return this.measureLikertResultsHeight(
        result.likertResults,
        result.likertAverage,
      );
    }

    return this.measureFreeTextResultsHeight(result.freeTextResults);
  }

  private measureQuestionFirstResponseHeight(result: SurveyQuestionResult) {
    if (result.question.type === 'multiple_choice') {
      return this.measureChoiceResultsStartHeight(result.choiceResults);
    }

    if (result.question.type === 'likert_scale') {
      return this.measureLikertResultsStartHeight(
        result.likertResults,
        result.likertAverage,
      );
    }

    return this.measureFreeTextResultsStartHeight(result.freeTextResults);
  }

  private measureChoiceResultsHeight(results: SurveyChoiceResult[]) {
    const rows = this.getChoiceRows(results);

    if (rows.length === 0) {
      return this.measureMutedLineHeight('Ingen alternativer er registrert.');
    }

    return this.measureTableHeight(
      [
        { header: 'Alternativ', width: this.contentWidth - 148 },
        { align: 'right', header: 'Svar', width: 64 },
        { align: 'right', header: 'Andel', width: 84 },
      ],
      rows,
    );
  }

  private measureChoiceResultsStartHeight(results: SurveyChoiceResult[]) {
    const rows = this.getChoiceRows(results);

    if (rows.length === 0) {
      return this.measureMutedLineHeight('Ingen alternativer er registrert.');
    }

    return this.measureTableStartHeight(
      [
        { header: 'Alternativ', width: this.contentWidth - 148 },
        { align: 'right', header: 'Svar', width: 64 },
        { align: 'right', header: 'Andel', width: 84 },
      ],
      rows,
    );
  }

  private measureLikertResultsHeight(
    results: SurveyLikertResult[],
    average: number | null,
  ) {
    return (
      this.measureLikertAverageHeight(average) +
      this.measureTableHeight(
        [
          { header: 'Verdi', width: this.contentWidth - 148 },
          { align: 'right', header: 'Svar', width: 64 },
          { align: 'right', header: 'Andel', width: 84 },
        ],
        this.getLikertRows(results),
      )
    );
  }

  private measureLikertResultsStartHeight(
    results: SurveyLikertResult[],
    average: number | null,
  ) {
    return (
      this.measureLikertAverageHeight(average) +
      this.measureTableStartHeight(
        [
          { header: 'Verdi', width: this.contentWidth - 148 },
          { align: 'right', header: 'Svar', width: 64 },
          { align: 'right', header: 'Andel', width: 84 },
        ],
        this.getLikertRows(results),
      )
    );
  }

  private measureLikertAverageHeight(average: number | null) {
    return this.measureWrappedTextHeight(
      `Gjennomsnitt: ${
        average === null ? 'Ingen svar' : average.toLocaleString('nb-NO')
      }`,
      {
        fontSize: 10,
        fontStyle: 'bold',
        gapAfter: 8,
        lineHeight: 14,
      },
    );
  }

  private measureFreeTextResultsHeight(results: SurveyFreeTextResult[]) {
    if (results.length === 0) {
      return this.measureMutedLineHeight('Ingen fritekstsvar ennå.');
    }

    return results.reduce(
      (height, result) => height + this.measureFreeTextResultHeight(result),
      0,
    );
  }

  private measureFreeTextResultsStartHeight(results: SurveyFreeTextResult[]) {
    if (results.length === 0) {
      return this.measureMutedLineHeight('Ingen fritekstsvar ennå.');
    }

    return this.measureFreeTextResultHeight(results[0]);
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

  private getChoiceRows(results: SurveyChoiceResult[]) {
    return results.map((result) => [
      result.label,
      String(result.count),
      formatPercentage(result.percentage),
    ]);
  }

  private getLikertRows(results: SurveyLikertResult[]) {
    return results.map((result) => [
      String(result.value),
      String(result.count),
      formatPercentage(result.percentage),
    ]);
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
