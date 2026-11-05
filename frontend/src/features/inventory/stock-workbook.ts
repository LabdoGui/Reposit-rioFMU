/**
 * Planilha "Banco de Sangue": estoque atual com situação colorida e % do ideal,
 * histórico diário por tipo e todas as movimentações (com totais de entradas e
 * saídas). Carregada só quando o administrador pede o download.
 */
import type { Workbook } from 'exceljs';
import {
  BLOOD_TYPES,
  BLOOD_TYPE_LABELS,
  MOVEMENT_REASONS,
  MOVEMENT_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  type MovementView,
  type Paginated,
  type StockHistoryResponse,
  type StockOverview,
} from '@pulso/contracts';
import { apiGet } from '@/lib/api';
import { formatDate, formatDateTime, todayIso } from '@/lib/format';
import { barChartPng, lineChartPng } from '@/lib/spreadsheet/charts';
import {
  FORMATS,
  XLSX_COLORS,
  BAR_COLORS,
  addDataBars,
  addSheet,
  addTrafficLightScale,
  createWorkbook,
  downloadWorkbook,
  excelDate,
  excelDateTime,
  generatedAtLabel,
  paintStatus,
  placeChart,
  writeHeader,
  writeSection,
  writeTable,
} from '@/lib/spreadsheet/workbook';

/** Limite de movimentações na planilha (as páginas são buscadas em sequência). */
const MOVEMENTS_LIMIT = 2000;
const HISTORY_DAYS = 30;

const STATUS_TONE = { NORMAL: 'ok', ATTENTION: 'warn', CRITICAL: 'critical' } as const;
const STATUS_COLOR = { NORMAL: '#1e7f4f', ATTENTION: '#e08a00', CRITICAL: '#d92d20' } as const;
const TREND_ARROW = { UP: '▲ subindo', DOWN: '▼ caindo', STABLE: '= estável' } as const;

export interface StockWorkbookData {
  overview: StockOverview;
  history: StockHistoryResponse;
  movements: MovementView[];
  movementsTotal: number;
}

async function fetchMovements(): Promise<{ items: MovementView[]; total: number }> {
  const items: MovementView[] = [];
  let total = 0;
  for (let page = 1; items.length < MOVEMENTS_LIMIT; page++) {
    const result = await apiGet<Paginated<MovementView>>(
      `/blood-inventory/movements?page=${page}&pageSize=100`,
    );
    items.push(...result.items);
    total = result.total;
    if (page * result.pageSize >= result.total) break;
  }
  return { items: items.slice(0, MOVEMENTS_LIMIT), total };
}

export async function fetchStockWorkbookData(): Promise<StockWorkbookData> {
  const [overview, history, movements] = await Promise.all([
    apiGet<StockOverview>('/blood-inventory'),
    apiGet<StockHistoryResponse>(`/blood-inventory/history?days=${HISTORY_DAYS}`),
    fetchMovements(),
  ]);
  return { overview, history, movements: movements.items, movementsTotal: movements.total };
}

export async function buildStockWorkbook(data: StockWorkbookData): Promise<Workbook> {
  const workbook = await createWorkbook('Banco de Sangue — SangueConecta');
  const { overview, history, movements } = data;
  const generated = `Gerado em ${generatedAtLabel()}`;

  // --- Estoque atual -------------------------------------------------------------
  const current = addSheet(workbook, 'Estoque atual', [16, 12, 12, 12, 14, 16, 18, 16]);
  let row = writeHeader(workbook, current, {
    title: 'Banco de Sangue: estoque atual',
    details: [
      `Estoque central por tipo sanguíneo · atualizado em ${formatDateTime(overview.updatedAt)}`,
      generated,
    ],
    span: 8,
  });
  row = writeSection(current, row, 'Resumo', 8);
  const summary: Array<[string, number, 'ok' | 'warn' | 'critical' | null]> = [
    ['Total em estoque (bolsas)', overview.totals.quantity, null],
    ['Tipos críticos (abaixo do mínimo)', overview.totals.critical, 'critical'],
    ['Tipos em atenção (entre o mínimo e o ideal)', overview.totals.attention, 'warn'],
    ['Tipos adequados (a partir do ideal)', overview.totals.normal, 'ok'],
  ];
  for (const [label, value, tone] of summary) {
    current.mergeCells(`A${row}:D${row}`);
    current.getCell(`A${row}`).value = label;
    current.getCell(`A${row}`).font = { color: { argb: XLSX_COLORS.muted } };
    const cell = current.getCell(`E${row}`);
    cell.value = value;
    cell.numFmt = FORMATS.integer;
    cell.font = { bold: true, size: 13 };
    if (tone) paintStatus(current, row, 5, tone);
    row++;
  }
  row += 1;
  row = writeSection(current, row, 'Níveis por tipo', 8);
  const first = row + 1;
  const items = BLOOD_TYPES.map((type) => overview.items.find((i) => i.bloodType === type)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
  const table = writeTable(
    current,
    row,
    'EstoqueAtual',
    [
      { name: 'Tipo sanguíneo', total: { label: 'Total' } },
      {
        name: 'Bolsas',
        numFmt: FORMATS.integer,
        total: { fn: 'sum', result: overview.totals.quantity },
      },
      { name: 'Mínimo', numFmt: FORMATS.integer },
      { name: 'Ideal', numFmt: FORMATS.integer },
      { name: '% do ideal', numFmt: FORMATS.percent },
      { name: 'Situação' },
      { name: 'Variação 7 dias', numFmt: FORMATS.signed },
      { name: 'Tendência' },
    ],
    items.map((item, i) => [
      BLOOD_TYPE_LABELS[item.bloodType],
      item.quantity,
      item.minimum,
      item.ideal,
      {
        formula: `IF(D${first + i}=0,0,B${first + i}/D${first + i})`,
        result: item.ideal ? item.quantity / item.ideal : 0,
      },
      STOCK_STATUS_LABELS[item.status],
      item.trend.delta7d,
      TREND_ARROW[item.trend.direction],
    ]),
  );
  items.forEach((item, i) => {
    const r = table.firstRow + i;
    paintStatus(current, r, 6, STATUS_TONE[item.status]);
    const delta = current.getCell(r, 7);
    delta.font = {
      color: {
        argb:
          item.trend.delta7d > 0
            ? XLSX_COLORS.okText
            : item.trend.delta7d < 0
              ? XLSX_COLORS.criticalText
              : XLSX_COLORS.muted,
      },
    };
  });
  if (items.length) {
    addDataBars(current, `B${table.firstRow}:B${table.lastRow}`, BAR_COLORS.azul);
    addTrafficLightScale(current, `E${table.firstRow}:E${table.lastRow}`);
  }
  current.views = [{ state: 'frozen', ySplit: table.headerRow, showGridLines: false }];
  row = table.nextRow;
  placeChart(
    workbook,
    current,
    barChartPng({
      title: 'Bolsas por tipo, com mínimo e ideal',
      labels: items.map((i) => BLOOD_TYPE_LABELS[i.bloodType]),
      values: items.map((i) => i.quantity),
      colors: items.map((i) => STATUS_COLOR[i.status]),
      markers: [
        { label: 'Mínimo', color: '#1f2328', values: items.map((i) => i.minimum), dashed: true },
        { label: 'Ideal', color: '#215f8f', values: items.map((i) => i.ideal) },
      ],
    }),
    { col: 1, row },
    { width: 720, height: 340 },
  );

  // --- Histórico -----------------------------------------------------------------
  const historySheet = addSheet(
    workbook,
    `Histórico ${history.days} dias`,
    [14, ...BLOOD_TYPES.map(() => 9), 12],
    XLSX_COLORS.azul,
  );
  const span = BLOOD_TYPES.length + 2;
  row = writeHeader(workbook, historySheet, {
    title: `Saldo no fim de cada dia (últimos ${history.days} dias)`,
    details: [
      `De ${formatDate(history.points[0]?.date ?? '')} a ${formatDate(history.points.at(-1)?.date ?? '')}`,
      generated,
    ],
    span,
  });
  const historyTable = writeTable(
    historySheet,
    row,
    'Historico',
    [
      { name: 'Data', numFmt: FORMATS.date },
      ...BLOOD_TYPES.map((t) => ({ name: BLOOD_TYPE_LABELS[t], numFmt: FORMATS.integer })),
      { name: 'Total', numFmt: FORMATS.integer },
    ],
    history.points.map((p) => [
      excelDate(p.date),
      ...BLOOD_TYPES.map((t) => p.values[t] ?? 0),
      p.total,
    ]),
  );
  historySheet.views = [
    { state: 'frozen', ySplit: historyTable.headerRow, xSplit: 1, showGridLines: false },
  ];
  placeChart(
    workbook,
    historySheet,
    lineChartPng({
      title: 'Total de bolsas em estoque',
      labels: history.points.map((p) => formatDate(p.date).slice(0, 5)),
      series: [{ name: 'Total', color: '#215f8f', values: history.points.map((p) => p.total) }],
    }),
    { col: 1, row: historyTable.nextRow },
    { width: 720, height: 320 },
  );

  // --- Movimentações --------------------------------------------------------------
  const movementsSheet = addSheet(
    workbook,
    'Movimentações',
    [18, 14, 12, 12, 34, 14, 26, 36],
    XLSX_COLORS.marca,
  );
  const note =
    data.movementsTotal > movements.length
      ? [`Mostrando as ${movements.length} movimentações mais recentes de ${data.movementsTotal}.`]
      : [];
  row = writeHeader(workbook, movementsSheet, {
    title: 'Movimentações do estoque',
    details: [...note, generated],
    span: 8,
  });
  const inTotal = movements.filter((m) => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
  const outTotal = movements
    .filter((m) => m.type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0);
  const tableHeader = row + 5;
  const firstMovement = tableHeader + 1;
  const lastMovement = tableHeader + Math.max(movements.length, 1);
  row = writeSection(movementsSheet, row, 'Totais (consideram as linhas listadas abaixo)', 8);
  const totals: Array<[string, { formula: string; result: number }, string]> = [
    [
      'Entradas (bolsas)',
      {
        formula: `SUMIFS(D${firstMovement}:D${lastMovement},C${firstMovement}:C${lastMovement},"Entrada")`,
        result: inTotal,
      },
      XLSX_COLORS.okText,
    ],
    [
      'Saídas (bolsas)',
      {
        formula: `SUMIFS(D${firstMovement}:D${lastMovement},C${firstMovement}:C${lastMovement},"Saída")`,
        result: outTotal,
      },
      XLSX_COLORS.criticalText,
    ],
    [
      'Saldo das movimentações',
      { formula: `B${row}-B${row + 1}`, result: inTotal - outTotal },
      XLSX_COLORS.ink,
    ],
  ];
  for (const [label, value, color] of totals) {
    movementsSheet.getCell(`A${row}`).value = label;
    movementsSheet.getCell(`A${row}`).font = { color: { argb: XLSX_COLORS.muted } };
    const cell = movementsSheet.getCell(`B${row}`);
    cell.value = value;
    cell.numFmt = label.startsWith('Saldo') ? FORMATS.signed : FORMATS.integer;
    cell.font = { bold: true, color: { argb: color } };
    row++;
  }
  const movementsTable = writeTable(
    movementsSheet,
    tableHeader,
    'Movimentacoes',
    [
      { name: 'Data e hora', numFmt: FORMATS.dateTime },
      { name: 'Tipo sanguíneo' },
      { name: 'Movimento' },
      { name: 'Quantidade', numFmt: FORMATS.integer },
      { name: 'Motivo' },
      { name: 'Saldo depois', numFmt: FORMATS.integer },
      { name: 'Responsável' },
      { name: 'Observações' },
    ],
    movements.map((m) => [
      excelDateTime(m.occurredAt),
      BLOOD_TYPE_LABELS[m.bloodType],
      MOVEMENT_TYPE_LABELS[m.type],
      m.quantity,
      MOVEMENTS_REASON_LABEL[m.reason] ?? m.reason,
      m.balanceAfter,
      m.responsibleName,
      m.notes ?? '',
    ]),
  );
  movements.forEach((m, i) => {
    movementsSheet.getCell(movementsTable.firstRow + i, 3).font = {
      bold: true,
      color: { argb: m.type === 'IN' ? XLSX_COLORS.okText : XLSX_COLORS.criticalText },
    };
  });
  movementsSheet.views = [
    { state: 'frozen', ySplit: movementsTable.headerRow, showGridLines: false },
  ];

  return workbook;
}

const MOVEMENTS_REASON_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(MOVEMENT_REASONS).map(([code, { label }]) => [code, label]),
);

export async function downloadStockWorkbook(): Promise<void> {
  const data = await fetchStockWorkbookData();
  const workbook = await buildStockWorkbook(data);
  await downloadWorkbook(workbook, `sangueconecta-banco-de-sangue-${todayIso()}.xlsx`);
}
