/**
 * Gráficos simples desenhados em canvas e gravados na planilha como PNG.
 * (O ExcelJS não cria gráficos nativos do Excel; a imagem abre igual no Excel,
 * no Google Planilhas e no LibreOffice.) Sem canvas disponível, devolvem null.
 */
import {
  SYMBOL_DROP_PATH,
  SYMBOL_FIGURES_PATH,
  SYMBOL_VIEWBOX,
} from '@/components/brand/symbol-paths';

const FONT = '"Inter Variable", "Segoe UI", system-ui, sans-serif';
const INK = '#1f2328';
const MUTED = '#5b6470';
const GRID = '#e6e1dc';
const SCALE = 2;

function canvas(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const element = document.createElement('canvas');
  element.width = width * SCALE;
  element.height = height * SCALE;
  const ctx = element.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return { element, ctx };
}

const integer = new Intl.NumberFormat('pt-BR');

/** Aceita "#RRGGBB" ou o ARGB do Excel ("FFRRGGBB"). */
function css(color: string): string {
  return /^[0-9a-f]{8}$/i.test(color) ? `#${color.slice(2)}` : color;
}

/** Tira o começo igual de todos os rótulos (ex.: "SangueConecta Unidade …"). */
function withoutCommonPrefix(labels: string[]): string[] {
  if (labels.length < 2) return labels;
  const words = labels.map((label) => label.split(' '));
  let shared = 0;
  while (words.every((w) => w.length > shared + 1 && w[shared] === words[0][shared])) shared++;
  return shared ? words.map((w) => w.slice(shared).join(' ')) : labels;
}

/** Quebra o rótulo em até duas linhas de ~16 caracteres. */
function wrap(label: string, width = 16): string[] {
  if (label.length <= width) return [label];
  const words = label.split(' ');
  let first = '';
  while (words.length && (first + ' ' + words[0]).trim().length <= width)
    first = `${first} ${words.shift()}`.trim();
  if (!first) first = words.shift() ?? '';
  const rest = words.join(' ');
  return rest ? [first, truncate(rest, width + 2)] : [first];
}

/**
 * Topo do eixo: o menor valor "redondo" que cabe os dados e divide em 4 partes
 * inteiras (4, 8, 12, 20, 40, 100…). Assim o eixo de contagens nunca mostra
 * números quebrados como 2,5 ou 3,8.
 */
function niceMax(value: number): number {
  for (let power = 1; ; power *= 10) {
    for (const step of [1, 2, 2.5, 3, 4, 5]) {
      if (step === 2.5 && power === 1) continue;
      if (step * power * 4 >= value) return step * power * 4;
    }
  }
}

function title(ctx: CanvasRenderingContext2D, text: string, subtitle?: string) {
  ctx.fillStyle = INK;
  ctx.font = `700 17px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(text, 20, 30);
  if (subtitle) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 12px ${FONT}`;
    ctx.fillText(subtitle, 20, 48);
  }
}

function yAxis(ctx: CanvasRenderingContext2D, area: Area, max: number) {
  ctx.font = `400 11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const value = (max / 4) * i;
    const y = area.bottom - (area.bottom - area.top) * (i / 4);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.fillText(integer.format(value), area.left - 8, y);
  }
}

interface Area {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function roundedTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

export interface BarChartOptions {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  color?: string;
  /** Cor por barra (ex.: status do estoque); tem prioridade sobre `color`. */
  colors?: string[];
  /** Marcadores horizontais por barra (ex.: mínimo e ideal do estoque). */
  markers?: Array<{ label: string; color: string; values: number[]; dashed?: boolean }>;
  width?: number;
  height?: number;
}

/** Colunas verticais com o valor em cima de cada barra. */
export function barChartPng(options: BarChartOptions): string | null {
  const width = options.width ?? 760;
  const height = options.height ?? 360;
  const surface = canvas(width, height);
  if (!surface) return null;
  const { ctx, element } = surface;
  title(ctx, options.title, options.subtitle);
  const hasLegend = Boolean(options.markers?.length);
  const area: Area = {
    left: 56,
    right: width - 20,
    top: 70 + (hasLegend ? 14 : 0),
    bottom: height - 58,
  };
  const markerMax = Math.max(0, ...(options.markers ?? []).flatMap((m) => m.values));
  const max = niceMax(Math.max(...options.values, markerMax, 1));
  yAxis(ctx, area, max);

  const n = options.values.length;
  const slot = (area.right - area.left) / Math.max(n, 1);
  const barWidth = Math.min(46, slot * 0.62);
  const labels = withoutCommonPrefix(options.labels);
  // Com poucas barras, rótulo em duas linhas; com muitas, inclinado.
  const rotate = n > 8 && labels.some((label) => label.length > 6);
  options.values.forEach((value, i) => {
    const h = ((area.bottom - area.top) * value) / max;
    const x = area.left + slot * i + (slot - barWidth) / 2;
    ctx.fillStyle = css(options.colors?.[i] ?? options.color ?? '#d30a04');
    roundedTop(ctx, x, area.bottom - h, barWidth, Math.max(h, value > 0 ? 1 : 0));
    ctx.save();
    ctx.fillStyle = MUTED;
    ctx.font = `400 11px ${FONT}`;
    if (rotate) {
      ctx.translate(x + barWidth / 2, area.bottom + 8);
      ctx.rotate(-Math.PI / 5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(truncate(labels[i], 22), 0, 0);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      wrap(labels[i]).forEach((line, k) =>
        ctx.fillText(line, x + barWidth / 2, area.bottom + 8 + k * 14),
      );
    }
    ctx.restore();
  });

  for (const marker of options.markers ?? []) {
    ctx.strokeStyle = css(marker.color);
    ctx.lineWidth = 2;
    ctx.setLineDash(marker.dashed ? [5, 4] : []);
    marker.values.forEach((value, i) => {
      const y = area.bottom - ((area.bottom - area.top) * value) / max;
      const x = area.left + slot * i + (slot - barWidth) / 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + barWidth + 5, y);
      ctx.stroke();
    });
  }
  ctx.setLineDash([]);
  // Valores por cima de tudo, com contorno branco: continuam legíveis sobre os marcadores.
  if (n <= 16) {
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = INK;
    options.values.forEach((value, i) => {
      const x = area.left + slot * i + slot / 2;
      const y = area.bottom - ((area.bottom - area.top) * value) / max - 4;
      ctx.strokeText(integer.format(value), x, y);
      ctx.fillText(integer.format(value), x, y);
    });
  }
  if (hasLegend)
    legend(
      ctx,
      options.markers!.map((m) => ({ label: m.label, color: m.color })),
      width,
      62,
    );
  return element.toDataURL('image/png');
}

export interface LineChartOptions {
  title: string;
  subtitle?: string;
  labels: string[];
  series: Array<{ name: string; color: string; values: number[] }>;
  width?: number;
  height?: number;
}

/** Linhas ao longo do tempo (rótulos do eixo X espaçados para não amontoar). */
export function lineChartPng(options: LineChartOptions): string | null {
  const width = options.width ?? 760;
  const height = options.height ?? 340;
  const surface = canvas(width, height);
  if (!surface) return null;
  const { ctx, element } = surface;
  title(ctx, options.title, options.subtitle);
  const area: Area = { left: 56, right: width - 20, top: 84, bottom: height - 40 };
  const max = niceMax(Math.max(1, ...options.series.flatMap((s) => s.values)));
  yAxis(ctx, area, max);
  const n = options.labels.length;
  const xAt = (i: number) => area.left + ((area.right - area.left) * i) / Math.max(n - 1, 1);

  const every = Math.max(1, Math.ceil(n / 8));
  ctx.fillStyle = MUTED;
  ctx.font = `400 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  options.labels.forEach((label, i) => {
    if (i % every === 0 || i === n - 1) ctx.fillText(label, xAt(i), area.bottom + 8);
  });

  for (const series of options.series) {
    ctx.strokeStyle = css(series.color);
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    series.values.forEach((value, i) => {
      const y = area.bottom - ((area.bottom - area.top) * value) / max;
      if (i === 0) ctx.moveTo(xAt(i), y);
      else ctx.lineTo(xAt(i), y);
    });
    ctx.stroke();
    if (n <= 45) {
      ctx.fillStyle = css(series.color);
      series.values.forEach((value, i) => {
        const y = area.bottom - ((area.bottom - area.top) * value) / max;
        ctx.beginPath();
        ctx.arc(xAt(i), y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  legend(
    ctx,
    options.series.map((s) => ({ label: s.name, color: s.color })),
    width,
    62,
  );
  return element.toDataURL('image/png');
}

function legend(
  ctx: CanvasRenderingContext2D,
  items: Array<{ label: string; color: string }>,
  width: number,
  y: number,
) {
  ctx.font = `500 12px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let x = 20;
  for (const item of items) {
    ctx.fillStyle = css(item.color);
    ctx.fillRect(x, y - 5, 18, 10);
    ctx.fillStyle = INK;
    ctx.fillText(item.label, x + 24, y);
    x += 24 + ctx.measureText(item.label).width + 22;
    if (x > width - 120) break;
  }
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Símbolo do SangueConecta (gota com as duas pessoas) em PNG, para o cabeçalho.
 * Com `background`, o símbolo vem dentro de um quadro arredondado dessa cor
 * (para ficar legível sobre a faixa escura).
 */
export function symbolPng(height: number, background?: string): string | null {
  const [, , vw, vh] = SYMBOL_VIEWBOX.split(' ').map(Number);
  const padding = background ? Math.round(height * 0.1) : 0;
  const symbolHeight = height - padding * 2;
  const symbolWidth = Math.round((symbolHeight * vw) / vh);
  const width = symbolWidth + padding * 2;
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null;
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const ctx = element.getContext('2d');
  if (!ctx) return null;
  if (background) {
    const radius = height * 0.16;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.arcTo(width, 0, width, height, radius);
    ctx.arcTo(width, height, 0, height, radius);
    ctx.arcTo(0, height, 0, 0, radius);
    ctx.arcTo(0, 0, width, 0, radius);
    ctx.closePath();
    ctx.fill();
  }
  ctx.translate(padding, padding);
  ctx.scale(symbolWidth / vw, symbolHeight / vh);
  ctx.fillStyle = '#d30a04';
  ctx.fill(new Path2D(SYMBOL_DROP_PATH));
  ctx.fillStyle = '#e4e3e5';
  ctx.fill(new Path2D(SYMBOL_FIGURES_PATH));
  return element.toDataURL('image/png');
}
