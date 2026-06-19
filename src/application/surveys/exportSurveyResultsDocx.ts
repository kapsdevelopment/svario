import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';

import {
  buildFreeTextWordCloud,
  type FreeTextWordCloudItem,
} from './buildFreeTextWordCloud';
import { createFreeTextWordCloudImage } from './createFreeTextWordCloudImage';
import {
  createSurveyResultsExportFileName,
  exportColors,
  formatDateTime,
  formatLikertSummary,
  formatPercentage,
  formatQuestionResultMeta,
  formatSurveyWindow,
  getResponseModeLabel,
  statusLabel,
} from './exportSurveyResultsShared';
import type {
  SurveyChoiceResult,
  SurveyFreeTextResult,
  SurveyLikertResult,
  SurveyQuestionResult,
  SurveyResults,
} from '../../domain/surveys/survey';

type DocxBlock = Paragraph | Table;

type CellOptions = {
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  header?: boolean;
  muted?: boolean;
  width?: number;
};

const tableBorder = {
  color: exportColors.line,
  size: 1,
  style: BorderStyle.SINGLE,
};

export async function buildSurveyResultsDocx(
  results: SurveyResults,
  generatedAt = new Date(),
) {
  const writer = new DocxReportWriter(results, generatedAt);
  const children = await writer.build();
  const doc = new Document({
    creator: 'Svario',
    description: 'Resultatrapport fra Svario',
    lastModifiedBy: 'Svario',
    sections: [
      {
        properties: {
          page: {
            margin: {
              bottom: 900,
              left: 840,
              right: 840,
              top: 900,
            },
          },
        },
        children,
      },
    ],
    subject: 'Spørreskjemaresultater',
    title: `Svario resultatrapport - ${results.title}`,
  });

  return Packer.toBlob(doc);
}

export function createSurveyResultsDocxFileName(
  results: Pick<SurveyResults, 'slug' | 'title'>,
  generatedAt = new Date(),
) {
  return createSurveyResultsExportFileName(results, 'report', 'docx', generatedAt);
}

class DocxReportWriter {
  private readonly blocks: DocxBlock[] = [];

  constructor(
    private readonly results: SurveyResults,
    private readonly generatedAt: Date,
  ) {}

  async build() {
    this.addIntro();
    this.addSummary();
    this.addMetadata();
    await this.addQuestionResults();
    return this.blocks;
  }

  private addIntro() {
    this.addText('Svario', {
      bold: true,
      color: exportColors.muted,
      size: 20,
      spacingAfter: 120,
    });
    this.blocks.push(
      new Paragraph({
        children: [
          new TextRun({
            bold: true,
            color: exportColors.pine,
            size: 28,
            text: 'Resultatrapport',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 120 },
      }),
    );
    this.addText(this.results.title, {
      bold: true,
      color: exportColors.ink,
      size: 42,
      spacingAfter: 180,
    });
    this.addMutedText(
      `${getResponseModeLabel(this.results.responseMode)} - ${
        statusLabel[this.results.status]
      }`,
      180,
    );

    if (this.results.description) {
      this.addText(this.results.description, {
        color: exportColors.ink,
        size: 21,
        spacingAfter: 260,
      });
    } else {
      this.addGap(120);
    }
  }

  private addSummary() {
    this.addHeading('Kort oppsummert');
    this.blocks.push(
      createTable(
        ['Felt', 'Verdi'],
        [
          ['Svar', String(this.results.responseCount)],
          ['Spørsmål', String(this.results.questionResults.length)],
          [
            'Siste svar',
            this.results.lastSubmittedAt
              ? formatDateTime(this.results.lastSubmittedAt)
              : 'Ingen svar',
          ],
        ],
        [34, 66],
      ),
    );
    this.addGap(180);
  }

  private addMetadata() {
    this.addHeading('Om rapporten');
    this.blocks.push(
      createTable(
        ['Felt', 'Verdi'],
        [
          ['Skjema', this.results.slug],
          ['Status', statusLabel[this.results.status]],
          ['Svarmodus', getResponseModeLabel(this.results.responseMode)],
          ['Opprettet', formatDateTime(this.results.createdAt)],
          [
            'Publisert',
            this.results.publishedAt
              ? formatDateTime(this.results.publishedAt)
              : 'Ikke publisert',
          ],
          ['Tidsrom', formatSurveyWindow(this.results)],
          ['Rapport generert', formatDateTime(this.generatedAt.toISOString())],
        ],
        [34, 66],
      ),
    );
    this.addGap(220);
  }

  private async addQuestionResults() {
    this.addHeading('Spørsmål og svar');

    if (this.results.questionResults.length === 0) {
      this.addMutedText('Skjemaet har ingen spørsmål ennå.');
      return;
    }

    const sectionTitleById = new Map(
      this.results.sections
        .filter((section) => section.title)
        .map((section) => [section.id, section.title as string]),
    );
    let currentSectionId: string | null = null;

    for (const [index, result] of this.results.questionResults.entries()) {
      if (result.question.sectionId !== currentSectionId) {
        currentSectionId = result.question.sectionId;
        const sectionTitle = currentSectionId
          ? sectionTitleById.get(currentSectionId)
          : null;

        if (sectionTitle) {
          this.addSubheading(sectionTitle);
        }
      }

      await this.addQuestionResult(result, index + 1);
    }
  }

  private async addQuestionResult(result: SurveyQuestionResult, index: number) {
    this.addText(`Spørsmål ${index}`, {
      bold: true,
      color: exportColors.muted,
      size: 17,
      spacingAfter: 70,
    });
    this.addText(result.question.prompt, {
      bold: true,
      color: exportColors.ink,
      size: 27,
      spacingAfter: 80,
    });
    this.addMutedText(
      formatQuestionResultMeta(result, this.results.responseCount),
      result.question.description ? 90 : 150,
    );

    if (result.question.description) {
      this.addText(result.question.description, {
        color: exportColors.ink,
        size: 19,
        spacingAfter: 150,
      });
    }

    if (result.question.type === 'multiple_choice') {
      this.addChoiceResults(result.choiceResults);
    }

    if (result.question.type === 'likert_scale') {
      this.addLikertResults(
        result.likertResults,
        result.likertAverage,
        result.question.scaleVariant,
      );
    }

    if (result.question.type === 'free_text') {
      await this.addFreeTextResults(result.freeTextResults);
    }

    if (result.skippedCount > 0) {
      this.addMutedText(`${result.skippedCount} uten svar på dette spørsmålet.`);
    }

    this.addDivider();
  }

  private addChoiceResults(results: SurveyChoiceResult[]) {
    if (results.length === 0) {
      this.addMutedText('Ingen alternativer er registrert.');
      return;
    }

    this.blocks.push(
      createTable(
        ['Alternativ', 'Svar', 'Andel'],
        results.map((result) => [
          result.label,
          String(result.count),
          formatPercentage(result.percentage),
        ]),
        [62, 18, 20],
      ),
    );
  }

  private addLikertResults(
    results: SurveyLikertResult[],
    average: number | null,
    scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
  ) {
    this.addText(formatLikertSummary(results, average, scaleVariant), {
      bold: true,
      color: exportColors.pine,
      size: 20,
      spacingAfter: 110,
    });

    if (results.length === 0) {
      this.addMutedText('Ingen skalaverdier er registrert.');
      return;
    }

    this.blocks.push(
      createTable(
        ['Verdi', 'Svar', 'Andel'],
        results.map((result) => [
          String(result.value),
          String(result.count),
          formatPercentage(result.percentage),
        ]),
        [62, 18, 20],
      ),
    );
  }

  private async addFreeTextResults(results: SurveyFreeTextResult[]) {
    if (results.length === 0) {
      this.addMutedText('Ingen fritekstsvar ennå.');
      return;
    }

    const wordCloud = buildFreeTextWordCloud(results).slice(0, 22);

    if (wordCloud.length > 0) {
      await this.addWordCloudSummary(wordCloud);
    }

    results.forEach((result, index) => {
      this.addText(
        `${result.respondentLabel ?? `Svar ${index + 1}`} - ${formatDateTime(
          result.submittedAt,
        )}`,
        {
          bold: true,
          color: exportColors.muted,
          size: 17,
          spacingAfter: 50,
        },
      );
      this.addText(result.text, {
        color: exportColors.ink,
        size: 19,
        spacingAfter: 120,
      });
    });
  }

  private async addWordCloudSummary(items: FreeTextWordCloudItem[]) {
    const wordCloudImage = await createFreeTextWordCloudImage(items);
    this.addText('Toppord', {
      bold: true,
      color: exportColors.pine,
      keepNext: true,
      size: 20,
      spacingAfter: 60,
    });
    this.blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            altText: {
              description: `Ordsky med ${items.length} toppord fra fritekstsvar`,
              name: 'Toppord',
              title: 'Toppord',
            },
            data: wordCloudImage.svgBytes,
            fallback: {
              data: wordCloudImage.pngFallbackBytes,
              type: 'png',
            },
            transformation: {
              height: 357,
              width: 640,
            },
            type: 'svg',
          }),
        ],
        spacing: { after: 150 },
      }),
    );
  }

  private addHeading(text: string) {
    this.blocks.push(
      new Paragraph({
        children: [
          new TextRun({
            bold: true,
            color: exportColors.pine,
            size: 28,
            text,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
      }),
    );
  }

  private addSubheading(text: string) {
    this.blocks.push(
      new Paragraph({
        children: [
          new TextRun({
            bold: true,
            color: exportColors.moss,
            size: 22,
            text,
          }),
        ],
        spacing: { after: 100, before: 80 },
      }),
    );
  }

  private addText(
    text: string,
    options: {
      bold?: boolean;
      color?: string;
      keepNext?: boolean;
      size?: number;
      spacingAfter?: number;
    } = {},
  ) {
    this.blocks.push(
      new Paragraph({
        children: [
          new TextRun({
            bold: options.bold,
            color: options.color ?? exportColors.ink,
            size: options.size ?? 20,
            text: text || ' ',
          }),
        ],
        keepNext: options.keepNext,
        spacing: { after: options.spacingAfter ?? 90 },
      }),
    );
  }

  private addMutedText(text: string, spacingAfter = 120) {
    this.addText(text, {
      color: exportColors.muted,
      size: 18,
      spacingAfter,
    });
  }

  private addDivider() {
    this.blocks.push(
      new Paragraph({
        border: {
          bottom: tableBorder,
        },
        spacing: { after: 180, before: 100 },
      }),
    );
  }

  private addGap(size: number) {
    this.blocks.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: size },
      }),
    );
  }
}

function createTable(headers: string[], rows: string[][], widths: number[]) {
  return new Table({
    borders: {
      bottom: tableBorder,
      insideHorizontal: tableBorder,
      insideVertical: tableBorder,
      left: tableBorder,
      right: tableBorder,
      top: tableBorder,
    },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: headers.map((header, index) =>
          createCell(header, {
            header: true,
            width: widths[index],
          }),
        ),
        tableHeader: true,
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell, index) =>
              createCell(cell, {
                align: index > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
                muted: index > 0,
                width: widths[index],
              }),
            ),
          }),
      ),
    ],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

function createCell(text: string, options: CellOptions = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: options.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            bold: options.header,
            color: options.header
              ? exportColors.white
              : options.muted
                ? exportColors.muted
                : exportColors.ink,
            size: 18,
            text: text || ' ',
          }),
        ],
      }),
    ],
    margins: {
      bottom: 110,
      left: 120,
      right: 120,
      top: 110,
    },
    shading: options.header
      ? {
          color: exportColors.white,
          fill: exportColors.pine,
          type: ShadingType.CLEAR,
        }
      : undefined,
    verticalAlign: VerticalAlignTable.CENTER,
    width:
      typeof options.width === 'number'
        ? {
            size: options.width,
            type: WidthType.PERCENTAGE,
          }
        : undefined,
  });
}
