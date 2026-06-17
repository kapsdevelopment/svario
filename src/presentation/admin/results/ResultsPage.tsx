import { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  ChartPie,
  Download,
  FileText,
  MessageSquareText,
  Palette,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { routes } from '../../../app/routes';
import {
  buildFreeTextWordCloud,
  type FreeTextWordCloudItem,
} from '../../../application/surveys/buildFreeTextWordCloud';
import {
  buildSurveyResultsCsv,
  createSurveyResultsCsvFileName,
} from '../../../application/surveys/exportSurveyResultsCsv';
import { useSurveyResults } from '../../../application/surveys/useSurveyResults';
import { useUpdateQuestionVisualization } from '../../../application/surveys/useUpdateQuestionVisualization';
import type {
  QuestionVisualizationColorMode,
  QuestionVisualizationType,
  SurveyChoiceResult,
  SurveyLikertResult,
  SurveyQuestionResult,
  SurveyResults,
} from '../../../domain/surveys/survey';
import { downloadBlobFile } from '../../../infrastructure/files/downloadBlobFile';
import { downloadTextFile } from '../../../infrastructure/files/downloadTextFile';
import { Panel } from '../../shared/components/Panel';

export function ResultsPage() {
  const { surveyId } = useParams();
  const { data: results, error, isError, isLoading } = useSurveyResults(surveyId);

  if (!surveyId) {
    return (
      <div className="page">
        <div className="form-alert form-alert--error" role="alert">
          Mangler skjema-id.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analyse</p>
          <h1>{results?.title ?? 'Resultater'}</h1>
          {results ? <p>{formatSurveyMeta(results)}</p> : null}
        </div>
        <Link className="button button--secondary" to={routes.surveys}>
          <ArrowLeft size={18} aria-hidden="true" />
          Skjemaer
        </Link>
      </header>

      {isLoading ? (
        <Panel title="Laster resultater" subtitle="Henter svar fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {results ? <ResultsContent results={results} /> : null}
    </div>
  );
}

function ResultsContent({ results }: { results: SurveyResults }) {
  function handleDownloadCsv() {
    downloadTextFile({
      content: buildSurveyResultsCsv(results),
      fileName: createSurveyResultsCsvFileName(results),
      mimeType: 'text/csv',
    });
  }

  async function handleDownloadPdf() {
    const { buildSurveyResultsPdf, createSurveyResultsPdfFileName } =
      await import('../../../application/surveys/exportSurveyResultsPdf');

    downloadBlobFile({
      blob: buildSurveyResultsPdf(results),
      fileName: createSurveyResultsPdfFileName(results),
    });
  }

  return (
    <>
      <div className="metric-grid">
        <Panel title="Svar" subtitle={`${results.responseCount} totalt`} />
        <Panel title="Spørsmål" subtitle={`${results.questionResults.length} totalt`} />
        <Panel
          title="Siste svar"
          subtitle={
            results.lastSubmittedAt
              ? formatDateTime(results.lastSubmittedAt)
              : 'Ingen svar ennå'
          }
        />
      </div>

      {results.responseCount === 0 ? (
        <Panel title="Ingen svar ennå" subtitle="Del lenken og kom tilbake hit." />
      ) : null}

      <div className="results-stack">
        {results.questionResults.map((questionResult) => (
          <QuestionResultCard
            key={questionResult.question.id}
            result={questionResult}
            responseCount={results.responseCount}
            surveyId={results.id}
          />
        ))}
      </div>

      <Panel
        title="Eksport"
        subtitle={
          results.responseCount === 0
            ? 'Eksport blir tilgjengelig når skjemaet har svar'
            : 'Last ned rådata eller en enkel rapport'
        }
        action={
          <div className="inline-actions">
            <button
              className="button button--secondary"
              type="button"
              disabled={results.responseCount === 0}
              onClick={handleDownloadCsv}
            >
              <Download size={18} aria-hidden="true" />
              CSV
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={results.responseCount === 0}
              onClick={handleDownloadPdf}
            >
              <FileText size={18} aria-hidden="true" />
              PDF
            </button>
          </div>
        }
      />
    </>
  );
}

function QuestionResultCard({
  responseCount,
  result,
  surveyId,
}: {
  responseCount: number;
  result: SurveyQuestionResult;
  surveyId: string;
}) {
  const updateVisualization = useUpdateQuestionVisualization(surveyId);
  const [colorMode, setColorMode] = useState<ResultColorMode>(
    result.question.visualizationColorMode,
  );
  const [chartType, setChartType] = useState<ResultChartType>(
    getInitialChartType(result.question.visualizationType),
  );
  const isColorful = colorMode === 'colorful';
  const hasVisualization = result.answeredCount > 0;
  const supportsChartType = result.question.type !== 'free_text';
  const currentVisualizationType = supportsChartType
    ? chartType
    : result.question.visualizationType;

  function saveVisualizationPreference(
    visualizationType: QuestionVisualizationType,
    visualizationColorMode: ResultColorMode,
  ) {
    updateVisualization.mutate({
      questionId: result.question.id,
      visualizationType,
      visualizationColorMode,
    });
  }

  function handleChartTypeChange(nextChartType: ResultChartType) {
    setChartType(nextChartType);
    saveVisualizationPreference(nextChartType, colorMode);
  }

  function handleColorModeToggle() {
    const nextColorMode = isColorful ? 'muted' : 'colorful';
    setColorMode(nextColorMode);
    saveVisualizationPreference(currentVisualizationType, nextColorMode);
  }

  return (
    <Panel
      title={result.question.prompt}
      subtitle={`${questionTypeLabel[result.question.type]} · ${result.answeredCount}/${responseCount} besvart`}
      action={
        hasVisualization ? (
          <div className="visual-controls">
            {supportsChartType ? (
              <div className="visual-switch" aria-label="Diagramtype">
                <button
                  aria-pressed={chartType === 'bar'}
                  disabled={updateVisualization.isPending}
                  type="button"
                  onClick={() => handleChartTypeChange('bar')}
                >
                  <BarChart3 size={16} aria-hidden="true" />
                  Stolpe
                </button>
                <button
                  aria-pressed={chartType === 'pie'}
                  disabled={updateVisualization.isPending}
                  type="button"
                  onClick={() => handleChartTypeChange('pie')}
                >
                  <ChartPie size={16} aria-hidden="true" />
                  Kake
                </button>
              </div>
            ) : null}
            <button
              aria-pressed={isColorful}
              className={`visual-style-toggle ${
                isColorful ? 'visual-style-toggle--colorful' : ''
              }`}
              disabled={updateVisualization.isPending}
              type="button"
              onClick={handleColorModeToggle}
            >
              <Palette size={16} aria-hidden="true" />
              {isColorful ? 'Fargerik' : 'Dempet'}
            </button>
          </div>
        ) : null
      }
    >
      {result.question.description ? (
        <p className="result-question-description">{result.question.description}</p>
      ) : null}

      {result.question.type === 'multiple_choice' ? (
        <ChoiceResultView
          chartType={chartType}
          colorMode={colorMode}
          results={result.choiceResults}
        />
      ) : null}

      {result.question.type === 'likert_scale' ? (
        <LikertResultView
          average={result.likertAverage}
          chartType={chartType}
          colorMode={colorMode}
          results={result.likertResults}
        />
      ) : null}

      {result.question.type === 'free_text' ? (
        <FreeTextResultView
          colorMode={colorMode}
          results={result.freeTextResults}
        />
      ) : null}

      {result.skippedCount > 0 ? (
        <div className="result-muted">
          {result.skippedCount} uten svar på dette spørsmålet.
        </div>
      ) : null}
    </Panel>
  );
}

function ChoiceResultView({
  chartType,
  colorMode,
  results,
}: {
  chartType: ResultChartType;
  colorMode: ResultColorMode;
  results: SurveyChoiceResult[];
}) {
  if (results.length === 0) {
    return <div className="empty-state">Ingen alternativer er registrert.</div>;
  }

  return (
    <div className="result-layout">
      {chartType === 'bar' ? (
        <BarResultChart
          ariaLabel="Svarfordeling"
          data={results}
          getId={(result) => result.optionId}
          mutedColor="#183a34"
          xDataKey="label"
          colorMode={colorMode}
        />
      ) : (
        <PieResultChart
          ariaLabel="Svarfordeling"
          data={results}
          getId={(result) => result.optionId}
          mutedColor="#183a34"
          colorMode={colorMode}
        />
      )}
      <ResultBarList
        items={results.map((result, index) => ({
          id: result.optionId,
          label: result.label,
          count: result.count,
          percentage: result.percentage,
          color: getChartColor(index, colorMode, '#183a34'),
        }))}
      />
    </div>
  );
}

function LikertResultView({
  average,
  chartType,
  colorMode,
  results,
}: {
  average: number | null;
  chartType: ResultChartType;
  colorMode: ResultColorMode;
  results: SurveyLikertResult[];
}) {
  return (
    <div className="result-layout">
      <div className="result-average">
        <span>Gjennomsnitt</span>
        <strong>{average === null ? 'Ingen' : average.toLocaleString('nb-NO')}</strong>
      </div>
      {chartType === 'bar' ? (
        <BarResultChart
          ariaLabel="Skalafordeling"
          data={results}
          getId={(result) => String(result.value)}
          mutedColor="#4f6c5d"
          xDataKey="value"
          colorMode={colorMode}
        />
      ) : (
        <PieResultChart
          ariaLabel="Skalafordeling"
          data={results.map((result) => ({
            ...result,
            label: String(result.value),
          }))}
          getId={(result) => String(result.value)}
          mutedColor="#4f6c5d"
          colorMode={colorMode}
        />
      )}
      <ResultBarList
        items={results.map((result, index) => ({
          id: String(result.value),
          label: String(result.value),
          count: result.count,
          percentage: result.percentage,
          color: getChartColor(index, colorMode, '#4f6c5d'),
        }))}
      />
    </div>
  );
}

function BarResultChart<TData extends { count: number }>({
  ariaLabel,
  colorMode,
  data,
  getId,
  mutedColor,
  xDataKey,
}: {
  ariaLabel: string;
  colorMode: ResultColorMode;
  data: TData[];
  getId: (item: TData) => string;
  mutedColor: string;
  xDataKey: string;
}) {
  return (
    <div className="chart-frame" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xDataKey} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((result, index) => (
              <Cell
                fill={getChartColor(index, colorMode, mutedColor)}
                key={getId(result)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieResultChart<TData extends { count: number; label: string }>({
  ariaLabel,
  colorMode,
  data,
  getId,
  mutedColor,
}: {
  ariaLabel: string;
  colorMode: ResultColorMode;
  data: TData[];
  getId: (item: TData) => string;
  mutedColor: string;
}) {
  const visibleData = data.filter((result) => result.count > 0);

  if (visibleData.length === 0) {
    return <div className="empty-state">Ingen svar å vise i kakediagrammet.</div>;
  }

  return (
    <div className="chart-frame chart-frame--pie" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Legend iconType="circle" />
          <Pie
            cx="50%"
            cy="48%"
            data={visibleData}
            dataKey="count"
            innerRadius={58}
            nameKey="label"
            outerRadius={106}
            paddingAngle={2}
          >
            {visibleData.map((result, index) => (
              <Cell
                fill={getChartColor(index, colorMode, mutedColor)}
                key={getId(result)}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function FreeTextResultView({
  colorMode,
  results,
}: {
  colorMode: ResultColorMode;
  results: SurveyQuestionResult['freeTextResults'];
}) {
  if (results.length === 0) {
    return (
      <div className="empty-state">
        <MessageSquareText size={28} aria-hidden="true" />
        <p>Ingen fritekstsvar ennå.</p>
      </div>
    );
  }

  const wordCloud = buildFreeTextWordCloud(results);

  return (
    <>
      {wordCloud.length > 0 ? (
        <WordCloud colorMode={colorMode} items={wordCloud} />
      ) : null}

      <div className="free-text-results">
        {results.map((result) => (
          <article key={result.answerId}>
            <p>{result.text}</p>
            <span>
              {result.respondentLabel ?? 'Anonymt svar'} ·{' '}
              {formatDateTime(result.submittedAt)}
            </span>
          </article>
        ))}
      </div>
    </>
  );
}

function WordCloud({
  colorMode,
  items,
}: {
  colorMode: ResultColorMode;
  items: FreeTextWordCloudItem[];
}) {
  const placedItems = buildWordCloudLayout(items);

  return (
    <div className="word-cloud-block">
      <div className="word-cloud-block__header">
        <span>Ordsky</span>
        <span>{placedItems.length} ord</span>
      </div>
      <div className="word-cloud" aria-label="Ordsky for fritekstsvar">
        <svg
          aria-label={`Ordsky med ${placedItems.length} ord`}
          className="word-cloud__canvas"
          role="img"
          viewBox={`0 0 ${wordCloudWidth} ${wordCloudHeight}`}
        >
          {placedItems.map((item, index) => {
            const wordStyle = {
              fontSize: `${item.fontSize}px`,
              ...(colorMode === 'colorful'
                ? { color: getWordCloudColor(index, item) }
                : {}),
            };

            return (
              <text
                className={`word-cloud__word word-cloud__word--tone-${item.tone}`}
                dominantBaseline="middle"
                key={item.word}
                style={wordStyle}
                textAnchor="middle"
                transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
              >
                <title>{`${item.word}: ${formatWordCount(item.count)}`}</title>
                {item.word}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

type PlacedWordCloudItem = FreeTextWordCloudItem & {
  fontSize: number;
  height: number;
  rotation: number;
  width: number;
  x: number;
  y: number;
};

const wordCloudWidth = 960;
const wordCloudHeight = 400;
const wordCloudPadding = 22;
const wordCloudFontSizes = {
  1: 16,
  2: 22,
  3: 30,
  4: 42,
  5: 58,
} satisfies Record<FreeTextWordCloudItem['weight'], number>;

function buildWordCloudLayout(
  items: FreeTextWordCloudItem[],
): PlacedWordCloudItem[] {
  const placedItems: PlacedWordCloudItem[] = [];

  for (const [index, item] of items.entries()) {
    const fontSize = getCloudFontSize(item);
    const rotation = getCloudRotation(item, index);
    const bounds = estimateCloudWordBounds(item.word, fontSize, rotation);
    const position = findCloudWordPosition(bounds, placedItems, item.word, index);

    if (!position) {
      continue;
    }

    placedItems.push({
      ...item,
      ...bounds,
      ...position,
      fontSize,
      rotation,
    });
  }

  return placedItems;
}

function getCloudFontSize(item: FreeTextWordCloudItem) {
  const baseSize = wordCloudFontSizes[item.weight];
  let adjustedSize = baseSize;

  if (item.word.length > 15) {
    adjustedSize = Math.round(baseSize * 0.82);
  } else if (item.word.length > 11) {
    adjustedSize = Math.round(baseSize * 0.9);
  }

  const widthLimitedSize = Math.floor(420 / Math.max(1, item.word.length * 0.58));
  return Math.max(14, Math.min(adjustedSize, widthLimitedSize));
}

function getCloudRotation(item: FreeTextWordCloudItem, index: number) {
  if (index < 5) {
    return 0;
  }

  const rotations = [0, 0, 0, -10, 10, -16, 16, -24, 24];
  return rotations[(hashWord(item.word) + index) % rotations.length];
}

function estimateCloudWordBounds(
  word: string,
  fontSize: number,
  rotation: number,
) {
  const textWidth = Math.max(fontSize * 1.8, word.length * fontSize * 0.56);
  const textHeight = fontSize * 0.84;
  const radians = (Math.abs(rotation) * Math.PI) / 180;
  const width =
    Math.cos(radians) * textWidth + Math.sin(radians) * textHeight + 8;
  const height =
    Math.sin(radians) * textWidth + Math.cos(radians) * textHeight + 6;

  return { height, width };
}

function findCloudWordPosition(
  bounds: Pick<PlacedWordCloudItem, 'height' | 'width'>,
  placedItems: PlacedWordCloudItem[],
  word: string,
  index: number,
) {
  const centerX = wordCloudWidth / 2;
  const centerY = wordCloudHeight / 2;
  const startAngle = ((hashWord(word) % 360) * Math.PI) / 180;

  if (index === 0) {
    return { x: centerX, y: centerY };
  }

  for (let step = 0; step < 2600; step += 1) {
    const angle = startAngle + step * 0.38;
    const radius = step * 0.42;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.55;

    if (canPlaceCloudWord(x, y, bounds, placedItems)) {
      return { x: Math.round(x), y: Math.round(y) };
    }
  }

  return null;
}

function canPlaceCloudWord(
  x: number,
  y: number,
  bounds: Pick<PlacedWordCloudItem, 'height' | 'width'>,
  placedItems: PlacedWordCloudItem[],
) {
  const candidate = {
    bottom: y + bounds.height / 2,
    left: x - bounds.width / 2,
    right: x + bounds.width / 2,
    top: y - bounds.height / 2,
  };

  if (
    candidate.left < wordCloudPadding ||
    candidate.right > wordCloudWidth - wordCloudPadding ||
    candidate.top < wordCloudPadding ||
    candidate.bottom > wordCloudHeight - wordCloudPadding
  ) {
    return false;
  }

  return placedItems.every((item) => {
    const padding = 2;
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

function hashWord(word: string) {
  return [...word].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

function ResultBarList({
  items,
}: {
  items: Array<{
    color: string;
    id: string;
    label: string;
    count: number;
    percentage: number;
  }>;
}) {
  return (
    <div className="result-bar-list">
      {items.map((item) => (
        <div className="result-bar-row" key={item.id}>
          <div>
            <strong>{item.label}</strong>
            <span>
              {item.count} svar · {item.percentage} %
            </span>
          </div>
          <div className="result-bar-track" aria-hidden="true">
            <span
              style={{
                background: item.color,
                width: `${item.percentage}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type ResultChartType = Extract<QuestionVisualizationType, 'bar' | 'pie'>;
type ResultColorMode = QuestionVisualizationColorMode;

const colorfulChartPalette = [
  '#2f6f73',
  '#b86b3b',
  '#6f6ca8',
  '#c2933a',
  '#8a536b',
  '#4d7f54',
  '#c35f4b',
  '#4d7fa0',
];

function getChartColor(
  index: number,
  colorMode: ResultColorMode,
  mutedColor: string,
) {
  if (colorMode === 'muted') {
    return mutedColor;
  }

  return colorfulChartPalette[index % colorfulChartPalette.length];
}

function getWordCloudColor(index: number, item: FreeTextWordCloudItem) {
  return colorfulChartPalette[
    (hashWord(item.word) + item.tone + index) % colorfulChartPalette.length
  ];
}

function getInitialChartType(
  visualizationType: QuestionVisualizationType,
): ResultChartType {
  return visualizationType === 'pie' ? 'pie' : 'bar';
}

const questionTypeLabel = {
  multiple_choice: 'Flervalg',
  free_text: 'Fritekst',
  likert_scale: 'Skala',
} satisfies Record<SurveyQuestionResult['question']['type'], string>;

function formatSurveyMeta(results: SurveyResults) {
  const responseMode =
    results.responseMode === 'anonymous' ? 'Anonyme svar' : 'Identifiserte svar';
  return `${responseMode} · ${statusLabel[results.status]} · ${results.slug}`;
}

const statusLabel = {
  draft: 'Utkast',
  published: 'Publisert',
  closed: 'Lukket',
} satisfies Record<SurveyResults['status'], string>;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatWordCount(count: number) {
  return count === 1 ? '1 gang' : `${count} ganger`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke hente resultatene akkurat nå.';
}
