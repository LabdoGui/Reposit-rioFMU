/**
 * Base das planilhas Excel (.xlsx) do SangueConecta: cabeçalho em faixa com a
 * marca, cartões de indicadores, destaques em frases curtas, tabelas do Excel
 * (filtro, linhas alternadas e totais), formatos brasileiros, formatação
 * condicional, gráficos como imagem e impressão em A4.
 *
 * O ExcelJS só é carregado quando alguém pede a planilha (import dinâmico):
 * o app não fica mais pesado para quem nunca exporta.
 */
import type { Borders, Fill, Font, Workbook, Worksheet } from 'exceljs';
import { DEFAULT_TIMEZONE } from '@pulso/contracts';
import { downloadFile } from '@/lib/csv';
import { symbolPng } from './charts';

/** Cores no formato ARGB do Excel (mesmos tons do app). */
export const XLSX_COLORS = {
  carmim: 'FFA3123A',
  petroleo: 'FF0A3242',
  petroleoClaro: 'FFD7EBF0',
  marca: 'FFD30A04',
  azul: 'FF215F8F',
  ink: 'FF1F2328',
  muted: 'FF5B6470',
  line: 'FFE6E1DC',
  soft: 'FFFAF8F6',
  card: 'FFF4F0EC',
  white: 'FFFFFFFF',
  okText: 'FF1A6B43',
  okFill: 'FFE6F4EC',
  warnText: 'FF9A5100',
  warnFill: 'FFFFF4E0',
  criticalText: 'FFB42318',
  criticalFill: 'FFFDECEA',
  infoFill: 'FFEFF7F9',
} as const;

export const FORMATS = {
  integer: '#,##0',
  /** Inteiro que mostra um traço no lugar do zero (tabelas com muitos zeros). */
  integerDash: '#,##0;-#,##0;"–"',
  decimal: '#,##0.0',
  percent: '0.0%',
  date: 'dd/mm/yyyy',
  dateTime: 'dd/mm/yyyy hh:mm',
  liters: '#,##0.0" L"',
  signed: '+#,##0;-#,##0;0',
  /** Variação com seta: ▲ +7, ▼ -4, = 0. */
  signedArrow: '"▲ "+#,##0;"▼ "-#,##0;"= "0',
} as const;

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Tom de um indicador ou destaque (verde, laranja, vermelho). */
export type Tone = 'ok' | 'warn' | 'critical';

const TONE_TEXT: Record<Tone, string> = {
  ok: XLSX_COLORS.okText,
  warn: XLSX_COLORS.warnText,
  critical: XLSX_COLORS.criticalText,
};
const TONE_FILL: Record<Tone, string> = {
  ok: XLSX_COLORS.okFill,
  warn: XLSX_COLORS.warnFill,
  critical: XLSX_COLORS.criticalFill,
};

/**
 * Fonte das células formatadas. O nome vai sempre junto: sem ele, alguns
 * programas (LibreOffice, Google Planilhas) trocam por uma fonte com serifa.
 */
export const FONT_NAME = 'Calibri';

export function font(options: Partial<Font> = {}): Partial<Font> {
  return { name: FONT_NAME, ...options };
}

function solid(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export async function createWorkbook(title: string): Promise<Workbook> {
  const mod = await import('exceljs');
  // O pacote do navegador é UMD: dependendo do empacotamento, as classes vêm no default.
  const Excel = 'Workbook' in mod ? mod : (mod as unknown as { default: typeof mod }).default;
  const workbook = new Excel.Workbook();
  workbook.creator = 'SangueConecta';
  workbook.company = 'SangueConecta (projeto acadêmico, dados fictícios)';
  workbook.title = title;
  workbook.created = new Date();
  // O Excel recalcula as fórmulas ao abrir (os resultados também vão gravados).
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook;
}

export async function downloadWorkbook(workbook: Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(filename, buffer as ArrayBuffer, XLSX_MIME);
}

/**
 * Aba nova, já pronta para imprimir em A4: paisagem, tudo na largura de uma
 * página, margens curtas e rodapé com o número da página.
 */
export function addSheet(
  workbook: Workbook,
  name: string,
  widths: number[],
  tabColor: string = XLSX_COLORS.carmim,
): Worksheet {
  const sheet = workbook.addWorksheet(name, {
    properties: { tabColor: { argb: tabColor }, defaultRowHeight: 18 },
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.45, bottom: 0.6, header: 0.2, footer: 0.3 },
    },
    headerFooter: {
      // &8 = tamanho da letra; &A = nome da aba; &P de &N = página atual e total.
      oddFooter: '&L&8SangueConecta · dados fictícios (projeto acadêmico)&C&8&A&R&8Página &P de &N',
    },
  });
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  return sheet;
}

interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  /** A aba inteira em uma página só (painéis de resumo). */
  onePage?: boolean;
  /** Linha repetida no topo de cada página (cabeçalho de tabelas longas). */
  repeatRow?: number;
}

/** Ajustes de impressão por aba, por cima do padrão do addSheet. */
export function setupPrint(sheet: Worksheet, options: PrintOptions): void {
  if (options.orientation) sheet.pageSetup.orientation = options.orientation;
  if (options.onePage) sheet.pageSetup.fitToHeight = 1;
  if (options.repeatRow)
    sheet.pageSetup.printTitlesRow = `${options.repeatRow}:${options.repeatRow}`;
}

/** Letra da coluna (1 → A, 27 → AA). */
export function columnLetter(index: number): string {
  let letters = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

/** Largura, em caracteres, das primeiras `span` colunas. */
function widthInChars(sheet: Worksheet, span: number): number {
  let total = 0;
  for (let col = 1; col <= span; col++) total += sheet.getColumn(col).width ?? 9;
  return total;
}

interface HeaderOptions {
  title: string;
  subtitle?: string;
  /** Linhas de contexto (período, filtros, data de geração). */
  details?: string[];
  /** Quantas colunas o cabeçalho ocupa. */
  span: number;
}

/**
 * Cabeçalho da aba: faixa escura com o símbolo e o título, um fio carmim e as
 * linhas de contexto. Devolve a próxima linha livre.
 */
export function writeHeader(workbook: Workbook, sheet: Worksheet, options: HeaderOptions): number {
  const last = columnLetter(options.span);
  const logo = symbolPng(96, '#ffffff');
  // O símbolo fica sobre o começo das linhas 1 e 2; o recuo afasta o texto dele
  // qualquer que seja a largura da coluna A.
  const indent = logo ? 6 : 1;
  if (logo) {
    const imageId = workbook.addImage({ base64: logo, extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 0.12, row: 0.2 }, ext: { width: 34, height: 47 } });
  }
  sheet.getRow(1).height = 30;
  sheet.mergeCells(`A1:${last}1`);
  const title = sheet.getCell('A1');
  title.value = options.title;
  title.font = font({ size: 18, bold: true, color: { argb: XLSX_COLORS.white } });
  title.fill = solid(XLSX_COLORS.petroleo);
  // O recuo só vale com alinhamento horizontal explícito.
  title.alignment = { vertical: 'bottom', horizontal: 'left', indent };

  sheet.getRow(2).height = 21;
  sheet.mergeCells(`A2:${last}2`);
  const subtitle = sheet.getCell('A2');
  subtitle.value =
    options.subtitle ?? 'SangueConecta · Conectando doadores a vidas que precisam de ajuda.';
  subtitle.font = font({ size: 10, color: { argb: XLSX_COLORS.petroleoClaro } });
  subtitle.fill = solid(XLSX_COLORS.petroleo);
  subtitle.alignment = { vertical: 'top', horizontal: 'left', indent };

  sheet.getRow(3).height = 4;
  sheet.mergeCells(`A3:${last}3`);
  sheet.getCell('A3').fill = solid(XLSX_COLORS.carmim);

  // Abas estreitas: o texto quebra em mais de uma linha em vez de ser cortado.
  const chars = widthInChars(sheet, options.span);
  let row = 4;
  for (const detail of options.details ?? []) {
    sheet.mergeCells(`A${row}:${last}${row}`);
    const cell = sheet.getCell(`A${row}`);
    cell.value = detail;
    cell.font = font({ size: 10, color: { argb: XLSX_COLORS.ink } });
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    sheet.getRow(row).height = 4 + Math.ceil(detail.length / chars) * 14;
    row++;
  }
  sheet.mergeCells(`A${row}:${last}${row}`);
  const notice = sheet.getCell(`A${row}`);
  notice.value =
    'Dados fictícios, gerados para demonstração acadêmica. Não representam informações de hemocentros reais.';
  notice.font = font({ size: 9, italic: true, color: { argb: XLSX_COLORS.warnText } });
  notice.fill = solid(XLSX_COLORS.warnFill);
  notice.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
  sheet.getRow(row).height = 5 + Math.ceil(String(notice.value).length / (chars * 1.15)) * 13;
  return row + 2;
}

/** Título de seção, com um fio embaixo. Devolve a próxima linha livre. */
export function writeSection(sheet: Worksheet, row: number, text: string, span: number): number {
  sheet.mergeCells(`A${row}:${columnLetter(span)}${row}`);
  const cell = sheet.getCell(`A${row}`);
  cell.value = text.toUpperCase();
  cell.font = font({ bold: true, size: 11, color: { argb: XLSX_COLORS.petroleo } });
  cell.border = { bottom: { style: 'medium', color: { argb: XLSX_COLORS.petroleo } } };
  cell.alignment = { vertical: 'middle' };
  sheet.getRow(row).height = 22;
  return row + 1;
}

/** Texto discreto (observações, "sem dados"). Devolve a próxima linha livre. */
export function writeNote(sheet: Worksheet, row: number, text: string, span: number): number {
  sheet.mergeCells(`A${row}:${columnLetter(span)}${row}`);
  const cell = sheet.getCell(`A${row}`);
  cell.value = text;
  cell.font = font({ size: 10, italic: true, color: { argb: XLSX_COLORS.muted } });
  cell.alignment = { wrapText: true, vertical: 'top' };
  return row + 1;
}

export type CellValue = string | number | Date | null | { formula: string; result: number };

export interface KpiCard {
  label: string;
  value: CellValue;
  numFmt?: string;
  /** Linha pequena embaixo do número. */
  detail?: string;
  /** Cor do fio e do número; sem tom, o cartão fica neutro. */
  tone?: Tone;
}

/** Primeira coluna do cartão `index` numa fileira de `perRow` cartões em `span` colunas. */
function kpiColumn(index: number, span: number, perRow: number): number {
  return Math.floor((index * span) / perRow) + 1;
}

/** Endereço da célula do número de um cartão (para fórmulas entre cartões). */
export function kpiValueCell(row: number, index: number, span: number, perRow = 4): string {
  return `${columnLetter(kpiColumn(index, span, perRow))}${row + 1}`;
}

/**
 * Cartões de indicadores lado a lado: rótulo, número grande e uma linha de
 * detalhe, com um fio colorido em cima. Devolve a próxima linha livre.
 */
export function writeKpiCards(
  sheet: Worksheet,
  row: number,
  cards: KpiCard[],
  span: number,
  perRow = 4,
): number {
  for (let start = 0; start < cards.length; start += perRow) {
    cards.slice(start, start + perRow).forEach((card, index) => {
      const firstCol = kpiColumn(index, span, perRow);
      const lastCol = kpiColumn(index + 1, span, perRow) - 1;
      const accent = card.tone ? TONE_TEXT[card.tone] : XLSX_COLORS.petroleo;
      // Um fio branco à direita separa os cartões vizinhos.
      const gap: Partial<Borders> =
        index < perRow - 1 ? { right: { style: 'thick', color: { argb: XLSX_COLORS.white } } } : {};
      const lines: Array<{ value: CellValue; font: Partial<Font>; height: number }> = [
        {
          value: card.label.toUpperCase(),
          font: font({ size: 9, bold: true, color: { argb: XLSX_COLORS.muted } }),
          height: 20,
        },
        {
          value: card.value ?? '—',
          font: font({
            size: 20,
            bold: true,
            color: { argb: card.tone ? accent : XLSX_COLORS.ink },
          }),
          height: 30,
        },
        {
          value: card.detail ?? '',
          font: font({ size: 9, color: { argb: XLSX_COLORS.muted } }),
          height: 20,
        },
      ];
      lines.forEach((line, offset) => {
        const r = row + offset;
        if (lastCol > firstCol) sheet.mergeCells(r, firstCol, r, lastCol);
        const cell = sheet.getCell(r, firstCol);
        cell.value = line.value;
        cell.font = line.font;
        cell.fill = solid(XLSX_COLORS.card);
        cell.alignment = {
          horizontal: 'left',
          vertical: offset === 2 ? 'top' : 'middle',
          indent: 1,
        };
        cell.border =
          offset === 0 ? { top: { style: 'thick', color: { argb: accent } }, ...gap } : gap;
        if (offset === 1 && card.numFmt) cell.numFmt = card.numFmt;
        sheet.getRow(r).height = line.height;
      });
    });
    row += 4;
  }
  return row;
}

export interface Highlight {
  /** Sem tom, o destaque é informativo (azul). */
  tone?: Tone;
  /** Começo em negrito (ex.: "AB− crítico:"). */
  title: string;
  text: string;
}

/**
 * Destaques: uma frase por linha, numa faixa com a cor do tom. É o que a pessoa
 * precisa saber sem ler as tabelas. Devolve a próxima linha livre.
 */
export function writeHighlights(
  sheet: Worksheet,
  row: number,
  items: Highlight[],
  span: number,
): number {
  const chars = widthInChars(sheet, span);
  for (const item of items) {
    const accent = item.tone ? TONE_TEXT[item.tone] : XLSX_COLORS.azul;
    sheet.mergeCells(row, 1, row, span);
    const cell = sheet.getCell(row, 1);
    cell.value = {
      richText: [
        { text: `${item.title} `, font: font({ size: 11, bold: true, color: { argb: accent } }) },
        { text: item.text, font: font({ size: 11, color: { argb: XLSX_COLORS.ink } }) },
      ],
    };
    cell.fill = solid(item.tone ? TONE_FILL[item.tone] : XLSX_COLORS.infoFill);
    cell.border = {
      left: { style: 'thick', color: { argb: accent } },
      bottom: { style: 'thin', color: { argb: XLSX_COLORS.white } },
    };
    // O recuo só vale com alinhamento horizontal explícito.
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    const lines = Math.ceil((item.title.length + item.text.length + 3) / chars);
    sheet.getRow(row).height = 9 + Math.max(1, lines) * 15;
    row++;
  }
  return row + 1;
}

export interface TableColumn {
  name: string;
  numFmt?: string;
  /** Alinhamento do cabeçalho e das células (padrão: números à direita, texto à esquerda). */
  align?: 'left' | 'center' | 'right';
  /** Linha de totais: rótulo, soma, contagem ou média (com o resultado já calculado). */
  total?: { label: string } | { fn: 'sum' | 'count' | 'average'; result: number };
}

export interface TablePlacement {
  headerRow: number;
  firstRow: number;
  lastRow: number;
  /** Próxima linha livre depois da tabela. */
  nextRow: number;
}

/**
 * Tabela do Excel com filtro em cada coluna, linhas alternadas, cabeçalho fixo
 * no visual da marca e, se pedido, linha de totais com fórmulas SUBTOTAL (que
 * respeitam o filtro aplicado). Sem linhas, escreve "Sem dados" (uma tabela
 * vazia corrompe o arquivo no Excel).
 */
export function writeTable(
  sheet: Worksheet,
  row: number,
  name: string,
  columns: TableColumn[],
  rows: CellValue[][],
  firstCol = 1,
): TablePlacement {
  if (rows.length === 0) {
    const next = writeNote(sheet, row, 'Sem dados para os filtros escolhidos.', columns.length);
    return { headerRow: row, firstRow: row, lastRow: row, nextRow: next + 1 };
  }
  const withTotals = columns.some((column) => column.total);
  sheet.addTable({
    name,
    ref: `${columnLetter(firstCol)}${row}`,
    headerRow: true,
    totalsRow: withTotals,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: columns.map((column) => {
      const total = column.total;
      if (!total) return { name: column.name, filterButton: true };
      if ('label' in total)
        return { name: column.name, filterButton: true, totalsRowLabel: total.label };
      return {
        name: column.name,
        filterButton: true,
        totalsRowFunction: total.fn,
        totalsRowResult: total.result,
      };
    }),
    rows,
  });
  const firstRow = row + 1;
  const lastRow = row + rows.length;
  const endRow = lastRow + (withTotals ? 1 : 0);
  sheet.getRow(row).height = 30;
  columns.forEach((column, index) => {
    const col = firstCol + index;
    const horizontal = column.align ?? (column.numFmt ? 'right' : 'left');
    const header = sheet.getCell(row, col);
    header.font = font({ bold: true, color: { argb: XLSX_COLORS.white } });
    header.fill = solid(XLSX_COLORS.carmim);
    header.alignment = { vertical: 'middle', horizontal, wrapText: true };
    for (let r = firstRow; r <= endRow; r++) {
      const cell = sheet.getCell(r, col);
      if (column.numFmt) cell.numFmt = column.numFmt;
      if (column.align) cell.alignment = { horizontal: column.align };
    }
  });
  if (withTotals) {
    for (let index = 0; index < columns.length; index++) {
      const cell = sheet.getCell(endRow, firstCol + index);
      cell.font = font({ bold: true });
      cell.border = { top: { style: 'medium', color: { argb: XLSX_COLORS.carmim } } };
    }
  }
  return { headerRow: row, firstRow, lastRow, nextRow: lastRow + (withTotals ? 3 : 2) };
}

/** Tons claros das barras de dados: o número da célula continua legível por cima. */
export const BAR_COLORS = {
  vermelho: 'FFF2A7A4',
  carmim: 'FFE7A9BA',
  azul: 'FFA9C7E0',
} as const;

/** Barras de dados dentro das células (comparação visual rápida). */
export function addDataBars(sheet: Worksheet, ref: string, color: string = BAR_COLORS.vermelho) {
  sheet.addConditionalFormatting({
    ref,
    rules: [
      {
        type: 'dataBar',
        minLength: 0,
        maxLength: 100,
        gradient: true,
        border: false,
        cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
        color: { argb: color },
      },
    ],
    // O ExcelJS grava a cor da barra e numera as regras, mas os tipos dele exigem outro formato.
  } as unknown as Parameters<Worksheet['addConditionalFormatting']>[0]);
}

/** Escala de cores vermelho → amarelo → verde (ex.: % do estoque ideal). */
export function addTrafficLightScale(sheet: Worksheet, ref: string, low = 0, mid = 0.6, high = 1) {
  sheet.addConditionalFormatting({
    ref,
    rules: [
      {
        type: 'colorScale',
        cfvo: [
          { type: 'num', value: low },
          { type: 'num', value: mid },
          { type: 'num', value: high },
        ],
        color: [{ argb: 'FFF8696B' }, { argb: 'FFFFEB84' }, { argb: 'FF63BE7B' }],
      },
    ],
    // Sem "priority": o ExcelJS numera as regras da aba na hora de gravar.
  } as unknown as Parameters<Worksheet['addConditionalFormatting']>[0]);
}

/** Gráfico (PNG) ancorado numa célula. Sem canvas no navegador, simplesmente não entra. */
export function placeChart(
  workbook: Workbook,
  sheet: Worksheet,
  png: string | null,
  at: { col: number; row: number },
  size = { width: 620, height: 300 },
) {
  if (!png) return;
  const imageId = workbook.addImage({ base64: png, extension: 'png' });
  sheet.addImage(imageId, { tl: { col: at.col - 1, row: at.row - 1 }, ext: size });
}

/** Células de status (Crítico/Atenção/Adequado) com cor de fundo e texto. */
export function paintStatus(sheet: Worksheet, row: number, col: number, tone: Tone) {
  const cell = sheet.getCell(row, col);
  cell.font = font({ bold: true, color: { argb: TONE_TEXT[tone] } });
  cell.fill = solid(TONE_FILL[tone]);
  cell.alignment = { horizontal: 'center' };
}

// --- Datas -----------------------------------------------------------------

const localParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * O Excel não tem fuso: grava a data como "relógio de parede". Convertemos o
 * instante para o horário de Brasília antes de gravar, para a planilha mostrar
 * a mesma hora que o app.
 */
export function excelDateTime(value: string | Date): Date {
  const parts = Object.fromEntries(
    localParts
      .formatToParts(value instanceof Date ? value : new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return new Date(
    Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second),
  );
}

/** Data local AAAA-MM-DD como data do Excel. */
export function excelDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "05/11/2026 às 14:32" no horário de Brasília (rodapé "gerado em"). */
export function generatedAtLabel(now = new Date()): string {
  const date = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: DEFAULT_TIMEZONE,
  }).format(now);
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'short',
    timeZone: DEFAULT_TIMEZONE,
  }).format(now);
  return `${date} às ${time} (horário de Brasília)`;
}

/** Fração com o resultado já calculado (para quem abre sem recalcular). */
export function shareFormula(cell: string, range: string, value: number, total: number) {
  return {
    formula: `IF(SUM(${range})=0,0,${cell}/SUM(${range}))`,
    result: total ? value / total : 0,
  };
}
