import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { Enterprise } from '@/types';
import { getDeviceStatistics } from '@/data/enterprises';
import { GAOXIN_GEOJSON, STREET_LINES, STREET_LABELS, MAP_BOUNDS } from '@/data/mapData';
import EnterpriseDetail from '@/components/EnterpriseDetail';
import ReportModal from '@/components/ReportModal';
import DeviceInfoModal from '@/components/DeviceInfoModal';
import {
  ArrowLeft, Building2, ClipboardCheck, Wrench, BadgeCheck,
  AlertTriangle, XCircle, Volume2, FileWarning, Cpu, FileText, Eye,
} from 'lucide-react';

// ─── 地图注册（模块级，保证在任何 setOption 之前完成） ────
echarts.registerMap('gaoxin', GAOXIN_GEOJSON as never);

// ─── 通用小组件 ─────────────────────────────────────────

/** 科技感面板（四角括号边框） */
function Panel({ title, icon, children, className = '' }: {
  title?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`relative bg-[#0a1836]/60 backdrop-blur-sm border border-cyan-500/15 rounded-sm ${className}`}>
      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-cyan-400/80" />
      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-cyan-400/80" />
      <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-cyan-400/80" />
      <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-cyan-400/80" />
      {title && (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <span className="w-1 h-3.5 bg-gradient-to-b from-cyan-300 to-blue-500 rounded-full" />
          {icon}
          <span className="text-[13px] font-semibold text-cyan-100 tracking-wide">{title}</span>
          <span className="flex-1 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />
        </div>
      )}
      <div className="px-3 pb-3 pt-1">{children}</div>
    </div>
  );
}

/** 数字滚动 */
function AnimatedNumber({ value, suffix = '', className = '' }: { value: number; suffix?: string; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={className}>
      {display.toLocaleString()}
      {suffix && <span className="text-[11px] font-normal text-cyan-300/70 ml-0.5">{suffix}</span>}
    </span>
  );
}

/** 通用 ECharts 容器 */
function Chart({ option, height, onClick }: {
  option: echarts.EChartsOption; height: number;
  onClick?: (params: echarts.ECElementEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.setOption(option, true);
    } catch (err) {
      console.error('[cockpit] setOption failed:', err);
    }
    if (onClick) {
      chart.off('click');
      chart.on('click', onClick);
    }
  }, [option, onClick]);

  return <div ref={ref} style={{ height, width: '100%' }} />;
}

// ─── 聚合逻辑 ─────────────────────────────────────────

interface Cluster {
  lng: number;
  lat: number;
  enterprises: Enterprise[];
}

/** 按经纬度距离聚合相近企业（阈值约 800m） */
function clusterEnterprises(enterprises: Enterprise[]): Cluster[] {
  const LNG_THRESHOLD = 0.010;
  const LAT_THRESHOLD = 0.008;
  const clusters: Cluster[] = [];
  enterprises.forEach(e => {
    if (!e.longitude || !e.latitude) return;
    const found = clusters.find(
      c => Math.abs(c.lng - e.longitude) < LNG_THRESHOLD && Math.abs(c.lat - e.latitude) < LAT_THRESHOLD
    );
    if (found) {
      found.enterprises.push(e);
      // 重新计算质心
      found.lng = found.enterprises.reduce((s, x) => s + x.longitude, 0) / found.enterprises.length;
      found.lat = found.enterprises.reduce((s, x) => s + x.latitude, 0) / found.enterprises.length;
    } else {
      clusters.push({ lng: e.longitude, lat: e.latitude, enterprises: [e] });
    }
  });
  return clusters;
}

function clusterColor(count: number): string {
  if (count >= 20) return '#f97316';
  if (count >= 10) return '#facc15';
  if (count >= 5) return '#38bdf8';
  return '#22d3ee';
}

// ─── 主页面 ─────────────────────────────────────────

export default function Cockpit() {
  const { state, dispatch, statistics } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [yinzhouReady, setYinzhouReady] = useState(false);
  const [overlay, setOverlay] = useState<{ title: string; list: Enterprise[] } | null>(null);
  const [reportEnt, setReportEnt] = useState<Enterprise | null>(null);
  const [deviceEnt, setDeviceEnt] = useState<Enterprise | null>(null);

  const enterprises = state.enterprises;
  const deviceStats = useMemo(() => getDeviceStatistics(enterprises), [enterprises]);

  // 时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 注册地图（gaoxin 已在模块级注册；此处仅异步加载鄞州区底图）
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}geo/yinzhou.json`)
      .then(r => r.json())
      .then(geo => {
        echarts.registerMap('yinzhou', geo);
        setYinzhouReady(true);
      })
      .catch(() => setYinzhouReady(false));
  }, []);

  // 统计口径
  const stats = useMemo(() => {
    const total = enterprises.length;
    const inspected = enterprises.filter(e => e.status === '已排查').length;
    const installRate = total ? Math.round((statistics.pretreatmentCount / total) * 100) : 0;
    const exceedList = enterprises.filter(e => e.emissionExceed === '超标');
    const upToStandardRate = total ? Math.round(((total - exceedList.length) / total) * 100) : 0;
    const expiredPermit = enterprises.filter(e => e.pollutionPermit.status === '已过期');
    const noFacility = enterprises.filter(e => !e.hasPretreatment);
    const noiseComplaint = enterprises.filter(e => e.noiseComplaint);
    return { total, inspected, installRate, exceedList, upToStandardRate, expiredPermit, noFacility, noiseComplaint };
  }, [enterprises, statistics]);

  const clusters = useMemo(() => clusterEnterprises(enterprises), [enterprises]);

  const openDetail = (e: Enterprise) => {
    dispatch({ type: 'SELECT_ENTERPRISE', payload: e });
    dispatch({ type: 'TOGGLE_DRAWER' });
  };

  // ─── 地图配置 ───
  const mapOption = useMemo((): echarts.EChartsOption => {
    const geos: echarts.EChartsOption['geo'] = [];
    if (yinzhouReady) {
      geos.push({
        map: 'yinzhou',
        boundingCoords: MAP_BOUNDS,
        silent: true,
        z: 1,
        itemStyle: {
          areaColor: 'rgba(8, 20, 45, 0.55)',
          borderColor: 'rgba(45, 90, 150, 0.5)',
          borderWidth: 1,
        },
        label: { show: false },
      });
    }
    geos.push({
      map: 'gaoxin',
      boundingCoords: MAP_BOUNDS,
      z: 2,
      silent: true,
      itemStyle: {
        areaColor: {
          type: 'radial', x: 0.5, y: 0.45, r: 0.8,
          colorStops: [
            { offset: 0, color: 'rgba(16, 60, 120, 0.85)' },
            { offset: 1, color: 'rgba(6, 22, 52, 0.95)' },
          ],
        } as never,
        borderColor: '#22d3ee',
        borderWidth: 1.5,
        shadowColor: 'rgba(34, 211, 238, 0.55)',
        shadowBlur: 18,
      },
      label: { show: false },
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(6, 20, 45, 0.92)',
        borderColor: 'rgba(34, 211, 238, 0.4)',
        textStyle: { color: '#d7f5ff', fontSize: 12 },
      },
      geo: geos,
      series: [
        // 街道分界线
        {
          type: 'lines',
          coordinateSystem: 'geo',
          geoIndex: yinzhouReady ? 1 : 0,
          polyline: true,
          silent: true,
          z: 3,
          lineStyle: { color: 'rgba(94, 234, 212, 0.35)', width: 1, type: 'dashed' },
          data: STREET_LINES.map(l => ({ coords: l.path })),
        } as never,
        // 街道名称标注
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: yinzhouReady ? 1 : 0,
          silent: true,
          z: 4,
          symbol: 'none',
          label: {
            show: true,
            formatter: (p: { name: string }) => p.name,
            color: 'rgba(180, 225, 255, 0.85)',
            fontSize: 13,
            fontWeight: 600,
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowBlur: 4,
          },
          data: STREET_LABELS.map(s => ({ name: s.name, value: [s.lng, s.lat] })),
        } as never,
        // 热力聚合点
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          geoIndex: yinzhouReady ? 1 : 0,
          z: 5,
          rippleEffect: { brushType: 'stroke', scale: 3.2 },
          symbolSize: (val: number[]) => Math.min(16 + val[2] * 2.4, 52),
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(34, 211, 238, 0.6)',
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (p: { data: { count: number } }) => String(p.data.count),
            color: '#031525',
            fontSize: 11,
            fontWeight: 700,
          },
          tooltip: {
            formatter: (p: { data: { count: number; streets: string } }) =>
              `<div style="font-weight:600;margin-bottom:4px">该区域企业数量：${p.data.count} 家</div>` +
              `<div style="opacity:.75">覆盖：${p.data.streets}</div>` +
              `<div style="opacity:.6;margin-top:4px">点击查看企业清单</div>`,
          },
          data: clusters.map(c => ({
            name: `${c.enterprises.length}家企业`,
            value: [c.lng, c.lat, c.enterprises.length],
            count: c.enterprises.length,
            streets: [...new Set(c.enterprises.map(e => e.street))].join('、'),
            enterprises: c.enterprises,
            itemStyle: { color: clusterColor(c.enterprises.length) },
          })),
        } as never,
      ],
    };
  }, [clusters, yinzhouReady]);

  const handleMapClick = (params: echarts.ECElementEvent) => {
    const data = params.data as { enterprises?: Enterprise[]; count?: number } | undefined;
    if (data?.enterprises) {
      setOverlay({ title: `区域企业清单（${data.count} 家）`, list: data.enterprises });
    }
  };

  // ─── 经营类型 donut ───
  const typeOption = useMemo((): echarts.EChartsOption => ({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(6,20,45,.92)', borderColor: 'rgba(34,211,238,.4)', textStyle: { color: '#d7f5ff', fontSize: 12 } },
    legend: {
      orient: 'vertical', right: 4, top: 'center',
      textStyle: { color: 'rgba(190,225,255,.8)', fontSize: 11 },
      itemWidth: 10, itemHeight: 10, icon: 'circle',
    },
    series: [{
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['34%', '50%'],
      label: { show: false },
      itemStyle: { borderColor: '#061530', borderWidth: 2 },
      data: statistics.businessTypeDistribution.map((d, i) => ({
        name: d.name, value: d.count,
        itemStyle: { color: ['#22d3ee', '#3b82f6', '#818cf8', '#f472b6', '#facc15', '#94a3b8'][i % 6] },
      })),
    }],
  }), [statistics]);

  // ─── 月度趋势 ───
  const trendOption = useMemo((): echarts.EChartsOption => ({
    grid: { left: 30, right: 10, top: 16, bottom: 20 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6,20,45,.92)', borderColor: 'rgba(34,211,238,.4)', textStyle: { color: '#d7f5ff', fontSize: 12 } },
    xAxis: {
      type: 'category',
      data: statistics.monthlyTrend.map(m => m.month.slice(2)),
      axisLine: { lineStyle: { color: 'rgba(80,140,200,.4)' } },
      axisLabel: { color: 'rgba(160,205,245,.75)', fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(80,140,200,.12)' } },
      axisLabel: { color: 'rgba(160,205,245,.75)', fontSize: 10 },
    },
    series: [{
      type: 'line',
      data: statistics.monthlyTrend.map(m => m.count),
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: '#22d3ee', width: 2, shadowColor: 'rgba(34,211,238,.6)', shadowBlur: 8 },
      itemStyle: { color: '#22d3ee' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(34,211,238,.35)' },
            { offset: 1, color: 'rgba(34,211,238,0)' },
          ],
        } as never,
      },
    }],
  }), [statistics]);

  // ─── 设备在线率 ───
  const deviceOption = useMemo((): echarts.EChartsOption => {
    const rate = deviceStats.total ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0;
    return {
      series: [{
        type: 'pie',
        radius: ['64%', '82%'],
        center: ['50%', '50%'],
        silent: true,
        label: { show: false },
        data: [
          { value: deviceStats.online, itemStyle: { color: '#22d3ee', shadowColor: 'rgba(34,211,238,.6)', shadowBlur: 10 } },
          { value: deviceStats.offline, itemStyle: { color: 'rgba(80,110,160,.35)' } },
        ],
      }, {
        type: 'pie',
        radius: ['0%', '0%'],
        center: ['50%', '50%'],
        silent: true,
        label: {
          show: true, position: 'center',
          formatter: `{v|${rate}%}\n{t|在线率}`,
          rich: {
            v: { color: '#7ff3ff', fontSize: 20, fontWeight: 700, lineHeight: 26 },
            t: { color: 'rgba(170,215,250,.7)', fontSize: 10 },
          },
        },
        data: [{ value: 1, itemStyle: { color: 'transparent' } }],
      }],
    };
  }, [deviceStats]);

  const maxStreet = Math.max(...statistics.streetDistribution.map(s => s.count), 1);

  const overviewCards = [
    { label: '企业总数', value: stats.total, suffix: '家', icon: Building2, color: 'text-cyan-300' },
    { label: '已排查', value: stats.inspected, suffix: '家', icon: ClipboardCheck, color: 'text-emerald-300' },
    { label: '设施安装率', value: stats.installRate, suffix: '%', icon: Wrench, color: 'text-blue-300' },
    { label: '排放达标率', value: stats.upToStandardRate, suffix: '%', icon: BadgeCheck, color: 'text-amber-300' },
  ];

  const warnings = [
    { label: '排放超标企业', list: stats.exceedList, icon: XCircle, textColor: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
    { label: '排污许可已过期', list: stats.expiredPermit, icon: FileWarning, textColor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
    { label: '未安装净化设施', list: stats.noFacility, icon: AlertTriangle, textColor: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' },
    { label: '噪声扰民投诉', list: stats.noiseComplaint, icon: Volume2, textColor: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/25' },
  ];

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col text-white select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0a1f4d 0%, #050f2a 45%, #02060f 100%)',
        fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* 网格背景 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* ─── 头部 ─── */}
      <header className="relative z-10 flex items-center justify-between px-6 h-[68px] flex-shrink-0">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="w-[320px] flex items-center gap-3">
          <button
            onClick={() => navigate('/enterprises')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-200 border border-cyan-500/30 rounded bg-cyan-500/10 hover:bg-cyan-500/25 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回平台
          </button>
          <span className="text-[11px] text-cyan-300/60 tracking-widest">NINGBO HI-TECH ZONE</span>
        </div>

        <div className="relative text-center">
          <h1 className="text-[26px] font-bold tracking-[0.2em] bg-gradient-to-b from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
            宁波高新区餐饮油烟智慧监管驾驶舱
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-400/70" />
            <span className="text-[10px] tracking-[0.4em] text-cyan-300/70">一 企 一 档 · 智 慧 监 管</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-400/70" />
          </div>
        </div>

        <div className="w-[320px] text-right">
          <div className="text-lg font-mono text-cyan-200 tabular-nums drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          </div>
          <div className="text-[11px] text-cyan-300/60">
            {now.getFullYear()}-{pad(now.getMonth() + 1)}-{pad(now.getDate())} {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}
          </div>
        </div>
      </header>

      {/* ─── 主体 ─── */}
      <main className="relative z-10 flex-1 grid grid-cols-[330px_1fr_330px] gap-3 px-4 pb-4 pt-3 min-h-0">

        {/* 左列 */}
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="企业总览">
            <div className="grid grid-cols-2 gap-2">
              {overviewCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-cyan-400/[0.06] border border-cyan-500/15 rounded px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-100/60">
                      <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                      {card.label}
                    </div>
                    <div className="mt-1">
                      <AnimatedNumber value={card.value} suffix={card.suffix}
                        className={`text-[22px] font-bold font-mono ${card.color} drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="街道分布">
            <div className="space-y-2 py-1">
              {statistics.streetDistribution.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="text-[11px] text-cyan-100/70 w-14 truncate">{s.name}</span>
                  <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-1000"
                      style={{ width: `${(s.count / maxStreet) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-200 w-7 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="经营类型分布" className="flex-1 min-h-0">
            <Chart option={typeOption} height={170} />
          </Panel>
        </div>

        {/* 中列：地图 */}
        <div className="relative min-h-0">
          <Panel title="高新区企业热力分布" className="h-full flex flex-col" icon={<span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />}>
            <div className="relative" style={{ height: 'calc(100% - 0px)' }}>
              <Chart option={mapOption} height={Math.max(window.innerHeight - 220, 420)} onClick={handleMapClick} />
              {/* 图例 */}
              <div className="absolute left-2 bottom-2 bg-[#061530]/80 border border-cyan-500/20 rounded px-2.5 py-2 text-[10px] text-cyan-100/70 space-y-1">
                <div className="text-cyan-200/90 font-semibold mb-1">热力点（企业数量）</div>
                {[['#22d3ee', '1-4 家'], ['#38bdf8', '5-9 家'], ['#facc15', '10-19 家'], ['#f97316', '20+ 家']].map(([c, t]) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* 企业清单浮层 */}
          {overlay && (
            <div className="absolute right-3 top-3 bottom-3 w-[330px] z-20 flex flex-col bg-[#071733]/95 backdrop-blur border border-cyan-400/30 rounded shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-cyan-500/20">
                <span className="text-[13px] font-semibold text-cyan-100">{overlay.title}</span>
                <button onClick={() => setOverlay(null)} className="p-1 rounded hover:bg-white/10 transition-colors">
                  <XCircle className="w-4 h-4 text-cyan-300/70" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 cockpit-scroll">
                {overlay.list.map(e => (
                  <div key={e.id} className="bg-cyan-400/[0.05] border border-cyan-500/15 rounded p-2.5 hover:border-cyan-400/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-cyan-50 truncate">{e.storeName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.hasPretreatment ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                        {e.hasPretreatment ? '已装设施' : '未装设施'}
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-100/50 mt-1 truncate">{e.street} · {e.actualAddress}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button onClick={() => openDetail(e)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-blue-500/20 text-blue-200 hover:bg-blue-500/35 transition-colors">
                        <Eye className="w-3 h-3" />一企一档
                      </button>
                      <button onClick={() => setReportEnt(e)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-violet-500/20 text-violet-200 hover:bg-violet-500/35 transition-colors">
                        <FileText className="w-3 h-3" />报告
                      </button>
                      <button onClick={() => setDeviceEnt(e)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/35 transition-colors">
                        <Cpu className="w-3 h-3" />设备
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右列 */}
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="监测设备">
            <div className="flex items-center gap-3">
              <div className="w-[110px] flex-shrink-0">
                <Chart option={deviceOption} height={110} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-cyan-400/[0.06] rounded px-2 py-1.5">
                  <div className="text-cyan-100/55">设备总数</div>
                  <div className="text-cyan-200 font-mono font-bold text-base">{deviceStats.total}<span className="text-[10px] font-normal ml-0.5">台</span></div>
                </div>
                <div className="bg-cyan-400/[0.06] rounded px-2 py-1.5">
                  <div className="text-cyan-100/55">在线设备</div>
                  <div className="text-emerald-300 font-mono font-bold text-base">{deviceStats.online}<span className="text-[10px] font-normal ml-0.5">台</span></div>
                </div>
                <div className="bg-cyan-400/[0.06] rounded px-2 py-1.5">
                  <div className="text-cyan-100/55">净化器故障</div>
                  <div className="text-red-300 font-mono font-bold text-base">{deviceStats.purifierFault}<span className="text-[10px] font-normal ml-0.5">台</span></div>
                </div>
                <div className="bg-cyan-400/[0.06] rounded px-2 py-1.5">
                  <div className="text-cyan-100/55">油烟超标</div>
                  <div className="text-amber-300 font-mono font-bold text-base">{deviceStats.fumeExceed}<span className="text-[10px] font-normal ml-0.5">台</span></div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="预警信息">
            <div className="space-y-1.5">
              {warnings.map(w => {
                const Icon = w.icon;
                return (
                  <button
                    key={w.label}
                    onClick={() => setOverlay({ title: `${w.label}（${w.list.length} 家）`, list: w.list })}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded border ${w.bg} hover:brightness-125 transition-all`}
                  >
                    <Icon className={`w-4 h-4 ${w.textColor}`} />
                    <span className="text-[12px] text-cyan-50/85 flex-1 text-left">{w.label}</span>
                    <span className={`text-base font-bold font-mono ${w.textColor}`}>{w.list.length}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="月度排查趋势" className="flex-1 min-h-0">
            <Chart option={trendOption} height={150} />
          </Panel>
        </div>
      </main>

      {/* 一企一档抽屉 + 弹窗（深色驾驶舱之上复用浅色组件） */}
      <EnterpriseDetail />
      <ReportModal open={!!reportEnt} onClose={() => setReportEnt(null)} enterprise={reportEnt} />
      <DeviceInfoModal open={!!deviceEnt} onClose={() => setDeviceEnt(null)} enterprise={deviceEnt} />

      <style>{`
        .cockpit-scroll::-webkit-scrollbar { width: 4px; }
        .cockpit-scroll::-webkit-scrollbar-thumb { background: rgba(34,211,238,.3); border-radius: 2px; }
        .cockpit-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
