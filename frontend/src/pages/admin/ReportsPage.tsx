import { useState } from 'react';
import { Download, FileChartColumn, FileSpreadsheet } from 'lucide-react';
import {
  APPOINTMENT_STATUS_LABELS,
  BLOOD_TYPE_LABELS,
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  type AdminDonationItem,
  type AppointmentStatus,
  type Paginated,
} from '@pulso/contracts';
import { SelectField } from '@/components/form';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  ProblemAlert,
  QueryState,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui';
import { statsQueryString, useAdminDonations, useDashboard } from '@/features/insights/api';
import { StatsFilterBar } from '@/features/insights/StatsFilterBar';
import { useAllUnits } from '@/features/admin/units';
import { UnavailableAlert } from '@/features/insights/UnavailableAlert';
import { useStatsFilters } from '@/features/insights/use-stats-filters';
import { apiGet } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';
import type { ReportsWorkbookInput } from '@/features/insights/reports-workbook';

/** Limite da exportação de doações (as páginas são buscadas em sequência). */
const EXPORT_LIMIT = 2000;

/** Relatórios com os mesmos filtros do painel e exportação em planilha Excel (ou CSV). */
export function ReportsPage() {
  useDocumentTitle('Relatórios');
  const state = useStatsFilters();
  const { filters } = state;
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const donations = useAdminDonations(filters, status, page);
  const stats = useDashboard(filters);
  const units = useAllUnits();
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);
  const [exportError, setExportError] = useState<unknown>(null);
  const suffix = `${filters.from}_a_${filters.to}`;
  const labels = {
    unit: filters.unitId
      ? (units.data?.find((u) => u.id === filters.unitId)?.name ?? 'Selecionada')
      : 'Todas',
    bloodType: filters.bloodType ? BLOOD_TYPE_LABELS[filters.bloodType] : 'Todos',
    status: status
      ? DONATION_STATUS_LABELS[status as keyof typeof DONATION_STATUS_LABELS]
      : 'Todas',
  };

  async function fetchDonations() {
    const rows: AdminDonationItem[] = [];
    let total = 0;
    for (let current = 1; rows.length < EXPORT_LIMIT; current++) {
      const result = await apiGet<Paginated<AdminDonationItem>>(
        `/admin/donations?${statsQueryString(filters, { status, page: current, pageSize: 100 })}`,
      );
      rows.push(...result.items);
      total = result.total;
      if (current * result.pageSize >= result.total) break;
    }
    return { rows: rows.slice(0, EXPORT_LIMIT), total };
  }

  async function exportDonations(format: 'xlsx' | 'csv') {
    setExporting(format);
    setExportError(null);
    try {
      const { rows, total } = await fetchDonations();
      if (format === 'xlsx') {
        // A biblioteca de planilhas só é baixada aqui, quando alguém exporta.
        const { downloadReportsWorkbook } = await import('@/features/insights/reports-workbook');
        await downloadReportsWorkbook({
          filters,
          labels,
          stats: stats.data,
          donations: rows,
          donationsTotal: total,
        });
        return;
      }
      downloadCsv(
        `sangueconecta-doacoes-${suffix}.csv`,
        ['Data', 'Código', 'Situação', 'Tipo sanguíneo', 'Volume (mL)', 'Unidade', 'Campanha'],
        rows.map((d) => [
          formatDateTime(d.occurredAt),
          d.code,
          DONATION_STATUS_LABELS[d.status],
          BLOOD_TYPE_LABELS[d.bloodType],
          d.volumeMl,
          d.unitName,
          d.campaignTitle ?? '',
        ]),
      );
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(null);
    }
  }

  const byUnit = stats.data?.clinical?.byUnit ?? [];
  const byType = stats.data?.clinical?.byBloodType ?? [];
  const byStatus = stats.data?.scheduling
    ? (Object.entries(stats.data.scheduling.byStatus) as Array<[AppointmentStatus, number]>)
    : [];

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Dados do período filtrado, prontos para conferir ou exportar (dados fictícios)."
      />
      <StatsFilterBar state={state} />
      <div className="space-y-6">
        <Card as="section" aria-labelledby="rel-doacoes" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="rel-doacoes" className="text-lg font-bold text-ink">
                Doações
              </h2>
              <p className="text-sm text-ink-muted">
                A planilha Excel traz o resumo do período, gráficos e até{' '}
                {formatNumber(EXPORT_LIMIT)} doações com os filtros atuais.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <SelectField
                label="Situação"
                className="w-52"
                placeholder="Todas"
                value={status}
                options={DONATION_STATUSES.map((s) => ({
                  value: s,
                  label: DONATION_STATUS_LABELS[s],
                }))}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              />
              <Button
                loading={exporting === 'xlsx'}
                // O resumo da planilha usa os indicadores do período: espera eles carregarem.
                disabled={exporting !== null || stats.isLoading}
                onClick={() => exportDonations('xlsx')}
              >
                <FileSpreadsheet aria-hidden="true" className="size-4" /> Baixar planilha (Excel)
              </Button>
              <Button
                variant="outline"
                loading={exporting === 'csv'}
                disabled={exporting !== null}
                onClick={() => exportDonations('csv')}
              >
                <Download aria-hidden="true" className="size-4" /> CSV
              </Button>
            </div>
          </div>
          <ProblemAlert error={exportError} />
          <QueryState
            isLoading={donations.isLoading}
            error={donations.error}
            onRetry={() => donations.refetch()}
          >
            {donations.data && donations.data.items.length === 0 ? (
              <EmptyState icon={FileChartColumn} title="Nenhuma doação no período" />
            ) : (
              donations.data && (
                <>
                  <Table caption="Doações no período">
                    <THead>
                      <Tr>
                        <Th>Data</Th>
                        <Th>Código</Th>
                        <Th>Situação</Th>
                        <Th>Tipo</Th>
                        <Th className="text-right">Volume</Th>
                        <Th>Unidade</Th>
                        <Th>Campanha</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {donations.data.items.map((d) => (
                        <Tr key={d.id}>
                          <Td className="whitespace-nowrap">{formatDateTime(d.occurredAt)}</Td>
                          <Td className="font-mono text-xs">{d.code}</Td>
                          <Td>{DONATION_STATUS_LABELS[d.status]}</Td>
                          <Td className="font-semibold">{BLOOD_TYPE_LABELS[d.bloodType]}</Td>
                          <Td className="text-right tabular-nums">{d.volumeMl} mL</Td>
                          <Td>{d.unitName}</Td>
                          <Td>{d.campaignTitle ?? '—'}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                  <Pagination
                    page={page}
                    pageSize={donations.data.pageSize}
                    total={donations.data.total}
                    onPageChange={setPage}
                  />
                </>
              )
            )}
          </QueryState>
        </Card>
        <QueryState isLoading={stats.isLoading} error={stats.error} onRetry={() => stats.refetch()}>
          {stats.data && (
            <div className="space-y-4">
              <UnavailableAlert services={stats.data.unavailable} />
              <div className="grid gap-6 lg:grid-cols-3">
                <SummaryTable
                  title="Doações por unidade"
                  columns={['Unidade', 'Doações']}
                  rows={byUnit.map((r) => [r.unitName, r.count])}
                  filename={`sangueconecta-doacoes-por-unidade-${suffix}.xlsx`}
                  context={{ filters, labels }}
                />
                <SummaryTable
                  title="Doações por tipo sanguíneo"
                  columns={['Tipo', 'Doações']}
                  rows={byType.map((r) => [BLOOD_TYPE_LABELS[r.bloodType], r.count])}
                  filename={`sangueconecta-doacoes-por-tipo-${suffix}.xlsx`}
                  context={{ filters, labels }}
                />
                <SummaryTable
                  title="Agendamentos por situação"
                  columns={['Situação', 'Agendamentos']}
                  rows={byStatus.map(([s, count]) => [APPOINTMENT_STATUS_LABELS[s], count])}
                  filename={`sangueconecta-agendamentos-por-situacao-${suffix}.xlsx`}
                  context={{ filters, labels }}
                />
              </div>
            </div>
          )}
        </QueryState>
      </div>
    </>
  );
}

function SummaryTable({
  title,
  columns,
  rows,
  filename,
  context,
}: {
  title: string;
  columns: [string, string];
  rows: Array<[string, number]>;
  filename: string;
  context: Pick<ReportsWorkbookInput, 'filters' | 'labels'>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { downloadSummaryWorkbook } = await import('@/features/insights/reports-workbook');
      await downloadSummaryWorkbook(context, title, columns, rows, filename);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card as="section" aria-label={title} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        <Button
          variant="ghost"
          size="sm"
          loading={busy}
          disabled={rows.length === 0}
          onClick={download}
          aria-label={`Baixar planilha Excel: ${title}`}
        >
          <FileSpreadsheet aria-hidden="true" className="size-4" /> Excel
        </Button>
      </div>
      <ProblemAlert error={error} />
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Sem dados no período.</p>
      ) : (
        <Table caption={title} className="[&_table]:min-w-0">
          <THead>
            <Tr>
              <Th>{columns[0]}</Th>
              <Th className="text-right">{columns[1]}</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map(([label, value]) => (
              <Tr key={label}>
                <Td>{label}</Td>
                <Td className="text-right tabular-nums">{formatNumber(value)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
