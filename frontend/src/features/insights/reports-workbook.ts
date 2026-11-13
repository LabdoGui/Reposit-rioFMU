/**
 * Planilha "Relatório SangueConecta". A primeira aba é um painel de uma página:
 * os números principais, os destaques do período em frases curtas e os
 * gráficos. As outras trazem o detalhe: doações, movimento por dia, unidade,
 * tipo sanguíneo, agendamentos, triagens e engajamento. Carregada só quando o
 * administrador pede o download.
 */
import type { Workbook } from 'exceljs';
import {
  APPOINTMENT_STATUS_LABELS,
  BLOOD_TYPES,
  BLOOD_TYPE_LABELS,
  DONATION_STATUS_LABELS,
  PRE_SCREENING_RESULT_LABELS,
  SCREENING_RESULT_LABELS,
  STOCK_STATUS_LABELS,
  type AdminDonationItem,
  type AppointmentStatus,
  type DashboardStatistics,
  type StatsFilters,
  type StockStatus,
} from '@pulso/contracts';
import { formatDate, formatNumber } from '@/lib/format';
import { barChartPng, lineChartPng } from '@/lib/spreadsheet/charts';
import {
  FORMATS,
  XLSX_COLORS,
  BAR_COLORS,
  addDataBars,
  addSheet,
  createWorkbook,
  downloadWorkbook,
  excelDate,
  excelDateTime,
  font,
  freezeHeader,
  generatedAtLabel,
  paintStatus,
  placeChart,
  setupPrint,
  shareFormula,
  writeCompactHeader,
  writeHeader,
  writeHighlights,
  writeKpiCards,
  writeSection,
  writeTable,
  type Highlight,
  type KpiCard,
} from '@/lib/spreadsheet/workbook';

export interface ReportsWorkbookInput {
  filters: StatsFilters;
  labels: { unit: string; bloodType: string; status: string };
  stats: DashboardStatistics | undefined;
  donations: AdminDonationItem[];
  /** Total de doações nos filtros (a exportação traz até o limite). */
  donationsTotal: number;
}

const SERVICE_LABELS: Record<string, string> = {
  identity: 'cadastro (identity)',
  scheduling: 'agendamentos (scheduling)',
  clinical: 'atendimentos (clinical)',
  inventory: 'estoque (inventory)',
  engagement: 'engajamento (engagement)',
};

const STATUS_TONE = { NORMAL: 'ok', ATTENTION: 'warn', CRITICAL: 'critical' } as const;

/** Colunas do painel de resumo (todas da mesma largura, para alinhar cartões e gráficos). */
const SUMMARY_COLUMNS = 12;
/** Colunas à direita de uma tabela, reservadas para o gráfico (a faixa do título cobre as duas). */
const CHART_COLUMNS = Array.from({ length: 9 }, () => 10);

function periodLine(input: ReportsWorkbookInput) {
  const { filters, labels } = input;
  return `Período: ${formatDate(filters.from)} a ${formatDate(filters.to)} · Unidade: ${labels.unit} · Tipo sanguíneo: ${labels.bloodType}`;
}

function details(input: ReportsWorkbookInput, extra: string[] = []) {
  return [periodLine(input), ...extra, `Gerado em ${generatedAtLabel()}`];
}

/** Todas as datas do período (inclusive), para as séries diárias não terem buracos. */
function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && days.length < 400; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

const percent = (value: number) =>
  formatNumber(value, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

/** Os números principais do período (só dos serviços que responderam). */
function summaryCards(stats: DashboardStatistics | undefined): KpiCard[] {
  const cards: KpiCard[] = [];
  const clinical = stats?.clinical;
  const scheduling = stats?.scheduling;
  const identity = stats?.identity;
  const inventory = stats?.inventory;
  const engagement = stats?.engagement;
  if (clinical) {
    cards.push({
      label: 'Doações concluídas',
      value: clinical.donationsCompleted,
      numFmt: FORMATS.integer,
      detail: `${formatNumber(clinical.volumeMl / 1000, { maximumFractionDigits: 1 })} L coletados`,
    });
  }
  if (scheduling) {
    cards.push({
      label: 'Comparecimento',
      value: scheduling.attendanceRate,
      numFmt: FORMATS.percent,
      detail: `${plural(scheduling.byStatus.NO_SHOW, 'falta', 'faltas')} no período`,
    });
    cards.push({
      label: 'Agendamentos',
      value: scheduling.appointmentsTotal,
      numFmt: FORMATS.integer,
      detail: `${plural(scheduling.upcoming, 'próximo agendado', 'próximos agendados')}`,
    });
  }
  if (identity) {
    cards.push({
      label: 'Novos doadores',
      value: identity.donorsNewInPeriod,
      numFmt: FORMATS.integer,
      detail: `${formatNumber(identity.donorsTotal)} cadastrados no total`,
    });
  }
  if (inventory) {
    cards.push({
      label: 'Bolsas em estoque',
      value: inventory.totalBags,
      numFmt: FORMATS.integer,
      detail: `${plural(inventory.byStatus.CRITICAL, 'tipo crítico', 'tipos críticos')} · ${formatNumber(inventory.byStatus.ATTENTION)} em atenção`,
      tone: inventory.byStatus.CRITICAL ? 'critical' : inventory.byStatus.ATTENTION ? 'warn' : 'ok',
    });
  }
  if (clinical) {
    cards.push({
      label: 'Atendimentos finalizados',
      value: clinical.attendances,
      numFmt: FORMATS.integer,
      detail: `${plural(clinical.donationsNotCompleted, 'doação não concluída', 'doações não concluídas')}`,
    });
  }
  if (scheduling) {
    cards.push({
      label: 'Unidades ativas',
      value: scheduling.activeUnits,
      numFmt: FORMATS.integer,
      detail: 'unidades de coleta',
    });
  }
  if (engagement) {
    cards.push({
      label: 'Pontos concedidos',
      value: engagement.pointsAwarded,
      numFmt: FORMATS.integer,
      detail: `${plural(engagement.achievementsUnlocked, 'conquista desbloqueada', 'conquistas desbloqueadas')}`,
    });
  }
  return cards;
}

/** O que o período mostrou, em frases curtas (o que a pessoa leria primeiro). */
function summaryHighlights(stats: DashboardStatistics | undefined): Highlight[] {
  const highlights: Highlight[] = [];
  const clinical = stats?.clinical;
  const scheduling = stats?.scheduling;
  const inventory = stats?.inventory;
  if (inventory) {
    const names = (status: StockStatus) =>
      inventory.levels
        .filter((level) => level.status === status)
        .map((level) => BLOOD_TYPE_LABELS[level.bloodType])
        .join(', ');
    const critical = names('CRITICAL');
    const attention = names('ATTENTION');
    if (critical) {
      highlights.push({
        tone: 'critical',
        title: 'Estoque crítico:',
        text: `${critical} abaixo do mínimo.${attention ? ` Em atenção: ${attention}.` : ''}`,
      });
    } else if (attention) {
      highlights.push({
        tone: 'warn',
        title: 'Estoque em atenção:',
        text: `${attention} abaixo do nível ideal.`,
      });
    } else {
      highlights.push({
        tone: 'ok',
        title: 'Estoque adequado:',
        text: 'todos os tipos estão no nível ideal ou acima.',
      });
    }
  }
  if (clinical) {
    const sentences: string[] = [];
    if (clinical.donationsCompleted) {
      sentences.push(
        `${plural(clinical.donationsCompleted, 'concluída', 'concluídas')} no período (${formatNumber(clinical.volumeMl / 1000, { maximumFractionDigits: 1 })} L)`,
      );
      const topUnit = [...clinical.byUnit].sort((a, b) => b.count - a.count)[0];
      if (topUnit?.count) {
        sentences.push(`Unidade com mais doações: ${topUnit.unitName} (${topUnit.count})`);
      }
      const topType = [...clinical.byBloodType].sort((a, b) => b.count - a.count)[0];
      if (topType?.count) {
        sentences.push(
          `Tipo mais doado: ${BLOOD_TYPE_LABELS[topType.bloodType]} (${topType.count})`,
        );
      }
    } else {
      sentences.push('nenhuma doação concluída no período');
    }
    highlights.push({ title: 'Doações:', text: `${sentences.join('. ')}.` });
  }
  if (scheduling && scheduling.attendanceRate !== null) {
    highlights.push({
      title: 'Comparecimento:',
      text: `${percent(scheduling.attendanceRate)} de presença, com ${plural(scheduling.byStatus.NO_SHOW, 'falta', 'faltas')} e ${plural(scheduling.byStatus.CANCELLED, 'cancelamento', 'cancelamentos')} no período.`,
    });
  }
  if (inventory) {
    const balance = inventory.movementsIn - inventory.movementsOut;
    highlights.push({
      title: 'Movimentação do estoque:',
      text: `${plural(inventory.movementsIn, 'bolsa entrou', 'bolsas entraram')} e ${plural(inventory.movementsOut, 'saiu', 'saíram')} no período (saldo de ${formatNumber(balance, { signDisplay: 'exceptZero' })}).`,
    });
  }
  if (stats?.unavailable.length) {
    highlights.push({
      tone: 'warn',
      title: 'Dados incompletos:',
      text: `sem resposta no momento da geração de ${stats.unavailable.map((s) => SERVICE_LABELS[s] ?? s).join(', ')}. As abas desses dados ficaram de fora.`,
    });
  }
  return highlights;
}

/** Tabela "rótulo | quantidade | % do total" com barras de dados e gráfico ao lado. */
function shareSheet(
  workbook: Workbook,
  name: string,
  heading: string,
  input: ReportsWorkbookInput,
  columns: [string, string],
  rows: Array<[string, number]>,
  color: string,
  barColor: string,
) {
  const sheet = addSheet(workbook, name, [34, 16, 14, 3, ...CHART_COLUMNS]);
  setupPrint(sheet, { onePage: true });
  let row = writeHeader(workbook, sheet, {
    title: heading,
    details: details(input),
    span: 4 + CHART_COLUMNS.length,
  });
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  const first = row + 1;
  const last = row + rows.length;
  const placement = writeTable(
    sheet,
    row,
    name.replace(/[^A-Za-z]/g, ''),
    [
      { name: columns[0], total: { label: 'Total' } },
      { name: columns[1], numFmt: FORMATS.integer, total: { fn: 'sum', result: total } },
      { name: '% do total', numFmt: FORMATS.percent },
    ],
    rows.map(([label, value], i) => [
      label,
      value,
      shareFormula(`B${first + i}`, `B$${first}:B$${last}`, value, total),
    ]),
  );
  if (rows.length) addDataBars(sheet, `B${first}:B${last}`, barColor);
  row = placement.nextRow;
  placeChart(
    workbook,
    sheet,
    barChartPng({
      title: heading,
      labels: rows.map(([label]) => label),
      values: rows.map(([, v]) => v),
      color,
      width: 640,
      height: 310,
    }),
    { col: 5, row: placement.headerRow },
    { width: 640, height: 310 },
  );
  return row;
}

export async function buildReportsWorkbook(input: ReportsWorkbookInput): Promise<Workbook> {
  const workbook = await createWorkbook('Relatório SangueConecta');
  const { stats } = input;
  const clinical = stats?.clinical;
  const scheduling = stats?.scheduling;
  const identity = stats?.identity;
  const inventory = stats?.inventory;
  const engagement = stats?.engagement;

  const days = daysBetween(input.filters.from, input.filters.to);
  const byDay = (series: Array<{ date: string; count: number }> | undefined) => {
    const map = new Map((series ?? []).map((p) => [p.date, p.count]));
    return days.map((d) => map.get(d) ?? 0);
  };
  const dailyChart = (width: number, height: number) =>
    clinical || scheduling
      ? lineChartPng({
          title: 'Doações e agendamentos por dia',
          labels: days.map((d) => formatDate(d).slice(0, 5)),
          series: [
            ...(clinical
              ? [{ name: 'Doações concluídas', color: '#d30a04', values: byDay(clinical.byDay) }]
              : []),
            ...(scheduling
              ? [{ name: 'Agendamentos', color: '#215f8f', values: byDay(scheduling.byDay) }]
              : []),
          ],
          width,
          height,
        })
      : null;

  // --- Resumo (painel de uma página) ----------------------------------------------
  const summary = addSheet(
    workbook,
    'Resumo',
    Array.from({ length: SUMMARY_COLUMNS }, () => 11),
  );
  setupPrint(summary, { orientation: 'portrait', onePage: true });
  let row = writeHeader(workbook, summary, {
    title: 'Relatório SangueConecta',
    details: details(input),
    span: SUMMARY_COLUMNS,
  });
  row = writeKpiCards(summary, row, summaryCards(stats), SUMMARY_COLUMNS);
  const highlights = summaryHighlights(stats);
  if (highlights.length) {
    row = writeSection(summary, row, 'Destaques do período', SUMMARY_COLUMNS);
    row = writeHighlights(summary, row, highlights, SUMMARY_COLUMNS);
  }
  row = writeSection(summary, row, 'Gráficos', SUMMARY_COLUMNS);
  // Um gráfico na largura toda e dois lado a lado (cada coluna do painel tem 82 px).
  const daily = dailyChart(980, 300);
  if (daily) {
    placeChart(workbook, summary, daily, { col: 1, row: row + 1 }, { width: 980, height: 300 });
    row += 14;
  }
  const halves: Array<string | null> = [];
  if (clinical?.byBloodType.length) {
    const map = new Map(clinical.byBloodType.map((r) => [r.bloodType, r.count]));
    halves.push(
      barChartPng({
        title: 'Doações por tipo sanguíneo',
        labels: BLOOD_TYPES.map((t) => BLOOD_TYPE_LABELS[t]),
        values: BLOOD_TYPES.map((t) => map.get(t) ?? 0),
        color: '#a3123a',
        width: 486,
        height: 290,
      }),
    );
  }
  if (inventory?.levels.length) {
    halves.push(
      barChartPng({
        title: 'Estoque atual por tipo (bolsas)',
        subtitle: 'Vermelho: crítico · laranja: atenção · verde: adequado',
        labels: inventory.levels.map((l) => BLOOD_TYPE_LABELS[l.bloodType]),
        values: inventory.levels.map((l) => l.quantity),
        colors: inventory.levels.map((l) =>
          l.status === 'CRITICAL' ? '#d92d20' : l.status === 'ATTENTION' ? '#e08a00' : '#1e7f4f',
        ),
        width: 486,
        height: 290,
      }),
    );
  }
  halves.forEach((png, i) => {
    placeChart(
      workbook,
      summary,
      png,
      { col: 1 + i * (SUMMARY_COLUMNS / 2), row: row + 1 },
      { width: 486, height: 290 },
    );
  });

  // --- Doações ------------------------------------------------------------------
  const donationsSheet = addSheet(
    workbook,
    'Doações',
    [18, 14, 20, 15, 13, 40, 30],
    XLSX_COLORS.marca,
  );
  const truncatedNote =
    input.donationsTotal > input.donations.length
      ? [
          `Mostrando ${input.donations.length} de ${input.donationsTotal} doações (limite da exportação).`,
        ]
      : [];
  // Uma linha só acima da tabela: ela fica congelada junto com o cabeçalho.
  row = writeCompactHeader(workbook, donationsSheet, {
    title: 'Doações',
    context: details(input, [`Situação: ${input.labels.status}`, ...truncatedNote]),
    span: 7,
  });
  const totalVolume = input.donations.reduce((sum, d) => sum + d.volumeMl, 0);
  const donationsTable = writeTable(
    donationsSheet,
    row,
    'Doacoes',
    [
      { name: 'Data e hora', numFmt: FORMATS.dateTime, align: 'left', total: { label: 'Total' } },
      { name: 'Código', total: { fn: 'count', result: input.donations.length } },
      { name: 'Situação' },
      { name: 'Tipo sanguíneo', align: 'center' },
      {
        name: 'Volume (mL)',
        numFmt: FORMATS.integer,
        align: 'center',
        total: { fn: 'sum', result: totalVolume },
      },
      { name: 'Unidade' },
      { name: 'Campanha' },
    ],
    input.donations.map((d) => [
      excelDateTime(d.occurredAt),
      d.code,
      DONATION_STATUS_LABELS[d.status],
      BLOOD_TYPE_LABELS[d.bloodType],
      d.volumeMl,
      d.unitName,
      d.campaignTitle ?? '—',
    ]),
  );
  input.donations.forEach((d, i) => {
    if (d.status === 'NOT_COMPLETED') {
      donationsSheet.getCell(donationsTable.firstRow + i, 3).font = font({
        bold: true,
        color: { argb: XLSX_COLORS.criticalText },
      });
    }
  });
  if (input.donations.length) freezeHeader(donationsSheet, donationsTable.headerRow);
  setupPrint(donationsSheet, { repeatRow: donationsTable.headerRow });

  // --- Por dia --------------------------------------------------------------------
  if (clinical || scheduling || identity) {
    const dailySheet = addSheet(
      workbook,
      'Por dia',
      [14, 18, 16, 16, 3, ...CHART_COLUMNS],
      XLSX_COLORS.azul,
    );
    row = writeCompactHeader(workbook, dailySheet, {
      title: 'Movimento por dia',
      context: details(input),
      span: 5 + CHART_COLUMNS.length,
    });
    const donationsByDay = byDay(clinical?.byDay);
    const appointmentsByDay = byDay(scheduling?.byDay);
    const newDonorsByDay = byDay(identity?.newDonorsByDay);
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    // Dias sem movimento mostram um traço: os dias com números saltam à vista.
    const table = writeTable(
      dailySheet,
      row,
      'PorDia',
      [
        { name: 'Data', numFmt: FORMATS.date, align: 'left', total: { label: 'Total' } },
        {
          name: 'Doações concluídas',
          numFmt: FORMATS.integerDash,
          align: 'center',
          total: { fn: 'sum', result: sum(donationsByDay) },
        },
        {
          name: 'Agendamentos',
          numFmt: FORMATS.integerDash,
          align: 'center',
          total: { fn: 'sum', result: sum(appointmentsByDay) },
        },
        {
          name: 'Novos doadores',
          numFmt: FORMATS.integerDash,
          align: 'center',
          total: { fn: 'sum', result: sum(newDonorsByDay) },
        },
      ],
      days.map((d, i) => [
        excelDate(d),
        donationsByDay[i],
        appointmentsByDay[i],
        newDonorsByDay[i],
      ]),
    );
    freezeHeader(dailySheet, table.headerRow);
    // Períodos curtos cabem em uma página; nos longos, o cabeçalho se repete em cada página.
    setupPrint(dailySheet, days.length <= 45 ? { onePage: true } : { repeatRow: table.headerRow });
    // O gráfico começa uma linha abaixo do cabeçalho, para não ser repetido junto com ele.
    placeChart(
      workbook,
      dailySheet,
      dailyChart(640, 310),
      { col: 6, row: table.firstRow },
      { width: 640, height: 310 },
    );
  }

  // --- Por unidade e por tipo -----------------------------------------------------------
  if (clinical) {
    shareSheet(
      workbook,
      'Por unidade',
      'Doações por unidade',
      input,
      ['Unidade', 'Doações'],
      [...clinical.byUnit].sort((a, b) => b.count - a.count).map((r) => [r.unitName, r.count]),
      XLSX_COLORS.azul,
      BAR_COLORS.azul,
    );

    const typeSheet = addSheet(
      workbook,
      'Por tipo sanguíneo',
      [18, 18, 14, 18, 20],
      XLSX_COLORS.carmim,
    );
    setupPrint(typeSheet, { orientation: 'portrait', onePage: true });
    row = writeHeader(workbook, typeSheet, {
      title: 'Doações e estoque por tipo sanguíneo',
      details: details(input),
      span: 5,
    });
    const donationsByType = new Map(clinical.byBloodType.map((r) => [r.bloodType, r.count]));
    const stockByType = new Map((inventory?.levels ?? []).map((l) => [l.bloodType, l]));
    const total = BLOOD_TYPES.reduce((sum, t) => sum + (donationsByType.get(t) ?? 0), 0);
    const first = row + 1;
    const last = row + BLOOD_TYPES.length;
    const totalStock = (inventory?.levels ?? []).reduce((sum, l) => sum + l.quantity, 0);
    const table = writeTable(
      typeSheet,
      row,
      'PorTipo',
      [
        { name: 'Tipo sanguíneo', total: { label: 'Total' } },
        {
          name: 'Doações no período',
          numFmt: FORMATS.integer,
          total: { fn: 'sum', result: total },
        },
        { name: '% do total', numFmt: FORMATS.percent },
        {
          name: 'Bolsas em estoque',
          numFmt: FORMATS.integer,
          total: { fn: 'sum', result: totalStock },
        },
        { name: 'Situação do estoque', align: 'center' },
      ],
      BLOOD_TYPES.map((t, i) => {
        const count = donationsByType.get(t) ?? 0;
        const stock = stockByType.get(t);
        return [
          BLOOD_TYPE_LABELS[t],
          count,
          shareFormula(`B${first + i}`, `B$${first}:B$${last}`, count, total),
          stock?.quantity ?? null,
          stock ? STOCK_STATUS_LABELS[stock.status] : '—',
        ];
      }),
    );
    BLOOD_TYPES.forEach((t, i) => {
      const stock = stockByType.get(t);
      typeSheet.getCell(table.firstRow + i, 1).font = font({ bold: true });
      if (stock) paintStatus(typeSheet, table.firstRow + i, 5, STATUS_TONE[stock.status]);
    });
    addDataBars(typeSheet, `B${first}:B${last}`, BAR_COLORS.carmim);
    addDataBars(typeSheet, `D${first}:D${last}`, BAR_COLORS.azul);
  }

  // --- Agendamentos -------------------------------------------------------------------------
  if (scheduling) {
    shareSheet(
      workbook,
      'Agendamentos',
      'Agendamentos por situação',
      input,
      ['Situação', 'Agendamentos'],
      (Object.entries(scheduling.byStatus) as Array<[AppointmentStatus, number]>)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => [APPOINTMENT_STATUS_LABELS[status], count]),
      XLSX_COLORS.azul,
      BAR_COLORS.azul,
    );
  }

  // --- Triagens ----------------------------------------------------------------------------
  if (clinical && (clinical.preScreenings.length || clinical.screeningOutcomes.length)) {
    const screenings = addSheet(workbook, 'Triagens', [44, 18, 16], XLSX_COLORS.petroleo);
    setupPrint(screenings, { orientation: 'portrait', onePage: true });
    row = writeHeader(workbook, screenings, {
      title: 'Pré-triagens e triagens',
      details: details(input, [
        'A pré-triagem é informativa: orienta, mas não libera nem bloqueia a doação. A decisão é sempre da equipe de saúde.',
      ]),
      span: 3,
    });
    const blocks: Array<[string, string, Array<[string, number]>]> = [
      [
        'Pré-triagens (resultado informativo)',
        'PreTriagens',
        clinical.preScreenings.map((r) => [PRE_SCREENING_RESULT_LABELS[r.result], r.count]),
      ],
      [
        'Triagens da equipe (resultado)',
        'Triagens',
        clinical.screeningOutcomes.map((r) => [SCREENING_RESULT_LABELS[r.result], r.count]),
      ],
    ];
    for (const [heading, tableName, rows] of blocks) {
      row = writeSection(screenings, row, heading, 3);
      const total = rows.reduce((sum, [, v]) => sum + v, 0);
      const first = row + 1;
      const last = row + rows.length;
      row = writeTable(
        screenings,
        row,
        tableName,
        [
          { name: 'Resultado', total: { label: 'Total' } },
          { name: 'Quantidade', numFmt: FORMATS.integer, total: { fn: 'sum', result: total } },
          { name: '% do total', numFmt: FORMATS.percent },
        ],
        rows.map(([label, value], i) => [
          label,
          value,
          shareFormula(`B${first + i}`, `B$${first}:B$${last}`, value, total),
        ]),
      ).nextRow;
      if (rows.length) addDataBars(screenings, `B${first}:B${last}`, BAR_COLORS.azul);
    }
  }

  // --- Engajamento ---------------------------------------------------------------------------
  if (engagement) {
    const sheet = addSheet(workbook, 'Engajamento', [44, 18, 16], XLSX_COLORS.azul);
    setupPrint(sheet, { orientation: 'portrait', onePage: true });
    row = writeHeader(workbook, sheet, {
      title: 'Reconhecimento dos doadores',
      details: details(input, [
        'Pontos e conquistas reconhecem a participação; não há prêmios materiais.',
      ]),
      span: 3,
    });
    row = writeSection(sheet, row, 'Indicadores', 3);
    row = writeTable(
      sheet,
      row,
      'Engajamento',
      [{ name: 'Indicador' }, { name: 'Valor', numFmt: FORMATS.integer }],
      [
        ['Pontos concedidos no período', engagement.pointsAwarded],
        ['Conquistas desbloqueadas no período', engagement.achievementsUnlocked],
        ['Horas complementares aprovadas', engagement.hoursApproved],
        ['Horas complementares aguardando aprovação', engagement.hoursPending],
        ['Doadores participando do ranking', engagement.rankingParticipants],
      ],
    ).nextRow;
    row = writeSection(sheet, row, 'Doadores por nível', 3);
    const total = engagement.levels.reduce((sum, l) => sum + l.count, 0);
    const first = row + 1;
    const last = row + engagement.levels.length;
    writeTable(
      sheet,
      row,
      'Niveis',
      [
        { name: 'Nível', total: { label: 'Total' } },
        { name: 'Doadores', numFmt: FORMATS.integer, total: { fn: 'sum', result: total } },
        { name: '% do total', numFmt: FORMATS.percent },
      ],
      engagement.levels.map((l, i) => [
        l.name,
        l.count,
        shareFormula(`B${first + i}`, `B$${first}:B$${last}`, l.count, total),
      ]),
    );
    if (engagement.levels.length) addDataBars(sheet, `B${first}:B${last}`, BAR_COLORS.azul);
  }

  return workbook;
}

export async function downloadReportsWorkbook(input: ReportsWorkbookInput): Promise<void> {
  const workbook = await buildReportsWorkbook(input);
  await downloadWorkbook(
    workbook,
    `sangueconecta-relatorio-${input.filters.from}_a_${input.filters.to}.xlsx`,
  );
}

/** Uma tabela só (botão "Excel" de cada quadro resumo). */
export async function downloadSummaryWorkbook(
  input: Pick<ReportsWorkbookInput, 'filters' | 'labels'>,
  title: string,
  columns: [string, string],
  rows: Array<[string, number]>,
  filename: string,
): Promise<void> {
  const workbook = await createWorkbook(title);
  shareSheet(
    workbook,
    title.slice(0, 31),
    title,
    { ...input, stats: undefined, donations: [], donationsTotal: 0 },
    columns,
    rows,
    XLSX_COLORS.carmim,
    BAR_COLORS.carmim,
  );
  await downloadWorkbook(workbook, filename);
}
