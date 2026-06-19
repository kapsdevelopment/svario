import type { FreeTextWordCloudItem } from './buildFreeTextWordCloud';
import { exportColors } from './exportSurveyResultsShared';

type SvgWordCloudItem = FreeTextWordCloudItem & {
  fontSize: number;
  height: number;
  rotation: number;
  width: number;
  x: number;
  y: number;
};

type WordCloudImageOptions = {
  height?: number;
  width?: number;
};

const defaultWordCloudWidth = 1400;
const defaultWordCloudHeight = 780;

const transparentPngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
  218, 99, 96, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78,
  68, 174, 66, 96, 130,
]);

export function createFreeTextWordCloudSvgDataUri(
  items: FreeTextWordCloudItem[],
  options: WordCloudImageOptions = {},
) {
  return `data:image/svg+xml;base64,${encodeBase64(
    createFreeTextWordCloudSvg(items, options),
  )}`;
}

export async function createFreeTextWordCloudImage(
  items: FreeTextWordCloudItem[],
  options: WordCloudImageOptions = {},
) {
  const width = options.width ?? defaultWordCloudWidth;
  const height = options.height ?? defaultWordCloudHeight;
  const svg = createFreeTextWordCloudSvg(items, { height, width });

  return {
    height,
    pngFallbackBytes: await createPngFallback(svg, width, height),
    svgBytes: encodeUtf8(svg),
    width,
  };
}

function createFreeTextWordCloudSvg(
  items: FreeTextWordCloudItem[],
  options: WordCloudImageOptions = {},
) {
  const width = options.width ?? defaultWordCloudWidth;
  const height = options.height ?? defaultWordCloudHeight;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="none"/>
    ${words}
  </svg>`;
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

async function createPngFallback(svg: string, width: number, height: number) {
  if (
    typeof document === 'undefined' ||
    typeof Image === 'undefined' ||
    typeof URL === 'undefined'
  ) {
    return transparentPngBytes;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return transparentPngBytes;
    }

    const image = new Image();
    const url = URL.createObjectURL(
      new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    );

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Kunne ikke lage PNG-fallback.'));
        image.src = url;
      });
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
    } finally {
      URL.revokeObjectURL(url);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );

    if (!blob) {
      return transparentPngBytes;
    }

    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return transparentPngBytes;
  }
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encodeUtf8(value: string) {
  return new TextEncoder().encode(value);
}

function encodeBase64(value: string) {
  const bytes = encodeUtf8(value);
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
