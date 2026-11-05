/**
 * Base das planilhas Excel (.xlsx) do SangueConecta: cabeçalho com a marca,
 * tabelas do Excel (filtro, linhas alternadas e totais), formatos brasileiros,
 * formatação condicional e gráficos como imagem.
 *
 * O ExcelJS só é carregado quando alguém pede a planilha (import dinâmico):
 * o app não fica mais pesado para quem nunca exporta.
 */
import type { Workbook, Worksheet } from 'exceljs';
import { DEFAULT_TIMEZONE } from '@pulso/contracts';
import { downloadFile } from '@/lib/csv';
import { symbolPng } from './charts';

/** Cores no formato ARGB do Excel (mesmos tons do app). */
export const XLSX_COLORS = {
  carmim: 'FFA3123A',
  petroleo: 'FF0A3242',
  marca: 'FFD30A04',
  azul: 'FF215F8F',
  ink: 'FF1F2328',
  muted: 'FF5B6470',
  line: 'FFE6E1DC',
  soft: 'FFFAF8F6',
  okText: 'FF1A6B43',
  okFill: 'FFE6F4EC',
  warnText: 'FF9A5100',
  warnFill: 'FFFFF4E0',
  criticalText: 'FFB42318',
  criticalFill: 'FFFDECEA',
} as const;

export const FORMATS = {
  integer: '#,##0',
  decimal: '#,##0.0',
  percent: '0.0%',
  date: 'dd/mm/yyyy',
  dateTime: 'dd/mm/yyyy hh:mm',
  liters: '#,##0.0" L"',
  signed: '+#,##0;-#,##0;0',
} as const;

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

export function addSheet(
  workbook: Workbook,
  name: string,
  widths: number[],
  tabColor: string = XLSX_COLORS.carmim,
): Worksheet {
  const sheet = workbook.addWorksheet(name, {
    properties: { tabColor: { argb: tabColor }, defaultRowHeight: 18 },
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  return sheet;
}

/** Letra da coluna (1 → A, 27 → AA). */
export function columnLetter(index: number): string {
  let letters = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

interface HeaderOptions {
  title: string;
  subtitle?: string;
  /** Linhas de contexto (período, filtros, data de geração). */
  details?: string[];
  /** Quantas colunas o cabeçalho ocupa. */
  span: number;
}

/** Cabeçalho da aba com o símbolo da marca. Devolve a próxima linha livre. */
export function writeHeader(workbook: Workbook, sheet: Worksheet, options: HeaderOptions): number {
  const last = columnLetter(options.span);
  const logo = symbolPng(96);
  // O símbolo fica sobre o começo das linhas 1 e 2; o recuo afasta o texto dele
  // qualquer que seja a largura da coluna A.
  const indent = logo ? 5 : 0;
  if (logo) {
    const imageId = workbook.addImage({ base64: logo, extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 32, height: 49 } });
  }
  sheet.getRow(1).height = 26;
  sheet.mergeCells(`A1:${last}1`);
  const title = sheet.getCell('A1');
  title.value = options.title;
  title.font = { size: 18, bold: true, color: { argb: XLSX_COLORS.carmim } };
  // O recuo só vale com alinhamento horizontal explícito.
  title.alignment = { vertical: 'middle', horizontal: 'left', indent };

  sheet.mergeCells(`A2:${last}2`);
  const subtitle = sheet.getCell('A2');
  subtitle.value =
    options.subtitle ?? 'SangueConecta · Conectando doadores a vidas que precisam de ajuda.';
  subtitle.font = { size: 11, color: { argb: XLSX_COLORS.muted } };
  subtitle.alignment = { horizontal: 'left', indent };

  let row = 4;
  for (const detail of options.details ?? []) {
    sheet.mergeCells(`A${row}:${last}${row}`);
    const cell = sheet.getCell(`A${row}`);
    cell.value = detail;
    cell.font = { size: 10, color: { argb: XLSX_COLORS.ink } };
    row++;
  }
  sheet.mergeCells(`A${row}:${last}${row}`);
  const notice = sheet.getCell(`A${row}`);
  notice.value =
    'Dados fictícios, gerados para demonstração acadêmica. Não representam informações de hemocentros reais.';
  notice.font = { size: 10, italic: true, color: { argb: XLSX_COLORS.warnText } };
  notice.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.warnFill } };
  return row + 2;
}

/** Faixa de título de seção. Devolve a próxima linha livre. */
export function writeSection(sheet: Worksheet, row: number, text: string, span: number): number {
  sheet.mergeCells(`A${row}:${columnLetter(span)}${row}`);
  const cell = sheet.getCell(`A${row}`);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.petroleo } };
  cell.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(row).height = 22;
  return row + 1;
}

/** Texto discreto (observações, "sem dados"). Devolve a próxima linha livre. */
export function writeNote(sheet: Worksheet, row: number, text: string, span: number): number {
  sheet.mergeCells(`A${row}:${columnLetter(span)}${row}`);
  const cell = sheet.getCell(`A${row}`);
  cell.value = text;
  cell.font = { size: 10, italic: true, color: { argb: XLSX_COLORS.muted } };
  cell.alignment = { wrapText: true, vertical: 'top' };
  return row + 1;
}

export type CellValue = string | number | Date | null | { formula: string; result: number };

export interface TableColumn {
  name: string;
  numFmt?: string;
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
  columns.forEach((column, index) => {
    const col = firstCol + index;
    const header = sheet.getCell(row, col);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.carmim } };
    header.alignment = { vertical: 'middle', wrapText: true };
    if (column.numFmt) {
      for (let r = firstRow; r <= lastRow + (withTotals ? 1 : 0); r++) {
        sheet.getCell(r, col).numFmt = column.numFmt;
      }
    }
  });
  if (withTotals) {
    for (let index = 0; index < columns.length; index++) {
      sheet.getCell(lastRow + 1, firstCol + index).font = { bold: true };
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
export function paintStatus(
  sheet: Worksheet,
  row: number,
  col: number,
  tone: 'ok' | 'warn' | 'critical',
) {
  const cell = sheet.getCell(row, col);
  const text =
    tone === 'ok'
      ? XLSX_COLORS.okText
      : tone === 'warn'
        ? XLSX_COLORS.warnText
        : XLSX_COLORS.criticalText;
  const fill =
    tone === 'ok'
      ? XLSX_COLORS.okFill
      : tone === 'warn'
        ? XLSX_COLORS.warnFill
        : XLSX_COLORS.criticalFill;
  cell.font = { bold: true, color: { argb: text } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
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
