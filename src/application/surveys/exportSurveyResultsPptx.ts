import pptxgen from 'pptxgenjs';

import {
  buildFreeTextWordCloud,
  type FreeTextWordCloudItem,
} from './buildFreeTextWordCloud';
import {
  createSurveyResultsExportFileName,
  exportColors,
  formatDateTime,
  formatLikertSummary,
  formatPercentage,
  formatQuestionResultMeta,
  getResponseModeLabel,
  statusLabel,
} from './exportSurveyResultsShared';
import type {
  QuestionVisualizationColorMode,
  SurveyChoiceResult,
  SurveyFreeTextResult,
  SurveyLikertResult,
  SurveyQuestionResult,
  SurveyResults,
} from '../../domain/surveys/survey';

type Presentation = InstanceType<typeof pptxgen>;
type Slide = ReturnType<Presentation['addSlide']>;

type DistributionItem = {
  color: string;
  count: number;
  id: string;
  label: string;
  percentage: number;
};

type SvgWordCloudItem = FreeTextWordCloudItem & {
  fontSize: number;
  height: number;
  rotation: number;
  width: number;
  x: number;
  y: number;
};

const pptxMimeType =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const slide = {
  height: 7.5,
  width: 13.333,
};

const colorfulPalette = [
  '2f6f73',
  'b86b3b',
  '6f6ca8',
  'c2933a',
  '8a536b',
  '4d7f54',
  'c35f4b',
  '4d7fa0',
];

export async function buildSurveyResultsPptx(
  results: SurveyResults,
  generatedAt = new Date(),
) {
  const writer = new PptxReportWriter(results, generatedAt);
  return writer.build();
}

export function createSurveyResultsPptxFileName(
  results: Pick<SurveyResults, 'slug' | 'title'>,
  generatedAt = new Date(),
) {
  return createSurveyResultsExportFileName(
    results,
    'presentation',
    'pptx',
    generatedAt,
  );
}

class PptxReportWriter {
  private readonly pptx = new pptxgen();

  constructor(
    private readonly results: SurveyResults,
    private readonly generatedAt: Date,
  ) {
    this.pptx.layout = 'LAYOUT_WIDE';
    this.pptx.author = 'Svario';
    this.pptx.company = 'Svario';
    this.pptx.subject = 'Spørreskjemaresultater';
    this.pptx.title = `Svario resultater - ${results.title}`;
    this.pptx.theme = {
      bodyFontFace: 'Aptos',
      headFontFace: 'Aptos Display',
    };
  }

  async build() {
    this.addTitleSlide();
    this.addSummarySlide();

    this.results.questionResults.forEach((result, index) => {
      this.addQuestionSlide(result, index + 1);
    });

    const output = await this.pptx.write({
      compression: true,
      outputType: 'blob',
    });

    return output instanceof Blob
      ? output
      : new Blob([output as BlobPart], { type: pptxMimeType });
  }

  private addTitleSlide() {
    const currentSlide = this.createSlide();

    this.addBrand(currentSlide);
    currentSlide.addText('Resultatpresentasjon', {
      bold: true,
      color: exportColors.moss,
      fontSize: 18,
      h: 0.35,
      margin: 0,
      w: 4,
      x: 0.7,
      y: 1.2,
    });
    currentSlide.addText(this.results.title, {
      bold: true,
      color: exportColors.ink,
      fit: 'shrink',
      fontFace: 'Aptos Display',
      fontSize: getTitleFontSize(this.results.title),
      h: 1.7,
      margin: 0,
      breakLine: false,
      w: 9.7,
      x: 0.7,
      y: 1.65,
    });

    if (this.results.description) {
      currentSlide.addText(truncateText(this.results.description, 220), {
        color: exportColors.ink,
        fit: 'shrink',
        fontSize: 16,
        h: 0.8,
        margin: 0,
        breakLine: false,
        w: 8.8,
        x: 0.72,
        y: 3.55,
      });
    }

    this.addStatCard(currentSlide, 'Svar', String(this.results.responseCount), {
      x: 0.7,
      y: 5.1,
    });
    this.addStatCard(
      currentSlide,
      'Spørsmål',
      String(this.results.questionResults.length),
      { x: 3.55, y: 5.1 },
    );
    this.addStatCard(
      currentSlide,
      'Siste svar',
      this.results.lastSubmittedAt
        ? formatDateTime(this.results.lastSubmittedAt)
        : 'Ingen svar',
      { x: 6.4, y: 5.1 },
      2.9,
    );

    currentSlide.addText(
      `${getResponseModeLabel(this.results.responseMode)} - ${
        statusLabel[this.results.status]
      }`,
      {
        color: exportColors.muted,
        fontSize: 13,
        h: 0.3,
        margin: 0,
        w: 5.6,
        x: 0.72,
        y: 6.55,
      },
    );
    this.addFooter(currentSlide, '1');
  }

  private addSummarySlide() {
    const currentSlide = this.createSlide();

    this.addSlideTitle(currentSlide, 'Oversikt', 'Kort oppsummert');
    this.addStatCard(currentSlide, 'Svar', String(this.results.responseCount), {
      x: 0.75,
      y: 1.7,
    });
    this.addStatCard(
      currentSlide,
      'Spørsmål',
      String(this.results.questionResults.length),
      { x: 3.55, y: 1.7 },
    );
    this.addStatCard(
      currentSlide,
      'Siste svar',
      this.results.lastSubmittedAt
        ? formatDateTime(this.results.lastSubmittedAt)
        : 'Ingen svar',
      { x: 6.35, y: 1.7 },
      3.35,
    );

    this.addMetadataList(currentSlide);
    this.addQuestionOverview(currentSlide);
    this.addFooter(currentSlide, '2');
  }

  private addQuestionSlide(result: SurveyQuestionResult, index: number) {
    const currentSlide = this.createSlide();
    const slideNumber = index + 2;
    const hasDescription = Boolean(result.question.description);
    const contentStartY = hasDescription ? 2.28 : 1.95;

    this.addSlideTitle(
      currentSlide,
      truncateText(result.question.prompt, 140),
      `Spørsmål ${index} av ${this.results.questionResults.length} - ${formatQuestionResultMeta(
        result,
        this.results.responseCount,
      )}`,
    );

    if (result.question.description) {
      currentSlide.addText(truncateText(result.question.description, 180), {
        color: exportColors.muted,
        fit: 'shrink',
        fontSize: 11,
        h: 0.38,
        margin: 0,
        w: 9.7,
        x: 0.78,
        y: 1.76,
      });
    }

    if (result.question.type === 'multiple_choice') {
      this.addDistributionVisual(
        currentSlide,
        toChoiceDistributionItems(
          result.choiceResults,
          result.question.visualizationColorMode,
          exportColors.pine,
        ),
        hasDescription ? 2.45 : 2.05,
      );
    }

    if (result.question.type === 'likert_scale') {
      this.addLikertVisual(currentSlide, result, contentStartY);
    }

    if (result.question.type === 'free_text') {
      this.addFreeTextVisual(currentSlide, result.freeTextResults, contentStartY);
    }

    if (result.skippedCount > 0) {
      currentSlide.addText(`${result.skippedCount} uten svar`, {
        bold: true,
        color: exportColors.muted,
        fontSize: 12,
        h: 0.3,
        margin: 0,
        w: 2.6,
        x: 10,
        y: 1.03,
        align: 'right',
      });
    }

    this.addFooter(currentSlide, String(slideNumber));
  }

  private addLikertVisual(
    currentSlide: Slide,
    result: SurveyQuestionResult,
    startY: number,
  ) {
    currentSlide.addText(
      formatLikertSummary(
        result.likertResults,
        result.likertAverage,
        result.question.scaleVariant,
      ),
      {
        bold: true,
        color: exportColors.pine,
        fontSize: 15,
        h: 0.35,
        margin: 0,
        w: 7.8,
        x: 0.85,
        y: startY,
      },
    );
    this.addDistributionVisual(
      currentSlide,
      toLikertDistributionItems(
        result.likertResults,
        result.question.visualizationColorMode,
      ),
      startY + 0.5,
    );
  }

  private addDistributionVisual(
    currentSlide: Slide,
    items: DistributionItem[],
    startY = 2.05,
  ) {
    if (items.length === 0) {
      this.addEmptyState(currentSlide, 'Ingen data å vise.');
      return;
    }

    const chartX = 0.85;
    const chartY = startY;
    const chartW = 7.1;
    const chartH = 4.25;
    const maxCount = Math.max(1, ...items.map((item) => item.count));
    const rowGap = 0.09;
    const rowH = Math.min(0.45, (chartH - rowGap * (items.length - 1)) / items.length);
    const barX = chartX + 1.55;
    const barW = chartW - 2.1;

    items.forEach((item, index) => {
      const y = chartY + index * (rowH + rowGap);
      const barWidth = Math.max(0.08, (item.count / maxCount) * barW);

      currentSlide.addText(truncateText(item.label, 20), {
        color: exportColors.ink,
        fit: 'shrink',
        fontSize: 10,
        h: rowH,
        margin: 0,
        valign: 'middle',
        w: 1.35,
        x: chartX,
        y,
      });
      currentSlide.addShape(this.pptx.ShapeType.roundRect, {
        fill: { color: exportColors.soft },
        h: rowH,
        line: { color: exportColors.soft, transparency: 100 },
        rectRadius: 0.06,
        w: barW,
        x: barX,
        y,
      });
      currentSlide.addShape(this.pptx.ShapeType.roundRect, {
        fill: { color: item.color },
        h: rowH,
        line: { color: item.color, transparency: 100 },
        rectRadius: 0.06,
        w: barWidth,
        x: barX,
        y,
      });
      currentSlide.addText(String(item.count), {
        bold: true,
        color: exportColors.ink,
        fontSize: 10,
        h: rowH,
        margin: 0,
        valign: 'middle',
        w: 0.45,
        x: barX + barW + 0.15,
        y,
      });
    });

    this.addDistributionList(currentSlide, items);
  }

  private addDistributionList(currentSlide: Slide, items: DistributionItem[]) {
    const x = 8.35;
    let y = 2.05;

    currentSlide.addText('Fordeling', {
      bold: true,
      color: exportColors.pine,
      fontSize: 15,
      h: 0.3,
      margin: 0,
      w: 3.9,
      x,
      y: 1.62,
    });

    items.slice(0, 10).forEach((item) => {
      currentSlide.addShape(this.pptx.ShapeType.rect, {
        fill: { color: item.color },
        h: 0.13,
        line: { color: item.color, transparency: 100 },
        w: 0.13,
        x,
        y: y + 0.08,
      });
      currentSlide.addText(truncateText(item.label, 32), {
        color: exportColors.ink,
        fit: 'shrink',
        fontSize: 10.5,
        h: 0.23,
        margin: 0,
        w: 2.45,
        x: x + 0.22,
        y,
      });
      currentSlide.addText(`${item.count} - ${formatPercentage(item.percentage)}`, {
        color: exportColors.muted,
        fontSize: 10,
        h: 0.23,
        margin: 0,
        w: 1.2,
        x: x + 2.8,
        y,
        align: 'right',
      });
      y += 0.38;
    });
  }

  private addFreeTextVisual(
    currentSlide: Slide,
    results: SurveyFreeTextResult[],
    startY = 1.95,
  ) {
    if (results.length === 0) {
      this.addEmptyState(currentSlide, 'Ingen fritekstsvar ennå.');
      return;
    }

    const wordCloud = buildFreeTextWordCloud(results).slice(0, 22);
    currentSlide.addText('Toppord', {
      bold: true,
      color: exportColors.pine,
      fontSize: 15,
      h: 0.35,
      margin: 0,
      w: 4,
      x: 0.85,
      y: startY,
    });
    this.addWordCloud(currentSlide, wordCloud, startY + 0.55);
    this.addQuoteList(currentSlide, results, startY);
  }

  private addWordCloud(
    currentSlide: Slide,
    items: FreeTextWordCloudItem[],
    startY: number,
  ) {
    if (items.length === 0) {
      currentSlide.addText('For få ord til å lage toppord.', {
        color: exportColors.muted,
        fontSize: 13,
        h: 0.4,
        margin: 0,
        w: 5.8,
        x: 0.85,
        y: startY,
      });
      return;
    }

    currentSlide.addImage({
      altText: `Ordsky med ${items.length} ord fra fritekstsvar`,
      data: createWordCloudSvgDataUri(items),
      h: 3.95,
      w: 6.95,
      x: 0.68,
      y: startY - 0.04,
    });
  }

  private addQuoteList(
    currentSlide: Slide,
    results: SurveyFreeTextResult[],
    startY: number,
  ) {
    const columnX = 7.82;
    const columnW = 4.85;
    const cardH = 1.03;
    const cardGap = 0.22;
    const cardY = startY + 0.55;

    currentSlide.addText('Utvalgte svar', {
      bold: true,
      color: exportColors.pine,
      fontSize: 15,
      h: 0.35,
      margin: 0,
      w: 4,
      x: columnX,
      y: startY,
    });

    results.slice(0, 3).forEach((result, index) => {
      const y = cardY + index * (cardH + cardGap);
      currentSlide.addShape(this.pptx.ShapeType.roundRect, {
        fill: { color: exportColors.white },
        h: cardH,
        line: { color: exportColors.line, width: 0.8 },
        rectRadius: 0.06,
        w: columnW,
        x: columnX,
        y,
      });
      currentSlide.addText(truncateText(result.text, 150), {
        color: exportColors.ink,
        fit: 'shrink',
        fontSize: 11.2,
        h: 0.55,
        breakLine: false,
        lineSpacingMultiple: 0.86,
        margin: 0,
        w: columnW - 0.48,
        x: columnX + 0.24,
        y: y + 0.14,
      });
      currentSlide.addText(
        `${result.respondentLabel ?? 'Anonymt svar'} - ${formatDateTime(
          result.submittedAt,
        )}`,
        {
          color: exportColors.muted,
          fit: 'shrink',
          fontSize: 8.8,
          h: 0.2,
          margin: 0,
          w: columnW - 0.48,
          x: columnX + 0.24,
          y: y + cardH - 0.28,
        },
      );
    });
  }

  private addMetadataList(currentSlide: Slide) {
    const rows = [
      ['Skjema', this.results.slug],
      ['Status', statusLabel[this.results.status]],
      ['Svarmodus', getResponseModeLabel(this.results.responseMode)],
      ['Generert', formatDateTime(this.generatedAt.toISOString())],
    ];

    currentSlide.addText('Rapportdata', {
      bold: true,
      color: exportColors.pine,
      fontSize: 15,
      h: 0.32,
      margin: 0,
      w: 3.8,
      x: 0.78,
      y: 3.35,
    });

    rows.forEach(([label, value], index) => {
      const y = 3.87 + index * 0.45;
      currentSlide.addText(label, {
        bold: true,
        color: exportColors.muted,
        fontSize: 10,
        h: 0.2,
        margin: 0,
        w: 1.25,
        x: 0.8,
        y,
      });
      currentSlide.addText(truncateText(value, 42), {
        color: exportColors.ink,
        fit: 'shrink',
        fontSize: 10,
        h: 0.2,
        margin: 0,
        w: 3.6,
        x: 2.1,
        y,
      });
    });
  }

  private addQuestionOverview(currentSlide: Slide) {
    currentSlide.addText('Spørsmål', {
      bold: true,
      color: exportColors.pine,
      fontSize: 15,
      h: 0.32,
      margin: 0,
      w: 3.8,
      x: 7.35,
      y: 3.35,
    });

    this.results.questionResults.slice(0, 6).forEach((result, index) => {
      const y = 3.85 + index * 0.42;
      currentSlide.addText(String(index + 1), {
        bold: true,
        color: exportColors.white,
        fontSize: 9,
        h: 0.24,
        margin: 0,
        w: 0.24,
        x: 7.35,
        y,
        align: 'center',
        fill: { color: exportColors.pine },
      });
      currentSlide.addText(truncateText(result.question.prompt, 58), {
        color: exportColors.ink,
        fit: 'shrink',
        fontSize: 10,
        h: 0.24,
        margin: 0,
        w: 4.75,
        x: 7.72,
        y,
      });
    });

    if (this.results.questionResults.length > 6) {
      currentSlide.addText(
        `+ ${this.results.questionResults.length - 6} flere spørsmål`,
        {
          color: exportColors.muted,
          fontSize: 10,
          h: 0.24,
          margin: 0,
          w: 4.5,
          x: 7.72,
          y: 6.38,
        },
      );
    }
  }

  private addStatCard(
    currentSlide: Slide,
    label: string,
    value: string,
    position: { x: number; y: number },
    width = 2.45,
  ) {
    currentSlide.addShape(this.pptx.ShapeType.roundRect, {
      fill: { color: exportColors.white },
      h: 0.95,
      line: { color: exportColors.line, width: 1 },
      rectRadius: 0.08,
      w: width,
      x: position.x,
      y: position.y,
    });
    currentSlide.addText(label, {
      bold: true,
      color: exportColors.muted,
      fontSize: 9,
      h: 0.22,
      margin: 0,
      w: width - 0.35,
      x: position.x + 0.18,
      y: position.y + 0.16,
    });
    currentSlide.addText(value, {
      bold: true,
      color: exportColors.pine,
      fit: 'shrink',
      fontSize: getMetricFontSize(value),
      h: 0.38,
      margin: 0,
      w: width - 0.35,
      x: position.x + 0.18,
      y: position.y + 0.48,
    });
  }

  private addSlideTitle(currentSlide: Slide, title: string, eyebrow: string) {
    this.addBrand(currentSlide);
    currentSlide.addText(eyebrow, {
      bold: true,
      color: exportColors.muted,
      fontSize: 11,
      h: 0.25,
      margin: 0,
      w: 10,
      x: 0.78,
      y: 0.78,
    });
    currentSlide.addText(title, {
      bold: true,
      color: exportColors.ink,
      fit: 'shrink',
      fontFace: 'Aptos Display',
      fontSize: getSlideTitleFontSize(title),
      h: 0.75,
      margin: 0,
      w: 10.6,
      x: 0.78,
      y: 1.02,
    });
  }

  private addBrand(currentSlide: Slide) {
    currentSlide.addShape(this.pptx.ShapeType.rect, {
      fill: { color: exportColors.pine },
      h: 0.36,
      line: { color: exportColors.pine, transparency: 100 },
      w: 0.36,
      x: 12.14,
      y: 0.62,
    });
    currentSlide.addText('Svario', {
      bold: true,
      color: exportColors.pine,
      fontSize: 12,
      h: 0.25,
      margin: 0,
      w: 0.95,
      x: 11.08,
      y: 0.67,
      align: 'right',
    });
  }

  private addFooter(currentSlide: Slide, page: string) {
    currentSlide.addText(
      `Generert ${formatDateTime(this.generatedAt.toISOString())}`,
      {
        color: exportColors.muted,
        fontSize: 8,
        h: 0.18,
        margin: 0,
        w: 3.2,
        x: 0.72,
        y: 7.08,
      },
    );
    currentSlide.addText(page, {
      color: exportColors.muted,
      fontSize: 8,
      h: 0.18,
      margin: 0,
      w: 0.5,
      x: 11.98,
      y: 7.08,
      align: 'right',
    });
  }

  private addEmptyState(currentSlide: Slide, text: string) {
    currentSlide.addShape(this.pptx.ShapeType.roundRect, {
      fill: { color: exportColors.soft },
      h: 2.5,
      line: { color: exportColors.line, width: 1 },
      rectRadius: 0.08,
      w: 6.2,
      x: 3.55,
      y: 2.35,
    });
    currentSlide.addText(text, {
      color: exportColors.muted,
      fontSize: 16,
      h: 0.45,
      margin: 0,
      w: 5.6,
      x: 3.85,
      y: 3.35,
      align: 'center',
    });
  }

  private createSlide() {
    const currentSlide = this.pptx.addSlide();
    currentSlide.background = { color: exportColors.paper };
    currentSlide.addShape(this.pptx.ShapeType.rect, {
      fill: { color: exportColors.soft },
      h: slide.height,
      line: { color: exportColors.soft, transparency: 100 },
      w: 0.18,
      x: 0,
      y: 0,
    });
    return currentSlide;
  }
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
    color: getChartColor(index, colorMode, exportColors.moss),
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

function getWordColor(item: FreeTextWordCloudItem, index: number) {
  const colors = [
    exportColors.pine,
    exportColors.moss,
    exportColors.fjord,
    exportColors.rust,
    exportColors.muted,
  ];
  return colors[(item.tone + index) % colors.length];
}

function getSvgWordFontSize(item: FreeTextWordCloudItem) {
  const sizeByWeight = {
    1: 31,
    2: 42,
    3: 56,
    4: 74,
    5: 96,
  } satisfies Record<FreeTextWordCloudItem['weight'], number>;

  return Math.max(26, sizeByWeight[item.weight] - Math.max(0, item.word.length - 11) * 2.4);
}

function createWordCloudSvgDataUri(items: FreeTextWordCloudItem[]) {
  const width = 1400;
  const height = 780;
  const placedItems = buildSvgWordCloudLayout(items, width, height);
  const words = placedItems
    .map(
      (item, index) => `
        <text
          dominant-baseline="middle"
          fill="#${getWordColor(item, index)}"
          font-family="Aptos Display, Aptos, Arial, sans-serif"
          font-size="${item.fontSize}"
          font-weight="700"
          text-anchor="middle"
          transform="translate(${item.x} ${item.y}) rotate(${item.rotation})"
        >
          <title>${escapeXml(item.word)}: ${item.count}</title>${escapeXml(item.word)}
        </text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="none"/>
    ${words}
  </svg>`;

  return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
}

function buildSvgWordCloudLayout(
  items: FreeTextWordCloudItem[],
  width: number,
  height: number,
) {
  const placedItems: SvgWordCloudItem[] = [];

  items.forEach((item, index) => {
    const fontSize = getSvgWordFontSize(item);
    const rotation = getSvgWordRotation(item, index);
    const bounds = estimateSvgWordBounds(item.word, fontSize, rotation);
    const position = findSvgWordPosition(
      bounds,
      placedItems,
      item.word,
      index,
      width,
      height,
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

function getSvgWordRotation(item: FreeTextWordCloudItem, index: number) {
  if (index < 8 || item.word.length > 10) {
    return 0;
  }

  const rotations = [0, 0, 0, -8, 8, -13, 13];
  return rotations[(hashWord(item.word) + index) % rotations.length];
}

function estimateSvgWordBounds(
  word: string,
  fontSize: number,
  rotation: number,
) {
  const textWidth = Math.max(fontSize * 1.8, word.length * fontSize * 0.58);
  const textHeight = fontSize * 0.78;
  const radians = (Math.abs(rotation) * Math.PI) / 180;
  const width =
    Math.cos(radians) * textWidth + Math.sin(radians) * textHeight + 22;
  const height =
    Math.sin(radians) * textWidth + Math.cos(radians) * textHeight + 18;

  return { height, width };
}

function findSvgWordPosition(
  bounds: Pick<SvgWordCloudItem, 'height' | 'width'>,
  placedItems: SvgWordCloudItem[],
  word: string,
  index: number,
  width: number,
  height: number,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const startAngle = ((hashWord(word) % 360) * Math.PI) / 180;

  if (index === 0) {
    return { x: centerX, y: centerY - 20 };
  }

  for (let step = 0; step < 3400; step += 1) {
    const angle = startAngle + step * 0.35;
    const radius = step * 0.42;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.56;

    if (canPlaceSvgWord(x, y, bounds, placedItems, width, height)) {
      return { x: Math.round(x), y: Math.round(y) };
    }
  }

  return null;
}

function canPlaceSvgWord(
  x: number,
  y: number,
  bounds: Pick<SvgWordCloudItem, 'height' | 'width'>,
  placedItems: SvgWordCloudItem[],
  width: number,
  height: number,
) {
  const padding = 34;
  const candidate = {
    bottom: y + bounds.height / 2,
    left: x - bounds.width / 2,
    right: x + bounds.width / 2,
    top: y - bounds.height / 2,
  };

  if (
    candidate.left < padding ||
    candidate.right > width - padding ||
    candidate.top < padding ||
    candidate.bottom > height - padding
  ) {
    return false;
  }

  return placedItems.every((item) => {
    const gap = 7;
    const existing = {
      bottom: item.y + item.height / 2 + gap,
      left: item.x - item.width / 2 - gap,
      right: item.x + item.width / 2 + gap,
      top: item.y - item.height / 2 - gap,
    };

    return (
      candidate.right < existing.left ||
      candidate.left > existing.right ||
      candidate.bottom < existing.top ||
      candidate.top > existing.bottom
    );
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function hashWord(word: string) {
  return [...word].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

function getTitleFontSize(title: string) {
  if (title.length > 78) {
    return 30;
  }

  if (title.length > 48) {
    return 36;
  }

  return 44;
}

function getSlideTitleFontSize(title: string) {
  if (title.length > 98) {
    return 20;
  }

  if (title.length > 70) {
    return 23;
  }

  if (title.length > 42) {
    return 27;
  }

  return 31;
}

function getMetricFontSize(value: string) {
  if (value.length > 18) {
    return 15;
  }

  if (value.length > 10) {
    return 18;
  }

  return 24;
}

function truncateText(value: string, maxLength: number) {
  const normalizedValue = value.trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
