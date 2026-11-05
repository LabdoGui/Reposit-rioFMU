/**
 * Planilha "Relatório SangueConecta": resumo com indicadores e gráficos, doações
 * detalhadas e abas por dia, unidade, tipo sanguíneo, agendamentos, triagens e
 * engajamento. Carregada só quando o administrador pede o download.
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
} from '@pulso/contracts';
import { formatDate } from '@/lib/format';
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
  generatedAtLabel,
  paintStatus,
  placeChart,
  shareFormula,
  writeHeader,
  writeNote,
  writeSection,
  writeTable,
  type CellValue,
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
  const sheet = addSheet(workbook, name, [34, 16, 14, 4]);
  let row = writeHeader(workbook, sheet, { title: heading, details: details(input), span: 3 });
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
    }),
    { col: 5, row: placement.headerRow },
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

  // --- Resumo -----------------------------------------------------------------
  const summary = addSheet(workbook, 'Resumo', [4, 34, 18, 46]);
  let row = writeHeader(workbook, summary, {
    title: 'Relatório SangueConecta',
    details: details(input),
    span: 4,
  });
  row = writeSection(summary, row, 'Indicadores do período', 4);
  const kpis: Array<[string, CellValue, string?, string?]> = [];
  if (identity) {
    kpis.push([
      'Doadores cadastrados',
      identity.donorsTotal,
      FORMATS.integer,
      `${identity.donorsNewInPeriod} novos no período`,
    ]);
  }
  if (scheduling) {
    kpis.push([
      'Agendamentos no período',
      scheduling.appointmentsTotal,
      FORMATS.integer,
      `${scheduling.upcoming} próximos agendados`,
    ]);
    kpis.push([
      'Comparecimento',
      scheduling.attendanceRate,
      FORMATS.percent,
      'comparecimentos ÷ (comparecimentos + faltas)',
    ]);
    kpis.push(['Unidades ativas', scheduling.activeUnits, FORMATS.integer]);
  }
  if (clinical) {
    kpis.push(['Atendimentos finalizados', clinical.attendances, FORMATS.integer]);
    kpis.push(['Doações concluídas', clinical.donationsCompleted, FORMATS.integer]);
    kpis.push(['Doações não concluídas', clinical.donationsNotCompleted, FORMATS.integer]);
    kpis.push(['Volume coletado', clinical.volumeMl / 1000, FORMATS.liters]);
  }
  if (inventory) {
    kpis.push([
      'Bolsas em estoque',
      inventory.totalBags,
      FORMATS.integer,
      `${inventory.byStatus.CRITICAL} tipos críticos · ${inventory.byStatus.ATTENTION} em atenção`,
    ]);
    kpis.push([
      'Movimentações no período',
      inventory.movementsIn + inventory.movementsOut,
      FORMATS.integer,
      `${inventory.movementsIn} entradas · ${inventory.movementsOut} saídas`,
    ]);
  }
  if (engagement) {
    kpis.push(['Pontos concedidos', engagement.pointsAwarded, FORMATS.integer]);
    kpis.push(['Conquistas desbloqueadas', engagement.achievementsUnlocked, FORMATS.integer]);
    kpis.push([
      'Horas complementares',
      engagement.hoursApproved,
      '#,##0" h"',
      `${engagement.hoursPending} h aguardando aprovação`,
    ]);
  }
  for (const [label, value, numFmt, detail] of kpis) {
    const labelCell = summary.getCell(row, 2);
    labelCell.value = label;
    labelCell.font = { color: { argb: XLSX_COLORS.muted } };
    const valueCell = summary.getCell(row, 3);
    valueCell.value = value ?? '—';
    valueCell.font = { bold: true, size: 13, color: { argb: XLSX_COLORS.ink } };
    valueCell.alignment = { horizontal: 'right' };
    if (numFmt && value !== null) valueCell.numFmt = numFmt;
    if (detail) {
      const detailCell = summary.getCell(row, 4);
      detailCell.value = detail;
      detailCell.font = { size: 10, color: { argb: XLSX_COLORS.muted } };
      detailCell.alignment = { indent: 1 };
    }
    for (let col = 2; col <= 4; col++) {
      summary.getCell(row, col).border = {
        bottom: { style: 'thin', color: { argb: XLSX_COLORS.line } },
      };
    }
    summary.getRow(row).height = 22;
    row++;
  }
  if (stats?.unavailable.length) {
    row = writeNote(
      summary,
      row + 1,
      `Sem resposta no momento da geração: ${stats.unavailable.map((s) => SERVICE_LABELS[s] ?? s).join(', ')}. As abas desses dados ficaram de fora.`,
      4,
    );
  }
  row += 1;
  row = writeSection(summary, row, 'Gráficos', 4);
  const days = daysBetween(input.filters.from, input.filters.to);
  const byDay = (series: Array<{ date: string; count: number }> | undefined) => {
    const map = new Map((series ?? []).map((p) => [p.date, p.count]));
    return days.map((d) => map.get(d) ?? 0);
  };
  const charts: Array<string | null> = [];
  if (clinical || scheduling) {
    charts.push(
      lineChartPng({
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
      }),
    );
  }
  if (clinical?.byBloodType.length) {
    const map = new Map(clinical.byBloodType.map((r) => [r.bloodType, r.count]));
    charts.push(
      barChartPng({
        title: 'Doações por tipo sanguíneo',
        labels: BLOOD_TYPES.map((t) => BLOOD_TYPE_LABELS[t]),
        values: BLOOD_TYPES.map((t) => map.get(t) ?? 0),
        color: '#a3123a',
      }),
    );
  }
  if (inventory?.levels.length) {
    charts.push(
      barChartPng({
        title: 'Estoque atual por tipo (bolsas)',
        subtitle: 'Cor da barra: vermelho crítico, laranja atenção, verde adequado',
        labels: inventory.levels.map((l) => BLOOD_TYPE_LABELS[l.bloodType]),
        values: inventory.levels.map((l) => l.quantity),
        colors: inventory.levels.map((l) =>
          l.status === 'CRITICAL' ? '#d92d20' : l.status === 'ATTENTION' ? '#e08a00' : '#1e7f4f',
        ),
      }),
    );
  }
  charts.forEach((png, i) => {
    placeChart(workbook, summary, png, { col: 2, row: row + i * 18 }, { width: 700, height: 320 });
  });

  // --- Doações ------------------------------------------------------------------
  const donationsSheet = addSheet(
    workbook,
    'Doações',
    [18, 14, 22, 14, 14, 32, 30],
    XLSX_COLORS.marca,
  );
  const truncatedNote =
    input.donationsTotal > input.donations.length
      ? [
          `Mostrando ${input.donations.length} de ${input.donationsTotal} doações (limite da exportação).`,
        ]
      : [];
  row = writeHeader(workbook, donationsSheet, {
    title: 'Doações',
    details: details(input, [`Situação: ${input.labels.status}`, ...truncatedNote]),
    span: 7,
  });
  const totalVolume = input.donations.reduce((sum, d) => sum + d.volumeMl, 0);
  const donationsTable = writeTable(
    donationsSheet,
    row,
    'Doacoes',
    [
      { name: 'Data e hora', numFmt: FORMATS.dateTime, total: { label: 'Total' } },
      { name: 'Código', total: { fn: 'count', result: input.donations.length } },
      { name: 'Situação' },
      { name: 'Tipo sanguíneo' },
      { name: 'Volume (mL)', numFmt: FORMATS.integer, total: { fn: 'sum', result: totalVolume } },
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
      donationsSheet.getCell(donationsTable.firstRow + i, 3).font = {
        color: { argb: XLSX_COLORS.criticalText },
      };
    }
  });
  donationsSheet.views = [
    { state: 'frozen', ySplit: donationsTable.headerRow, showGridLines: false },
  ];

  // --- Por dia --------------------------------------------------------------------
  if (clinical || scheduling || identity) {
    const daily = addSheet(workbook, 'Por dia', [14, 18, 16, 16, 4], XLSX_COLORS.azul);
    row = writeHeader(workbook, daily, {
      title: 'Movimento por dia',
      details: details(input),
      span: 4,
    });
    const donationsByDay = byDay(clinical?.byDay);
    const appointmentsByDay = byDay(scheduling?.byDay);
    const newDonorsByDay = byDay(identity?.newDonorsByDay);
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const table = writeTable(
      daily,
      row,
      'PorDia',
      [
        { name: 'Data', numFmt: FORMATS.date, total: { label: 'Total' } },
        {
          name: 'Doações concluídas',
          numFmt: FORMATS.integer,
          total: { fn: 'sum', result: sum(donationsByDay) },
        },
        {
          name: 'Agendamentos',
          numFmt: FORMATS.integer,
          total: { fn: 'sum', result: sum(appointmentsByDay) },
        },
        {
          name: 'Novos doadores',
          numFmt: FORMATS.integer,
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
    addDataBars(daily, `B${table.firstRow}:B${table.lastRow}`, BAR_COLORS.vermelho);
    addDataBars(daily, `C${table.firstRow}:C${table.lastRow}`, BAR_COLORS.azul);
    daily.views = [{ state: 'frozen', ySplit: table.headerRow, showGridLines: false }];
    placeChart(workbook, daily, charts[0] ?? null, { col: 6, row: table.headerRow });
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
      [16, 16, 12, 18, 18],
      XLSX_COLORS.carmim,
    );
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
        { name: 'Situação do estoque' },
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
    const screenings = addSheet(workbook, 'Triagens', [40, 16, 14], XLSX_COLORS.petroleo);
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
    }
  }

  // --- Engajamento ---------------------------------------------------------------------------
  if (engagement) {
    const sheet = addSheet(workbook, 'Engajamento', [32, 16, 14], XLSX_COLORS.azul);
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
