import type { SurveyFreeTextResult } from '../../domain/surveys/survey';

export type FreeTextWordCloudItem = {
  word: string;
  count: number;
  weight: 1 | 2 | 3 | 4 | 5;
  tone: 1 | 2 | 3 | 4 | 5;
};

const defaultMaxWords = 36;
const minimumWordLength = 3;
const stopWords = new Set([
  'alle',
  'alt',
  'andre',
  'at',
  'av',
  'bare',
  'ble',
  'bli',
  'blir',
  'blei',
  'da',
  'de',
  'deg',
  'dei',
  'den',
  'denne',
  'der',
  'dere',
  'det',
  'dette',
  'din',
  'dine',
  'disse',
  'du',
  'eg',
  'ein',
  'eit',
  'eller',
  'en',
  'enn',
  'er',
  'et',
  'ett',
  'etter',
  'for',
  'fordi',
  'fra',
  'få',
  'fekk',
  'fikk',
  'gjennom',
  'ha',
  'hadde',
  'han',
  'har',
  'hele',
  'her',
  'hos',
  'hun',
  'hva',
  'hvem',
  'hver',
  'hvor',
  'hvis',
  'i',
  'ikke',
  'ingen',
  'inn',
  'ja',
  'jeg',
  'kan',
  'kanskje',
  'kom',
  'kommer',
  'kun',
  'kunne',
  'kva',
  'kvar',
  'kven',
  'man',
  'med',
  'meg',
  'meget',
  'men',
  'mer',
  'meir',
  'mi',
  'min',
  'mine',
  'mot',
  'mye',
  'mykje',
  'må',
  'ned',
  'nei',
  'noe',
  'noen',
  'nok',
  'nokon',
  'noko',
  'nå',
  'når',
  'og',
  'også',
  'om',
  'opp',
  'oss',
  'over',
  'på',
  'samme',
  'seg',
  'selv',
  'si',
  'sia',
  'siden',
  'sin',
  'sine',
  'sitt',
  'skal',
  'skulle',
  'slik',
  'som',
  'så',
  'til',
  'ut',
  'var',
  'ved',
  'vel',
  'vi',
  'vil',
  'ville',
  'vår',
  'våre',
  'vårt',
  'å',
]);

export function buildFreeTextWordCloud(
  results: SurveyFreeTextResult[],
  maxWords = defaultMaxWords,
): FreeTextWordCloudItem[] {
  const wordCounts = new Map<string, number>();

  for (const result of results) {
    for (const word of tokenize(result.text)) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  const sortedWords = [...wordCounts.entries()]
    .sort(([leftWord, leftCount], [rightWord, rightCount]) => {
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      return leftWord.localeCompare(rightWord, 'nb-NO');
    })
    .slice(0, maxWords);

  const counts = sortedWords.map(([, count]) => count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  return sortedWords.map(([word, count], index) => ({
    word,
    count,
    weight: getWordWeight(count, minCount, maxCount),
    tone: getWordTone(word, index),
  }));
}

function tokenize(text: string) {
  return (
    text
      .normalize('NFKC')
      .toLocaleLowerCase('nb-NO')
      .match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? []
  )
    .map((word) => word.replace(/^[-']+|[-']+$/g, ''))
    .filter((word) => isRelevantWord(word));
}

function isRelevantWord(word: string) {
  return (
    word.length >= minimumWordLength &&
    !/^\d+$/.test(word) &&
    !stopWords.has(word)
  );
}

function getWordWeight(
  count: number,
  minCount: number,
  maxCount: number,
): FreeTextWordCloudItem['weight'] {
  if (!Number.isFinite(minCount) || !Number.isFinite(maxCount)) {
    return 3;
  }

  if (minCount === maxCount) {
    return 3;
  }

  const normalizedWeight = (count - minCount) / (maxCount - minCount);
  return Math.round(1 + normalizedWeight * 4) as FreeTextWordCloudItem['weight'];
}

function getWordTone(
  word: string,
  index: number,
): FreeTextWordCloudItem['tone'] {
  const tone = [...word].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    index,
  );

  return ((tone % 5) + 1) as FreeTextWordCloudItem['tone'];
}
