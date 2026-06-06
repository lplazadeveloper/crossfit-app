import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { analyticsApi } from '../../api/loadServices';
import { usersApi } from '../../api/services';
import {
  ZONE_COLORS, ZONE_LABELS, RISK_COLORS,
  type AthleteDashboardDto,
} from '../../types/load';
import { Card, Spinner, Avatar, Badge, Select } from '../ui';
import { format, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, Zap, Dumbbell } from 'lucide-react';

// ─── Coach overview ───────────────────────────────────────────────────────────
export function CoachLoadOverview() {
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(12);

  const from = subWeeks(new Date(), weeks);

  const { data: overview } = useQuery({
    queryKey: ['coach-overview'],
    queryFn: () => analyticsApi.getCoachOverview(from),
  });

  const { data: athletes } = useQuery({
    queryKey: ['athletes-list'],
    queryFn: usersApi.list,
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['athlete-dashboard', selectedAthlete, weeks],
    queryFn: () => analyticsApi.getAthleteDashboard(selectedAthlete!, from),
    enabled: !!selectedAthlete,
  });

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Cuantificación de Carga</h1>
          <p className="text-sm text-[var(--color-muted)]">Análisis de carga, intensidad y volumen</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={[
              { value: '4', label: '4 semanas' },
              { value: '8', label: '8 semanas' },
              { value: '12', label: '12 semanas' },
              { value: '24', label: '24 semanas' },
            ]}
            value={String(weeks)}
            onChange={e => setWeeks(Number(e.target.value))}
          />
          <Select
            options={[
              { value: '', label: 'Vista global' },
              ...(athletes?.filter(a => a.role === 0).map(a => ({ value: a.id, label: a.name })) ?? []),
            ]}
            value={selectedAthlete ?? ''}
            onChange={e => setSelectedAthlete(e.target.value || null)}
          />
        </div>
      </div>

      {/* Org-level KPIs */}
      {overview && !selectedAthlete && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="RPE medio (org)" value={overview.orgAvgRpe.toFixed(1)} icon={<Activity size={18} />} />
            <KpiCard label="Tonelaje total" value={`${(overview.orgTotalTonnage / 1000).toFixed(1)}t`} icon={<Dumbbell size={18} />} />
            <KpiCard label="Min. Z3+" value={overview.orgIntensityDistribution.minutesZ3 + overview.orgIntensityDistribution.minutesZ4 + overview.orgIntensityDistribution.minutesZ5} icon={<Zap size={18} />} />
            <KpiCard label="Atletas" value={overview.athletes.length} icon={<Activity size={18} />} />
          </div>

          {/* Athlete risk table */}
          <Card>
            <h2 className="font-semibold mb-4">Estado de carga por atleta</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border)]">
                    <th className="text-left py-2 pr-4">Atleta</th>
                    <th className="text-right py-2 px-3">Carga sem.</th>
                    <th className="text-right py-2 px-3">ACWR</th>
                    <th className="text-right py-2 px-3">RPE medio</th>
                    <th className="text-right py-2 px-3">Riesgo</th>
                    <th className="text-right py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {overview.athletes.map(a => (
                    <tr key={a.athleteId}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface2)] transition-colors cursor-pointer"
                      onClick={() => setSelectedAthlete(a.athleteId)}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar src={a.avatar} name={a.athleteName} size={28} />
                          <span className="font-medium">{a.athleteName}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 tabular-nums">{a.lastWeekLoad?.toFixed(0) ?? '—'}</td>
                      <td className="text-right py-3 px-3 tabular-nums">
                        <AcwrBadge ratio={a.acwrRatio} />
                      </td>
                      <td className="text-right py-3 px-3 tabular-nums">{a.avgRpe?.toFixed(1) ?? '—'}</td>
                      <td className="text-right py-3 px-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: `${RISK_COLORS[a.riskLevel]}22`, color: RISK_COLORS[a.riskLevel] }}>
                          {a.riskLevel === 'low' ? 'Bajo' : a.riskLevel === 'moderate' ? 'Moderado' : '⚠ Alto'}
                        </span>
                      </td>
                      <td className="text-right py-3">
                        <span className="text-xs text-[var(--color-primary)]">Ver →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Org intensity distribution */}
          <Card>
            <h2 className="font-semibold mb-4">Distribución de intensidad (organización)</h2>
            <IntensityPieChart dist={overview.orgIntensityDistribution} />
          </Card>
        </>
      )}

      {/* Individual athlete dashboard */}
      {selectedAthlete && (
        <>
          <button onClick={() => setSelectedAthlete(null)}
            className="self-start text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1">
            ← Vista global
          </button>
          {dashLoading ? (
            <div className="flex justify-center py-16"><Spinner size={32} /></div>
          ) : dashboard ? (
            <AthleteDashboard data={dashboard} />
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Individual athlete dashboard ─────────────────────────────────────────────
function AthleteDashboard({ data }: { data: AthleteDashboardDto }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar src={data.athleteAvatar} name={data.athleteName} size={48} />
        <div>
          <h2 className="text-xl font-semibold">{data.athleteName}</h2>
          <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
            {data.lastWeekRpe && <span>RPE sem: <strong className="text-[var(--color-text)]">{data.lastWeekRpe.toFixed(1)}</strong></span>}
            {data.trendLoadScore != null && (
              <span className="flex items-center gap-1">
                {data.trendLoadScore > 5 ? <TrendingUp size={14} className="text-green-400" /> :
                 data.trendLoadScore < -5 ? <TrendingDown size={14} className="text-red-400" /> :
                 <Minus size={14} className="text-[var(--color-muted)]" />}
                {data.trendLoadScore > 0 ? '+' : ''}{data.trendLoadScore.toFixed(1)}% vs sem. ant.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.weeklyLoads.length > 0 && (() => {
          const last = data.weeklyLoads[data.weeklyLoads.length - 1];
          return (
            <>
              <KpiCard label="Carga última sem." value={last.totalLoadScore.toFixed(0)} />
              <KpiCard label="ACWR" value={<AcwrBadge ratio={last.acwrRatio} />} />
              <KpiCard label="Min Z3+" value={last.minutesZ3Plus} />
              <KpiCard label="Tonelaje sem." value={`${(last.totalTonnageKg / 1000).toFixed(2)}t`} />
            </>
          );
        })()}
      </div>

      {/* ACWR chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Carga aguda vs crónica (ACWR)</h2>
          <div className="flex gap-3 text-xs text-[var(--color-muted)]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[var(--color-primary)] inline-block" /> Aguda 7d</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> Crónica 28d</span>
          </div>
        </div>
        <AcwrChart acwr={data.acwr} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Intensity distribution */}
        <Card>
          <h2 className="font-semibold mb-4">Distribución de intensidad</h2>
          <IntensityPieChart dist={data.intensityDistribution} />
        </Card>

        {/* Weekly load bar */}
        <Card>
          <h2 className="font-semibold mb-4">Carga semanal (score)</h2>
          <WeeklyLoadChart loads={data.weeklyLoads} />
        </Card>
      </div>

      {/* Volume by movement */}
      <Card>
        <h2 className="font-semibold mb-4">Volumen por movimiento</h2>
        <MovementVolumeTable movements={data.movementVolumes} />
      </Card>

      {/* Volume trends */}
      {data.movementVolumes.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-4">Tendencia de tonelaje — {data.movementVolumes[0].movementName}</h2>
          <VolumeTrendChart movement={data.movementVolumes[0]} />
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider">{label}</span>
        {icon && <span className="text-[var(--color-muted)]">{icon}</span>}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function AcwrBadge({ ratio }: { ratio?: number | null }) {
  if (!ratio) return <span className="text-[var(--color-muted)]">—</span>;
  const color = ratio < 0.8 ? RISK_COLORS.low : ratio > 1.3 ? RISK_COLORS.high : RISK_COLORS.moderate;
  return (
    <span className="font-bold tabular-nums" style={{ color }}>{ratio.toFixed(2)}</span>
  );
}

function AcwrChart({ acwr }: { acwr: import('../../types/load').AcwrChartDto }) {
  const data = acwr.dates.map((d, i) => ({
    date: format(new Date(d), 'd MMM', { locale: es }),
    acute: acwr.acuteLoad[i] ?? 0,
    chronic: acwr.chronicLoad[i] ?? 0,
    ratio: acwr.acwrRatio[i],
  })).filter((_, i) => i % 3 === 0); // one point every 3 days

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const ratio = payload[0]?.payload?.ratio;
    const rColor = !ratio ? '#999' : ratio < 0.8 ? RISK_COLORS.low : ratio > 1.3 ? RISK_COLORS.high : RISK_COLORS.moderate;
    return (
      <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg p-3 text-xs flex flex-col gap-1">
        <p className="font-medium mb-1">{label}</p>
        <p>Aguda: <strong>{payload[0]?.value?.toFixed(0)}</strong></p>
        <p>Crónica: <strong>{payload[1]?.value?.toFixed(0)}</strong></p>
        {ratio && <p>ACWR: <strong style={{ color: rColor }}>{ratio.toFixed(2)}</strong></p>}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: '#8B90A8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#8B90A8', fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
        <Area type="monotone" dataKey="acute" stroke="var(--color-primary)" fill="rgba(230,57,70,0.15)" strokeWidth={2} />
        <Area type="monotone" dataKey="chronic" stroke="#3B82F6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function IntensityPieChart({ dist }: { dist: import('../../types/load').IntensityDistributionDto }) {
  const data = [
    { name: 'Z1 Rec.', value: dist.minutesZ1, pct: dist.percentZ1, color: ZONE_COLORS.Z1 },
    { name: 'Z2 Aer.', value: dist.minutesZ2, pct: dist.percentZ2, color: ZONE_COLORS.Z2 },
    { name: 'Z3 Tempo', value: dist.minutesZ3, pct: dist.percentZ3, color: ZONE_COLORS.Z3 },
    { name: 'Z4 Umbral', value: dist.minutesZ4, pct: dist.percentZ4, color: ZONE_COLORS.Z4 },
    { name: 'Z5 Máx.', value: dist.minutesZ5, pct: dist.percentZ5, color: ZONE_COLORS.Z5 },
  ].filter(d => d.value > 0);

  if (!data.length) return <p className="text-center text-sm text-[var(--color-muted)] py-8">Sin datos de FC registrados</p>;

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 flex-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs flex-1 text-[var(--color-muted)]">{d.name}</span>
            <span className="text-xs font-medium tabular-nums">{d.value}min</span>
            <span className="text-xs text-[var(--color-muted)] tabular-nums w-10 text-right">{d.pct}%</span>
          </div>
        ))}
        <div className="border-t border-[var(--color-border)] pt-1 mt-1 flex justify-between text-xs text-[var(--color-muted)]">
          <span>Total</span>
          <span className="font-medium text-[var(--color-text)]">{dist.totalMinutes} min</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyLoadChart({ loads }: { data?: any; loads: import('../../types/load').WeeklyLoadDto[] }) {
  const data = loads.map(l => ({
    week: format(new Date(l.weekStart), 'd MMM', { locale: es }),
    load: Math.round(l.totalLoadScore),
    rpe: l.avgRpe,
    acwr: l.acwrRatio,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="week" tick={{ fill: '#8B90A8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#8B90A8', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [v, 'Carga']}
        />
        <Bar dataKey="load" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => {
            const color = !d.acwr ? 'var(--color-primary)'
              : d.acwr < 0.8 ? RISK_COLORS.low
              : d.acwr > 1.3 ? RISK_COLORS.high
              : 'var(--color-primary)';
            return <Cell key={i} fill={color} fillOpacity={0.85} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MovementVolumeTable({ movements }: { movements: import('../../types/load').MovementVolumeReportDto[] }) {
  if (!movements.length) return <p className="text-sm text-center text-[var(--color-muted)] py-6">Sin movimientos registrados en este período</p>;
  const maxTonnage = Math.max(...movements.map(m => m.totalTonnageKg));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--color-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border)]">
            <th className="text-left py-2 pr-4">Movimiento</th>
            <th className="text-right py-2 px-3">Series</th>
            <th className="text-right py-2 px-3">Reps</th>
            <th className="text-right py-2 px-3">Tonelaje</th>
            <th className="text-right py-2 px-3">IMR %</th>
            <th className="py-2 px-3 w-32">Distribución</th>
          </tr>
        </thead>
        <tbody>
          {movements.map(m => (
            <tr key={m.movementName} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface2)] transition-colors">
              <td className="py-3 pr-4">
                <div className="font-medium">{m.movementName}</div>
                <div className="text-xs text-[var(--color-muted)]">{m.category}</div>
              </td>
              <td className="text-right py-3 px-3 tabular-nums">{m.totalSets}</td>
              <td className="text-right py-3 px-3 tabular-nums">{m.totalReps}</td>
              <td className="text-right py-3 px-3 tabular-nums font-medium">
                {m.totalTonnageKg >= 1000
                  ? `${(m.totalTonnageKg / 1000).toFixed(2)}t`
                  : `${m.totalTonnageKg.toFixed(0)}kg`}
              </td>
              <td className="text-right py-3 px-3 tabular-nums">
                <span style={{ color: m.avgRelativeIntensity > 85 ? '#EF4444' : m.avgRelativeIntensity > 75 ? '#F59E0B' : '#10B981' }}>
                  {m.avgRelativeIntensity.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-3">
                <div className="h-2 bg-[var(--color-surface2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${(m.totalTonnageKg / maxTonnage) * 100}%`, opacity: 0.8 }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VolumeTrendChart({ movement }: { movement: import('../../types/load').MovementVolumeReportDto }) {
  const data = movement.byWeek.map(w => ({
    week: format(new Date(w.weekStart), 'd MMM', { locale: es }),
    tonnage: w.tonnageKg,
    ri: w.avgRelativeIntensity,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="week" tick={{ fill: '#8B90A8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#8B90A8', fontSize: 10 }} />
        <Tooltip contentStyle={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="tonnage" name="Tonelaje (kg)" stroke="var(--color-primary)" fill="rgba(230,57,70,0.15)" strokeWidth={2} />
        <Area type="monotone" dataKey="ri" name="IMR %" stroke="#10B981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
