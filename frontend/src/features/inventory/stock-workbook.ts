/**
 * Planilha "Banco de Sangue". A primeira aba é um painel de uma página: os
 * números principais, o que precisa de ação e os níveis por tipo. As outras
 * trazem o histórico diário e todas as movimentações (com totais que
 * acompanham o filtro). Carregada só quando o administrador pede o download.
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
  type StockItemView,
  type StockOverview,
} from '@pulso/contracts';
import { apiGet } from '@/lib/api';
import { formatDate, formatDateTime, formatNumber, todayIso } from '@/lib/format';
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
  font,
  generatedAtLabel,
  kpiValueCell,
  paintStatus,
  placeChart,
  setupPrint,
  writeHeader,
  writeHighlights,
  writeKpiCards,
  writeNote,
  writeSection,
  writeTable,
  type Highlight,
  type KpiCard,
} from '@/lib/spreadsheet/workbook';

/** Limite de movimentações na planilha (as páginas são buscadas em sequência). */
const MOVEMENTS_LIMIT = 2000;
const HISTORY_DAYS = 30;

const STATUS_TONE = { NORMAL: 'ok', ATTENTION: 'warn', CRITICAL: 'critical' } as const;
const STATUS_COLOR = { NORMAL: '#1e7f4f', ATTENTION: '#e08a00', CRITICAL: '#d92d20' } as const;

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

const typeNames = (items: StockItemView[]) =>
  items.map((item) => BLOOD_TYPE_LABELS[item.bloodType]).join(', ');

const bags = (count: number) => `${formatNumber(count)} ${count === 1 ? 'bolsa' : 'bolsas'}`;

/** O que precisa de ação, do mais urgente para o menos urgente. */
function stockHighlights(items: StockItemView[]): Highlight[] {
  const byUrgency = (a: StockItemView, b: StockItemView) =>
    a.quantity / (a.ideal || 1) - b.quantity / (b.ideal || 1);
  const highlights: Highlight[] = items
    .filter((item) => item.status === 'CRITICAL')
    .sort(byUrgency)
    .map((item) => ({
      tone: 'critical',
      title: `${BLOOD_TYPE_LABELS[item.bloodType]} crítico:`,
      text: `${bags(item.quantity)}, abaixo do mínimo de ${formatNumber(item.minimum)}. Faltam ${formatNumber(item.minimum - item.quantity)} para o mínimo e ${formatNumber(item.ideal - item.quantity)} para o ideal.`,
    }));
  const attention = items.filter((item) => item.status === 'ATTENTION').sort(byUrgency);
  if (attention.length) {
    highlights.push({
      tone: 'warn',
      title: 'Em atenção:',
      text: `${attention
        .map(
          (item) =>
            `${BLOOD_TYPE_LABELS[item.bloodType]} (faltam ${formatNumber(item.ideal - item.quantity)} para o ideal)`,
        )
        .join(', ')}.`,
    });
  }
  if (!highlights.length) {
    highlights.push({
      tone: 'ok',
      title: 'Nenhuma ação necessária:',
      text: 'todos os tipos estão no nível ideal ou acima.',
    });
  }
  return highlights;
}

export async function buildStockWorkbook(data: StockWorkbookData): Promise<Workbook> {
  const workbook = await createWorkbook('Banco de Sangue — SangueConecta');
  const { overview, history, movements } = data;
  const generated = `Gerado em ${generatedAtLabel()}`;

  // --- Estoque atual (painel de uma página) ---------------------------------------
  const current = addSheet(workbook, 'Estoque atual', [16, 11, 11, 11, 13, 15, 18, 18]);
  setupPrint(current, { orientation: 'portrait', onePage: true });
  let row = writeHeader(workbook, current, {
    title: 'Banco de Sangue: estoque atual',
    details: [
      `Estoque central por tipo sanguíneo · atualizado em ${formatDateTime(overview.updatedAt)}`,
      generated,
    ],
    span: 8,
  });
  const items = BLOOD_TYPES.map((type) => overview.items.find((i) => i.bloodType === type)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
  const withStatus = (status: StockItemView['status']) =>
    items.filter((item) => item.status === status);
  row = writeKpiCards(
    current,
    row,
    [
      {
        label: 'Bolsas em estoque',
        value: overview.totals.quantity,
        numFmt: FORMATS.integer,
        detail: `em ${items.length} tipos sanguíneos`,
      },
      {
        label: 'Tipos críticos',
        value: overview.totals.critical,
        detail: typeNames(withStatus('CRITICAL')) || 'nenhum abaixo do mínimo',
        tone: overview.totals.critical ? 'critical' : 'ok',
      },
      {
        label: 'Em atenção',
        value: overview.totals.attention,
        detail: typeNames(withStatus('ATTENTION')) || 'nenhum abaixo do ideal',
        tone: overview.totals.attention ? 'warn' : 'ok',
      },
      {
        label: 'Adequados',
        value: overview.totals.normal,
        detail: typeNames(withStatus('NORMAL')) || 'nenhum no nível ideal',
        tone: 'ok',
      },
    ],
    8,
  );
  row = writeSection(current, row, 'Ação necessária', 8);
  row = writeHighlights(current, row, stockHighlights(items), 8);
  row = writeSection(current, row, 'Níveis por tipo', 8);
  const first = row + 1;
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
      { name: 'Situação', align: 'center' },
      { name: 'Faltam para o ideal', numFmt: FORMATS.integerDash },
      { name: 'Variação em 7 dias', numFmt: FORMATS.signedArrow },
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
      {
        formula: `MAX(0,D${first + i}-B${first + i})`,
        result: Math.max(0, item.ideal - item.quantity),
      },
      item.trend.delta7d,
    ]),
  );
  items.forEach((item, i) => {
    const r = table.firstRow + i;
    paintStatus(current, r, 6, STATUS_TONE[item.status]);
    current.getCell(r, 1).font = font({ bold: true });
    current.getCell(r, 8).font = font({
      color: {
        argb:
          item.trend.delta7d > 0
            ? XLSX_COLORS.okText
            : item.trend.delta7d < 0
              ? XLSX_COLORS.criticalText
              : XLSX_COLORS.muted,
      },
    });
  });
  if (items.length) {
    addDataBars(current, `B${table.firstRow}:B${table.lastRow}`, BAR_COLORS.azul);
    addTrafficLightScale(current, `E${table.firstRow}:E${table.lastRow}`);
  }
  row = writeNote(
    current,
    table.nextRow - 1,
    'Crítico: abaixo do mínimo. Atenção: entre o mínimo e o ideal. Adequado: a partir do ideal.',
    8,
  );
  placeChart(
    workbook,
    current,
    barChartPng({
      title: 'Bolsas por tipo, com mínimo e ideal',
      subtitle: 'Cor da barra: vermelho crítico, laranja atenção, verde adequado',
      labels: items.map((i) => BLOOD_TYPE_LABELS[i.bloodType]),
      values: items.map((i) => i.quantity),
      colors: items.map((i) => STATUS_COLOR[i.status]),
      markers: [
        { label: 'Mínimo', color: '#1f2328', values: items.map((i) => i.minimum), dashed: true },
        { label: 'Ideal', color: '#215f8f', values: items.map((i) => i.ideal) },
      ],
      width: 820,
      height: 330,
    }),
    { col: 1, row: row + 1 },
    { width: 820, height: 330 },
  );

  // --- Histórico -----------------------------------------------------------------
  // Tabela à esquerda (colunas 1 a 10) e gráfico à direita (a partir da coluna 12).
  const tableSpan = BLOOD_TYPES.length + 2;
  const chartCol = tableSpan + 2;
  const historySheet = addSheet(
    workbook,
    `Histórico ${history.days} dias`,
    [14, ...BLOOD_TYPES.map(() => 9), 12, 3, ...Array.from({ length: 8 }, () => 11)],
    XLSX_COLORS.azul,
  );
  setupPrint(historySheet, { onePage: true });
  const points = history.points;
  row = writeHeader(workbook, historySheet, {
    title: `Saldo no fim de cada dia (últimos ${history.days} dias)`,
    details: [
      `De ${formatDate(points[0]?.date ?? '')} a ${formatDate(points.at(-1)?.date ?? '')}`,
      generated,
    ],
    span: chartCol + 7,
  });
  const lastPoint = points.at(-1);
  if (lastPoint) {
    const firstPoint = points[0];
    const lowest = points.reduce((a, b) => (b.total < a.total ? b : a));
    const highest = points.reduce((a, b) => (b.total > a.total ? b : a));
    const change = lastPoint.total - firstPoint.total;
    const cards: KpiCard[] = [
      {
        label: 'Saldo hoje',
        value: lastPoint.total,
        numFmt: FORMATS.integer,
        detail: `em ${formatDate(lastPoint.date)}`,
      },
      {
        label: 'Início do período',
        value: firstPoint.total,
        numFmt: FORMATS.integer,
        detail: `em ${formatDate(firstPoint.date)}`,
      },
      {
        label: 'Variação',
        value: change,
        numFmt: FORMATS.signed,
        detail: firstPoint.total
          ? `${formatNumber((change / firstPoint.total) * 100, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}% no período`
          : 'no período',
        tone: change > 0 ? 'ok' : change < 0 ? 'critical' : undefined,
      },
      {
        label: 'Menor saldo',
        value: lowest.total,
        numFmt: FORMATS.integer,
        detail: `em ${formatDate(lowest.date)}`,
      },
      {
        label: 'Maior saldo',
        value: highest.total,
        numFmt: FORMATS.integer,
        detail: `em ${formatDate(highest.date)}`,
      },
    ];
    row = writeKpiCards(historySheet, row, cards, tableSpan, 5);
  }
  const historyTable = writeTable(
    historySheet,
    row,
    'Historico',
    [
      { name: 'Data', numFmt: FORMATS.date, align: 'left' },
      ...BLOOD_TYPES.map((t) => ({ name: BLOOD_TYPE_LABELS[t], numFmt: FORMATS.integer })),
      { name: 'Total', numFmt: FORMATS.integer },
    ],
    points.map((p) => [excelDate(p.date), ...BLOOD_TYPES.map((t) => p.values[t] ?? 0), p.total]),
  );
  for (let r = historyTable.firstRow; r <= historyTable.lastRow && points.length; r++) {
    historySheet.getCell(r, tableSpan).font = font({ bold: true });
  }
  historySheet.views = [
    { state: 'frozen', ySplit: historyTable.headerRow, xSplit: 1, showGridLines: false },
  ];
  placeChart(
    workbook,
    historySheet,
    lineChartPng({
      title: 'Total de bolsas em estoque',
      labels: points.map((p) => formatDate(p.date).slice(0, 5)),
      series: [{ name: 'Total', color: '#215f8f', values: points.map((p) => p.total) }],
      width: 640,
      height: 320,
    }),
    { col: chartCol, row: historyTable.headerRow },
    { width: 640, height: 320 },
  );

  // --- Movimentações --------------------------------------------------------------
  const movementsSheet = addSheet(
    workbook,
    'Movimentações',
    [18, 14, 13, 11, 11, 32, 13, 26, 40],
    XLSX_COLORS.marca,
  );
  const note =
    data.movementsTotal > movements.length
      ? [`Mostrando as ${movements.length} movimentações mais recentes de ${data.movementsTotal}.`]
      : [];
  row = writeHeader(workbook, movementsSheet, {
    title: 'Movimentações do estoque',
    details: [...note, generated],
    span: 9,
  });
  const inTotal = movements.filter((m) => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
  const outTotal = movements
    .filter((m) => m.type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0);
  // Cartões (4 linhas) e uma linha de observação antes da tabela.
  const cardsRow = row;
  const tableHeader = cardsRow + 5;
  const firstMovement = tableHeader + 1;
  const lastMovement = tableHeader + Math.max(movements.length, 1);
  // SUBTOTAL ignora as linhas escondidas: os cartões acompanham o filtro da tabela.
  const subtotal = (fn: 103 | 109, column: string, result: number) =>
    movements.length
      ? {
          formula: `SUBTOTAL(${fn},${column}${firstMovement}:${column}${lastMovement})`,
          result,
        }
      : result;
  writeKpiCards(
    movementsSheet,
    cardsRow,
    [
      {
        label: 'Entradas (bolsas)',
        value: subtotal(109, 'D', inTotal),
        numFmt: FORMATS.integer,
        tone: 'ok',
      },
      {
        label: 'Saídas (bolsas)',
        value: subtotal(109, 'E', outTotal),
        numFmt: FORMATS.integer,
        tone: 'critical',
      },
      {
        label: 'Saldo das movimentações',
        value: {
          formula: `${kpiValueCell(cardsRow, 0, 9)}-${kpiValueCell(cardsRow, 1, 9)}`,
          result: inTotal - outTotal,
        },
        numFmt: FORMATS.signed,
      },
      {
        label: 'Movimentações',
        value: subtotal(103, 'A', movements.length),
        numFmt: FORMATS.integer,
      },
    ],
    9,
  );
  writeNote(
    movementsSheet,
    tableHeader - 1,
    'Filtre a tabela pelo cabeçalho (tipo sanguíneo, movimento, motivo…): os totais acima acompanham o filtro.',
    9,
  );
  const movementsTable = writeTable(
    movementsSheet,
    tableHeader,
    'Movimentacoes',
    [
      { name: 'Data e hora', numFmt: FORMATS.dateTime, align: 'left' },
      { name: 'Tipo sanguíneo', align: 'center' },
      { name: 'Movimento' },
      { name: 'Entrada', numFmt: FORMATS.integer, align: 'center' },
      { name: 'Saída', numFmt: FORMATS.integer, align: 'center' },
      { name: 'Motivo' },
      { name: 'Saldo depois', numFmt: FORMATS.integer, align: 'center' },
      { name: 'Responsável' },
      { name: 'Observações' },
    ],
    movements.map((m) => [
      excelDateTime(m.occurredAt),
      BLOOD_TYPE_LABELS[m.bloodType],
      MOVEMENT_TYPE_LABELS[m.type],
      m.type === 'IN' ? m.quantity : null,
      m.type === 'OUT' ? m.quantity : null,
      MOVEMENTS_REASON_LABEL[m.reason] ?? m.reason,
      m.balanceAfter,
      m.responsibleName,
      m.notes ?? '',
    ]),
  );
  movements.forEach((m, i) => {
    const color = { argb: m.type === 'IN' ? XLSX_COLORS.okText : XLSX_COLORS.criticalText };
    const r = movementsTable.firstRow + i;
    movementsSheet.getCell(r, 3).font = font({ bold: true, color });
    movementsSheet.getCell(r, m.type === 'IN' ? 4 : 5).font = font({ bold: true, color });
  });
  movementsSheet.views = [
    { state: 'frozen', ySplit: movementsTable.headerRow, showGridLines: false },
  ];
  setupPrint(movementsSheet, { repeatRow: movementsTable.headerRow });

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
