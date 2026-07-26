import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  BarChart, Bar as ReBar, PieChart, Pie, Cell,
  LineChart, Line as ReLine,
  XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend as ReLegend,
  ResponsiveContainer,
} from 'recharts';
import {
  Download, Calendar, Layers, Eye, AlertTriangle,
  TrendingUp, ShieldAlert, Clock, Zap, UserCheck,
  Activity, BarChart2, AlertOctagon, Cpu, Leaf,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
);

// ─── Constants — field-ops palette (recharts/Chart.js need literal hex) ───────
const PALETTE = ['#C98A3E', '#4A7C7C', '#8C6229', '#6B8E8E', '#B5432F', '#A8AE9C'];

const CON_COLORS = {
  'Critically Endangered': '#B5432F',
  'Endangered':            '#C98A3E',
  'Vulnerable':            '#8C6229',
  'Near Threatened':       '#6B8E8E',
  'Least Concern':         '#4A7C7C',
};

const SEVERITY_COLORS = ['#B5432F', '#C98A3E', '#8C6229', '#4A7C7C'];

const RANK_STYLE = [
  { bg: 'bg-ochre',        text: 'text-bush'   },
  { bg: 'bg-bush-line',    text: 'text-bone'   },
  { bg: 'bg-ochre-dim',    text: 'text-bone'   },
  { bg: 'bg-bush',         text: 'text-bone/60' },
  { bg: 'bg-bush',         text: 'text-bone/40' },
];

const getRankStyle = (i) => RANK_STYLE[i] ?? { bg: 'bg-bush', text: 'text-bone/40' };

const getBatteryStyle = (level) => {
  if (level >= 60) return { text: 'text-teal',  bar: 'bg-teal'  };
  if (level >= 30) return { text: 'text-ochre', bar: 'bg-ochre' };
  return                 { text: 'text-rust',  bar: 'bg-rust'  };
};

const fmt = (n) => Number(n).toLocaleString();

// ─── Chart.js option sets (separate — Doughnut must not receive scales) ───────
const tooltipPlugin = {
  backgroundColor: '#242D1F',
  titleColor: '#A8AE9C',
  bodyColor: '#EDE6D3',
  padding: 10,
  cornerRadius: 2,
  titleFont: { family: 'IBM Plex Mono', size: 11 },
  bodyFont: { family: 'IBM Plex Mono', size: 11 },
};

const lineOptions = {
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipPlugin },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#A8AE9C', font: { size: 11, family: 'IBM Plex Mono' } } },
    y: { grid: { color: '#3A4433' }, ticks: { color: '#A8AE9C', font: { size: 11, family: 'IBM Plex Mono' } } },
  },
};

const barOptions = {
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipPlugin },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#A8AE9C', font: { size: 11, family: 'IBM Plex Mono' } } },
    y: { grid: { color: '#3A4433' }, ticks: { color: '#A8AE9C', font: { size: 11, family: 'IBM Plex Mono' } } },
  },
};

// No scales property — Doughnut/Pie charts don't support axes
const doughnutOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { boxWidth: 10, font: { size: 11, family: 'IBM Plex Mono' }, color: '#A8AE9C' },
    },
    tooltip: tooltipPlugin,
  },
};

// ─── Shared UI components ─────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-bush-surface border border-bush-line ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ icon: Icon, iconColor = 'text-ochre', title, subtitle }) => (
  <div className="flex items-center gap-3 p-5 pb-0">
    <div className="flex items-center justify-center w-8 h-8 border border-bush-line">
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div>
      <h3 className="font-display text-sm font-semibold text-bone">{title}</h3>
      {subtitle && <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const EmptyState = ({ message = 'No data available' }) => (
  <div className="flex flex-col items-center justify-center py-12 text-bone/30">
    <BarChart2 className="h-7 w-7 mb-2" />
    <p className="font-mono text-xs uppercase tracking-widest">{message}</p>
  </div>
);

const StatCard = ({ icon: Icon, iconColor, label, value, sub }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">{label}</p>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <p className="font-display text-2xl font-bold text-bone tracking-tight">{value}</p>
    {sub && <p className="text-xs text-bone/40 mt-1">{sub}</p>}
  </Card>
);

const StatusBadge = ({ status }) => {
  const color = CON_COLORS[status] || '#A8AE9C';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border"
      style={{ borderColor: color, color }}
    >
      {status}
    </span>
  );
};

const SectionDivider = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-4 py-2">
    <div className="flex items-center gap-3 shrink-0">
      <div className="flex items-center justify-center w-8 h-8 border border-ochre">
        <Icon className="h-4 w-4 text-ochre" />
      </div>
      <div>
        <h2 className="font-display text-base font-bold text-bone">{title}</h2>
        {description && <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{description}</p>}
      </div>
    </div>
    <div className="flex-1 h-px bg-bush-line" />
  </div>
);

// Replaces inline pie labels — no clipping, always readable
const PieLegend = ({ data, colors }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="mt-4 space-y-2">
      {data.map((entry, i) => {
        const color = colors[i] ?? PALETTE[i % PALETTE.length];
        const pct   = total > 0 ? (entry.value / total) * 100 : 0;
        return (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="w-2 h-2 shrink-0" style={{ backgroundColor: color }} />
            <span className="font-mono text-xs text-bone/60 flex-1 capitalize truncate">{entry.name}</span>
            <div className="w-20 h-1.5 bg-bush overflow-hidden shrink-0">
              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="font-mono text-xs font-bold text-bone w-6 text-right shrink-0">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bush-surface text-bone font-mono text-xs px-3 py-2 border border-bush-line">
      {label && <p className="font-semibold mb-1 text-bone/50">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#4A7C7C' }}>
          {p.name}: <span className="font-bold text-bone">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Reports = () => {
  const [loading, setLoading] = useState(true);

  // Raw Chart.js sources
  const [speciesDist,    setSpeciesDist]    = useState(null);
  const [sightingTrends, setSightingTrends] = useState(null);
  const [incidentTrends, setIncidentTrends] = useState(null);

  // Recharts / table sources
  const [conservationStatus, setConservationStatus] = useState([]);
  const [monthlyTrends,      setMonthlyTrends]      = useState([]);
  const [topSpecies,         setTopSpecies]          = useState([]);
  const [activeObservers,    setActiveObservers]     = useState([]);
  const [incidentMonthly,    setIncidentMonthly]     = useState([]);
  const [incidentBySeverity, setIncidentBySeverity]  = useState([]);
  const [incidentByType,     setIncidentByType]      = useState([]);
  const [sensorSummary,      setSensorSummary]       = useState([]);
  const [endangeredList,     setEndangeredList]      = useState([]);
  const [userRoleBreakdown,  setUserRoleBreakdown]   = useState([]);
  const [speciesByCategory,  setSpeciesByCategory]   = useState([]);

  const reportRef = useRef(null);

  useEffect(() => { fetchAllReports(); }, []);

  const fetchAllReports = async () => {
    try {
      // sighting-trends fetched once and reused for both Chart.js and Recharts
      const [distRes, sightRes, incRes, endangeredRes, iotRes, usersRes] =
        await Promise.all([
          api.get('/reports/species-distribution'),
          api.get('/reports/sighting-trends'),
          api.get('/reports/incident-trends?startDate=2023-01-01&endDate=2025-12-31'),
          api.get('/reports/endangered-species'),
          api.get('/reports/iot-activity'),
          api.get('/users'),
        ]);

      // ── Species ──────────────────────────────────────────────────────────────
      if (distRes.data.success) {
        setSpeciesDist(distRes.data.data);
        setSpeciesByCategory(
          (distRes.data.data.byCategory || []).map(i => ({ name: i.category, value: parseInt(i.count) }))
        );
        setConservationStatus(
          (distRes.data.data.byConservationStatus || []).map(i => ({
            name:  i.conservationStatus || 'Unknown',
            value: parseInt(i.count),
          }))
        );
      }

      // ── Sightings (single fetch, shared between Chart.js + Recharts) ─────────
      if (sightRes.data.success) {
        const { monthlyTrends: mt, topSpecies: ts, activeObservers: ao } = sightRes.data.data;
        setSightingTrends(sightRes.data.data);
        setMonthlyTrends(
          [...(mt || [])].reverse().map(i => ({
            month:        new Date(i.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            sightings:    parseInt(i.count),
            totalAnimals: parseInt(i.totalAnimals),
          }))
        );
        setTopSpecies((ts || []).slice(0, 5).map(i => ({ name: i.commonName, sightings: parseInt(i.sightingCount) })));
        setActiveObservers((ao || []).slice(0, 5));
      }

      // ── Incidents ─────────────────────────────────────────────────────────────
      if (incRes.data.success) {
        setIncidentTrends(incRes.data.data);
        setIncidentByType(
          (incRes.data.data.byType || []).map(i => ({ name: i.incidentType, count: parseInt(i.count) }))
        );
        setIncidentBySeverity(
          (incRes.data.data.bySeverity || []).map(i => ({ name: i.severity, value: parseInt(i.count) }))
        );
        setIncidentMonthly(
          [...(incRes.data.data.monthlyTrends || [])].reverse().map(i => ({
            month: new Date(i.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            count: parseInt(i.count),
          }))
        );
      }

      if (endangeredRes.data.success) setEndangeredList(endangeredRes.data.data.species || []);
      if (iotRes.data.success)        setSensorSummary(iotRes.data.data.sensorSummary || []);

      if (usersRes.data.success) {
        const roleCounts = (usersRes.data.data.users || []).reduce((acc, u) => {
          acc[u.role] = (acc[u.role] || 0) + 1;
          return acc;
        }, {});
        setUserRoleBreakdown(
          Object.entries(roleCounts).map(([role, count]) => ({ name: role, value: count }))
        );
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const el = reportRef.current;
    if (!el) return;
    const canvas  = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#1B2318' });
    const imgData = canvas.toDataURL('image/png');
    const pdf     = new jsPDF('p', 'mm', 'a4');
    const w       = pdf.internal.pageSize.getWidth();
    pdf.addImage(imgData, 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
    pdf.save(`wildlife-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ── Chart.js data builders — always spread arrays to avoid mutation ───────────
  const getSightingLineData = () => {
    if (!sightingTrends?.monthlyTrends) return { labels: [], datasets: [] };
    const data = [...sightingTrends.monthlyTrends].reverse(); // copy first, then reverse
    return {
      labels: data.map(d => new Date(d.month).toLocaleDateString('default', { month: 'short', year: '2-digit' })),
      datasets: [{
        label: 'Total Sightings',
        data: data.map(d => d.count),
        borderColor: '#4A7C7C',
        backgroundColor: 'rgba(74,124,124,0.12)',
        fill: true, tension: 0.4, borderWidth: 2,
        pointBackgroundColor: '#4A7C7C', pointRadius: 3,
      }],
    };
  };

  const getCategoryDoughnutData = () => {
    if (!speciesDist?.byCategory) return { labels: [], datasets: [] };
    return {
      labels: speciesDist.byCategory.map(d => d.category),
      datasets: [{
        data: speciesDist.byCategory.map(d => d.count),
        backgroundColor: PALETTE,
        borderWidth: 2, borderColor: '#1B2318', hoverOffset: 6,
      }],
    };
  };

  const getIncidentBarData = () => {
    if (!incidentTrends?.byType) return { labels: [], datasets: [] };
    return {
      labels: incidentTrends.byType.map(d => d.incidentType),
      datasets: [{
        label: 'Incidents',
        data: incidentTrends.byType.map(d => d.count),
        backgroundColor: 'rgba(181,67,47,0.18)',
        borderColor: '#B5432F', borderWidth: 2,
      }],
    };
  };

  // ── Derived KPIs ─────────────────────────────────────────────────────────────
  const totalSightings = monthlyTrends.reduce((s, m) => s + m.sightings, 0);
  const totalAnimals   = monthlyTrends.reduce((s, m) => s + m.totalAnimals, 0);
  const totalIncidents = incidentMonthly.reduce((s, m) => s + m.count, 0);
  const criticalCount  = conservationStatus.find(s => s.name === 'Critically Endangered')?.value ?? 0;
  const maxSightings   = topSpecies.length > 0 ? Math.max(...topSpecies.map(s => s.sightings)) : 1;

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-bush flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-bush-line border-t-ochre" />
          <p className="font-mono text-xs uppercase tracking-widest text-bone/40">Loading report data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bush text-bone font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 bg-ochre" />
              <h1 className="font-display text-2xl font-bold text-bone tracking-tight">System Reports</h1>
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-bone/40 ml-3">
              Analytics and trends &middot; {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-ochre hover:bg-[#dda054] text-bush px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-semibold transition-colors duration-150 print:hidden"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>

        {/* ═══ PDF capture zone ═════════════════════════════════════════════════ */}
        <div ref={reportRef} className="space-y-8">

          {/* ── KPI Row ───────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Eye}          iconColor="text-teal"  label="Total Sightings"       value={fmt(totalSightings)} sub="Across all observers"    />
            <StatCard icon={Leaf}         iconColor="text-teal"  label="Animals Recorded"      value={fmt(totalAnimals)}   sub="Individual counts"        />
            <StatCard icon={AlertOctagon} iconColor="text-rust"  label="Total Incidents"       value={fmt(totalIncidents)} sub="Reported events"          />
            <StatCard icon={ShieldAlert}  iconColor="text-ochre" label="Critically Endangered" value={criticalCount}       sub="Species requiring action" />
          </div>

          {/* ── Section 1: Core Charts ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader icon={Calendar} iconColor="text-teal" title="Sighting Activity" subtitle="Monthly sighting count" />
              <div className="p-5 pt-4">
                <div className="h-60"><Line options={lineOptions} data={getSightingLineData()} /></div>
              </div>
            </Card>
            <Card>
              <CardHeader icon={AlertTriangle} iconColor="text-rust" title="Incidents by Type" subtitle="Breakdown of reported event types" />
              <div className="p-5 pt-4">
                <div className="h-60"><Bar options={barOptions} data={getIncidentBarData()} /></div>
              </div>
            </Card>
          </div>

          {/* ── Species Distribution + Most Spotted ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card>
              <CardHeader icon={Layers} iconColor="text-ochre" title="Species Distribution" />
              <div className="p-5 pt-4">
                <div className="h-64"><Doughnut options={doughnutOptions} data={getCategoryDoughnutData()} /></div>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader icon={TrendingUp} iconColor="text-teal" title="Most Spotted Species" subtitle="By sighting count" />
              <div className="p-5 pt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-bush-line">
                      <th className="pb-2 text-left font-mono text-[10px] font-semibold text-bone/40 uppercase tracking-widest">Species</th>
                      <th className="pb-2 text-right font-mono text-[10px] font-semibold text-bone/40 uppercase tracking-widest">Sightings</th>
                      <th className="pb-2 text-right font-mono text-[10px] font-semibold text-bone/40 uppercase tracking-widest">Animals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sightingTrends?.topSpecies ?? []).map((s, i) => (
                      <tr key={s.id} className="border-b border-bush-line last:border-0">
                        <td className="py-3 pr-4 font-medium text-bone">{s.commonName}</td>
                        <td className="py-3 pr-4 text-right font-mono text-bone/60">{fmt(s.sightingCount)}</td>
                        <td className="py-3 text-right font-mono font-bold text-bone">{fmt(s.totalAnimals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Top Contributors ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader icon={UserCheck} iconColor="text-teal" title="Top Contributors" subtitle="Observers with most sightings" />
            <div className="p-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(sightingTrends?.activeObservers ?? []).slice(0, 4).map((obs, i) => (
                  <div key={obs.id} className="flex items-center gap-3 p-3.5 border border-bush-line hover:border-ochre-dim transition-colors">
                    <div className="shrink-0 h-9 w-9 border border-bush-line flex items-center justify-center font-mono text-xs font-bold text-ochre">
                      {obs.firstName?.[0]}{obs.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bone truncate">{obs.firstName} {obs.lastName}</p>
                      <p className="font-mono text-[11px] text-teal">{obs.sightingCount} reports</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Detailed Analytics divider ────────────────────────────────────── */}
          <SectionDivider icon={Activity} title="Detailed Analytics" description="Extended system-wide data visualisations" />

          {/* ── Conservation Status + Species by Category ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader icon={Layers} iconColor="text-teal" title="Species by Category" />
              <div className="p-5 pt-4">
                {speciesByCategory.length === 0 ? <EmptyState /> : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={speciesByCategory} cx="50%" cy="50%" outerRadius={85} dataKey="value" labelLine={false}>
                          {speciesByCategory.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <ReTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={speciesByCategory} colors={PALETTE} />
                  </>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader icon={ShieldAlert} iconColor="text-rust" title="Conservation Status" />
              <div className="p-5 pt-4">
                {conservationStatus.length === 0 ? <EmptyState /> : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={conservationStatus} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value" labelLine={false}>
                          {conservationStatus.map((entry, i) => (
                            <Cell key={i} fill={CON_COLORS[entry.name] ?? PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <ReTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend
                      data={conservationStatus}
                      colors={conservationStatus.map((e, i) => CON_COLORS[e.name] ?? PALETTE[i % PALETTE.length])}
                    />
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* ── Sightings Over Time ───────────────────────────────────────────── */}
          <Card>
            <CardHeader icon={TrendingUp} iconColor="text-teal" title="Sightings Over Time" subtitle="Last 12 months — sightings vs. animals counted" />
            <div className="p-5 pt-4">
              {monthlyTrends.length === 0 ? <EmptyState message="No trend data available" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3A4433" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} />
                    <ReLegend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'IBM Plex Mono', paddingTop: 12 }} />
                    <ReLine yAxisId="left"  type="monotone" dataKey="sightings"    stroke="#4A7C7C" strokeWidth={2.5} dot={false} name="Sightings"     activeDot={{ r: 5 }} />
                    <ReLine yAxisId="right" type="monotone" dataKey="totalAnimals" stroke="#C98A3E" strokeWidth={2.5} strokeDasharray="5 5" dot={false} name="Total Animals" activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* ── Top 5 Species + Incidents by Type ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader icon={Eye} iconColor="text-teal" title="Top 5 Most Sighted Species" />
              <div className="p-5 pt-4">
                {topSpecies.length === 0 ? <EmptyState /> : (
                  <div className="space-y-3">
                    {topSpecies.map((sp, i) => {
                      const { bg, text } = getRankStyle(i);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-6 h-6 font-mono text-xs font-bold shrink-0 ${bg} ${text}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-bone/80 truncate">{sp.name}</span>
                              <span className="font-mono text-sm font-bold text-bone ml-2 shrink-0">{fmt(sp.sightings)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-bush overflow-hidden">
                              <div
                                className="h-full bg-teal"
                                style={{ width: `${(sp.sightings / maxSightings) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader icon={AlertTriangle} iconColor="text-rust" title="Incidents by Type" />
              <div className="p-5 pt-4">
                {incidentByType.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={incidentByType} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3A4433" vertical={false} />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                      <ReTooltip content={<CustomTooltip />} />
                      <ReBar dataKey="count" name="Count">
                        {incidentByType.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#B5432F' : '#8C6229'} />)}
                      </ReBar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* ── Incident Trends + Severity ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader icon={TrendingUp} iconColor="text-rust" title="Incident Trends" subtitle="Last 12 months" />
              <div className="p-5 pt-4">
                {incidentMonthly.length === 0 ? <EmptyState message="No trend data available" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={incidentMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3A4433" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#A8AE9C', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                      <ReTooltip content={<CustomTooltip />} />
                      <ReLine type="monotone" dataKey="count" stroke="#B5432F" strokeWidth={2.5} dot={false} name="Incidents" activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader icon={AlertOctagon} iconColor="text-ochre" title="Incidents by Severity" />
              <div className="p-5 pt-4">
                {incidentBySeverity.length === 0 ? <EmptyState /> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={incidentBySeverity} cx="50%" cy="50%" outerRadius={80} innerRadius={38} dataKey="value" labelLine={false}>
                          {incidentBySeverity.map((_, i) => <Cell key={i} fill={SEVERITY_COLORS[i % SEVERITY_COLORS.length]} />)}
                        </Pie>
                        <ReTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={incidentBySeverity} colors={SEVERITY_COLORS} />
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* ── Users by Role + Active Observers ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader icon={UserCheck} iconColor="text-ochre" title="Users by Role" />
              <div className="p-5 pt-4">
                {userRoleBreakdown.length === 0 ? <EmptyState /> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={userRoleBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={38} dataKey="value" labelLine={false}>
                          {userRoleBreakdown.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <ReTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={userRoleBreakdown} colors={PALETTE} />
                  </>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader icon={UserCheck} iconColor="text-teal" title="Most Active Observers" subtitle="Ranked by sighting count" />
              <div className="p-5 pt-4">
                {activeObservers.length === 0 ? <EmptyState /> : (
                  <div className="space-y-3">
                    {activeObservers.map((obs, i) => {
                      const { bg, text } = getRankStyle(i);
                      return (
                        <div key={obs.id} className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-7 h-7 font-mono text-xs font-bold shrink-0 ${bg} ${text}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-bone truncate">{obs.firstName} {obs.lastName}</p>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{obs.role}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono text-sm font-bold text-teal">{fmt(obs.sightingCount)}</p>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-bone/30">sightings</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── IoT Sensor Activity ────────────────────────────────────────────── */}
          <Card>
            <CardHeader icon={Cpu} iconColor="text-ochre" title="IoT Sensor Activity" subtitle={`${sensorSummary.length} active sensors`} />
            <div className="p-5 pt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-bush-line">
                    {['Sensor ID', 'Type', 'Data Points', 'Battery', 'Last Reading'].map(h => (
                      <th key={h} className="pb-3 text-left font-mono text-[10px] font-semibold text-bone/40 uppercase tracking-widest pr-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensorSummary.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center font-mono text-xs uppercase tracking-widest text-bone/30">No sensor data available</td></tr>
                  ) : sensorSummary.map((sensor) => {
                    const battery    = Math.round(sensor.avgBattery);
                    const lastSeen   = new Date(sensor.lastReading);
                    const minutesAgo = Math.round((Date.now() - lastSeen) / 60000);
                    const bc         = getBatteryStyle(battery);
                    return (
                      <tr key={sensor.sensorId} className="border-b border-bush-line last:border-0 hover:bg-bush transition-colors">
                        <td className="py-3 pr-6 font-mono text-xs font-semibold text-bone">{sensor.sensorId}</td>
                        <td className="py-3 pr-6">
                          <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest border border-ochre-dim text-ochre">{sensor.deviceType}</span>
                        </td>
                        <td className="py-3 pr-6">
                          <div className="flex items-center gap-1.5 font-mono text-bone/60">
                            <Zap className="h-3.5 w-3.5 text-bone/30 shrink-0" />
                            <span className="font-medium">{fmt(parseInt(sensor.dataPoints))}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-6">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-bush overflow-hidden shrink-0">
                              <div className={`h-full ${bc.bar}`} style={{ width: `${battery}%` }} />
                            </div>
                            <span className={`font-mono text-xs font-bold shrink-0 ${bc.text}`}>{battery}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 font-mono text-bone/40 text-xs">
                            <Clock className="h-3 w-3 shrink-0" />
                            {minutesAgo < 60
                              ? `${minutesAgo}m ago`
                              : minutesAgo < 1440
                              ? `${Math.round(minutesAgo / 60)}h ago`
                              : lastSeen.toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Endangered Species Monitor ─────────────────────────────────────── */}
          <Card>
            <CardHeader icon={ShieldAlert} iconColor="text-rust" title="Endangered Species Monitor" subtitle={`${endangeredList.length} species tracked`} />
            <div className="p-5 pt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-bush-line">
                    {['Common Name', 'Scientific Name', 'Category', 'Status', 'Population', 'Sightings'].map(h => (
                      <th key={h} className="pb-3 text-left font-mono text-[10px] font-semibold text-bone/40 uppercase tracking-widest pr-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {endangeredList.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center font-mono text-xs uppercase tracking-widest text-bone/30">No data available</td></tr>
                  ) : endangeredList.map((sp) => (
                    <tr key={sp.id} className="border-b border-bush-line last:border-0 hover:bg-bush transition-colors">
                      <td className="py-3 pr-6 font-semibold text-bone">{sp.commonName}</td>
                      <td className="py-3 pr-6 italic font-mono text-bone/40 text-xs">{sp.scientificName}</td>
                      <td className="py-3 pr-6 text-bone/70">{sp.category}</td>
                      <td className="py-3 pr-6"><StatusBadge status={sp.conservationStatus} /></td>
                      <td className="py-3 pr-6 font-mono text-bone/70">{sp.population != null ? fmt(sp.population) : '—'}</td>
                      <td className="py-3 font-mono font-medium text-bone/70">{sp.recentSightings ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>{/* end reportRef */}
      </div>
    </div>
  );
};

export default Reports;