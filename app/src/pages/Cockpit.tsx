import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { Enterprise } from '@/types';
import { getDeviceStatistics } from '@/data/enterprises';
import EnterpriseDetail from '@/components/EnterpriseDetail';
import ReportModal from '@/components/ReportModal';
import DeviceInfoModal from '@/components/DeviceInfoModal';
import {
  Building2, ClipboardCheck, Wrench, FileCog, ArrowLeft, Maximize, Minimize,
  XCircle, FileWarning, AlertTriangle, Volume2, MapPin,
  ChevronLeft, ChevronRight, Eye, FileText, Cpu, Clock, X, Phone, User,
} from 'lucide-react';

// ─── 设计稿基准分辨率（整体等比缩放适配） ─────────────────
const DESIGN_W = 1920;
const DESIGN_H = 1080;

// ─── 手绘地图贴图（UI 设计师原图裁切，725×450） ────────────
const MAP_IMG = `${import.meta.env.BASE_URL}map/hightech-map.png`;

// ─── 通用 ECharts 容器 ──────────────────────────────────
function Chart({ option, height }: {
  option: echarts.EChartsOption; height: number | string;
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
  }, [option]);

  return <div ref={ref} style={{ height, width: '100%' }} />;
}

// ─── 面板（按效果图：深蓝底 + 细蓝边 + 标题左侧竖条） ──────
function Panel({ title, subtitle, right, children, className = '', bodyClassName = '' }: {
  title?: string; subtitle?: string; right?: React.ReactNode;
  children: React.ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-[4px] border ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(15,40,88,0.62), rgba(7,20,48,0.62))',
        borderColor: 'rgba(56,130,220,0.38)',
        boxShadow: 'inset 0 0 24px rgba(20,80,180,0.12)',
      }}
    >
      {title && (
        <div className="flex items-center gap-2 px-3 h-[38px] flex-shrink-0 border-b" style={{ borderColor: 'rgba(56,130,220,0.22)' }}>
          <span className="w-[3px] h-[14px] rounded-full" style={{ background: 'linear-gradient(180deg,#4de3ff,#1e6fff)', boxShadow: '0 0 6px rgba(77,227,255,.8)' }} />
          <span className="text-[14px] font-bold text-[#dcecff] tracking-wide">{title}</span>
          {subtitle && <span className="text-[10px] text-[#5f83b8] ml-0.5">{subtitle}</span>}
          <span className="flex-1" />
          {right}
        </div>
      )}
      <div className={`flex-1 min-h-0 px-3 py-2 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

// ─── 数字滚动 ───────────────────────────────────────────
function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
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
  return <span className={className}>{display.toLocaleString()}</span>;
}

// ─── 街道聚合（贴图方案：每个街道一个聚合点，位置按手绘地图热力区标定） ───
interface Cluster {
  key: string;
  name: string;
  x: number; // 地图图片上的百分比横坐标
  y: number; // 地图图片上的百分比纵坐标
  enterprises: Enterprise[];
}

/** 各街道在手绘地图上的点位（对应热力聚集区，百分比坐标） */
const STREET_POS: Record<string, { x: number; y: number }> = {
  贵驷街道: { x: 47, y: 20 },
  新明街道: { x: 50, y: 41 },
  聚贤街道: { x: 38, y: 48 },
  梅墟街道: { x: 66, y: 51 },
  其他: { x: 57, y: 63 },
};

function clusterByStreet(enterprises: Enterprise[]): Cluster[] {
  const map = new Map<string, Enterprise[]>();
  enterprises.forEach(e => {
    const key = STREET_POS[e.street] ? e.street : '其他';
    map.set(key, [...(map.get(key) ?? []), e]);
  });
  return [...map.entries()].map(([name, list]) => ({
    key: name, name, ...STREET_POS[name], enterprises: list,
  }));
}

/** 效果图配色：1-4 蓝 / 5-9 绿 / 10-19 黄 / 20+ 橙 */
function clusterColor(count: number): string {
  if (count >= 20) return '#ff7a1a';
  if (count >= 10) return '#ffd32a';
  if (count >= 5) return '#1fd0a2';
  return '#2f7bff';
}

// ─── 风险等级 ───────────────────────────────────────────
function riskLevel(e: Enterprise): { label: string; cls: string } {
  if (e.emissionExceed === '超标' || e.noiseComplaint) return { label: '高', cls: 'text-[#ff4d5e] border-[#ff4d5e]/50 bg-[#ff4d5e]/10' };
  if (!e.hasPretreatment || e.pollutionPermit.status === '已过期') return { label: '中', cls: 'text-[#ff9f43] border-[#ff9f43]/50 bg-[#ff9f43]/10' };
  return { label: '低', cls: 'text-[#1fd0a2] border-[#1fd0a2]/50 bg-[#1fd0a2]/10' };
}

// ─── 地图缩略图（位置定位用） ────────────────────────────
function MapThumb({ markers, className = '' }: {
  markers: { x: number; y: number; color?: string; size?: number }[];
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img src={MAP_IMG} alt="高新区地图" draggable={false}
        className="absolute inset-0 w-full h-full object-cover opacity-75" />
      {markers.map((m, i) => {
        const s = m.size ?? 8;
        const c = m.color ?? '#ffd32a';
        return (
          <span key={i} className="absolute rounded-full"
            style={{
              left: `${m.x}%`, top: `${m.y}%`, width: s, height: s,
              transform: 'translate(-50%,-50%)',
              background: c, boxShadow: `0 0 ${s}px ${c}`,
            }} />
        );
      })}
    </div>
  );
}

// ─── 详情小节（深色主题） ────────────────────────────────
function DSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border px-3 py-2.5"
      style={{ background: 'rgba(30,80,160,.10)', borderColor: 'rgba(56,130,220,0.2)' }}>
      <div className="flex items-center gap-1.5 mb-2 text-[12px] font-bold text-[#9fd0ff]">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function DRow({ k, v, cls = 'text-[#c9e2ff]' }: { k: string; v: React.ReactNode; cls?: string }) {
  return (
    <div className="flex justify-between gap-2 py-[2px]">
      <span className="text-[#5f83b8] flex-shrink-0">{k}</span>
      <span className={`text-right truncate ${cls}`}>{v}</span>
    </div>
  );
}

// ═══ 主页面 ═══════════════════════════════════════════════
export default function Cockpit() {
  const { state, dispatch, statistics } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedEnt, setSelectedEnt] = useState<Enterprise | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [reportEnt, setReportEnt] = useState<Enterprise | null>(null);
  const [deviceEnt, setDeviceEnt] = useState<Enterprise | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const enterprises = state.enterprises;
  const deviceStats = useMemo(() => getDeviceStatistics(enterprises), [enterprises]);

  // 时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 等比缩放适配
  useEffect(() => {
    const fit = () => {
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      setScale(s);
      setOffset({
        x: (window.innerWidth - DESIGN_W * s) / 2,
        y: (window.innerHeight - DESIGN_H * s) / 2,
      });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // 统计口径
  const stats = useMemo(() => {
    const total = enterprises.length;
    const inspected = enterprises.filter(e => e.status === '已排查').length;
    const deviceGoodRate = deviceStats.total
      ? Math.round(((deviceStats.total - deviceStats.purifierFault) / deviceStats.total) * 100)
      : 100;
    const exceedList = enterprises.filter(e => e.emissionExceed === '超标');
    const expiredPermit = enterprises.filter(e => e.pollutionPermit.status === '已过期');
    const noFacility = enterprises.filter(e => !e.hasPretreatment);
    const noiseComplaint = enterprises.filter(e => e.noiseComplaint);
    return { total, inspected, deviceGoodRate, exceedList, expiredPermit, noFacility, noiseComplaint };
  }, [enterprises, deviceStats]);

  const clusters = useMemo(() => clusterByStreet(enterprises), [enterprises]);

  const onlineRate = deviceStats.total ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0;

  // ─── 月度登记趋势（渐变柱状图） ───
  const trendOption = useMemo((): echarts.EChartsOption => ({
    grid: { left: 28, right: 8, top: 10, bottom: 20 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6,20,45,.92)', borderColor: 'rgba(63,210,255,.4)', textStyle: { color: '#d7f5ff', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: statistics.monthlyTrend.map(m => m.month),
      axisLine: { lineStyle: { color: 'rgba(80,140,200,.35)' } },
      axisLabel: { color: 'rgba(140,185,235,.8)', fontSize: 9, interval: 0, rotate: 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(80,140,200,.12)' } },
      axisLabel: { color: 'rgba(140,185,235,.8)', fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: statistics.monthlyTrend.map(m => m.count),
      barWidth: 10,
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#4de3ff' }, { offset: 1, color: '#1e6fff' }],
        } as never,
        shadowColor: 'rgba(77,227,255,.4)', shadowBlur: 6,
      },
    }],
  }), [statistics]);

  // ─── 设备在线率环形 ───
  const ringOption = useMemo((): echarts.EChartsOption => ({
    series: [{
      type: 'pie', radius: ['70%', '88%'], center: ['50%', '50%'], silent: true,
      label: {
        show: true, position: 'center',
        formatter: `{v|${onlineRate}%}\n{t|在线率}`,
        rich: {
          v: { color: '#ffffff', fontSize: 20, fontWeight: 700, lineHeight: 24 },
          t: { color: 'rgba(140,185,235,.85)', fontSize: 10 },
        },
      },
      data: [
        { value: deviceStats.online, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#4de3ff' }, { offset: 1, color: '#1e6fff' }] } as never, shadowColor: 'rgba(77,227,255,.55)', shadowBlur: 12 } },
        { value: deviceStats.offline, itemStyle: { color: 'rgba(70,105,165,.35)' } },
      ],
    }],
  }), [deviceStats, onlineRate]);

  const openFullDetail = (e: Enterprise) => {
    dispatch({ type: 'SELECT_ENTERPRISE', payload: e });
    dispatch({ type: 'TOGGLE_DRAWER' });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const closeOverlay = () => {
    setSelectedCluster(null);
    setSelectedEnt(null);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  // 本月/上月
  const monthDiff = statistics.thisMonthCount - statistics.lastMonthCount;
  const monthPercent = statistics.lastMonthCount > 0
    ? Math.round((monthDiff / statistics.lastMonthCount) * 100)
    : 0;

  // 浮层表格分页
  const PAGE_SIZE = 6;
  const clusterList = selectedCluster?.enterprises ?? [];
  const totalPages = Math.max(1, Math.ceil(clusterList.length / PAGE_SIZE));
  const pageList = clusterList.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE);

  const overviewStats = [
    { label: '企业总数', value: stats.total, unit: '家', icon: Building2, color: '#4de3ff' },
    { label: '已排查', value: stats.inspected, unit: '家', icon: ClipboardCheck, color: '#1fd0a2' },
    { label: '设施完好率', value: stats.deviceGoodRate, unit: '%', icon: Wrench, color: '#ffd32a' },
  ];

  const kpiCards = [
    { label: '总登记数', value: statistics.total, unit: '家', desc: '全区登记餐饮企业', icon: Building2, color: '#4de3ff' },
    { label: '已安装净化设施', value: statistics.pretreatmentCount, unit: '家', desc: `安装率 ${statistics.total ? Math.round((statistics.pretreatmentCount / statistics.total) * 100) : 0}%`, icon: Wrench, color: '#1fd0a2' },
    { label: '有清洗频次企业', value: statistics.cleaningCycleCount, unit: '家', desc: '已填写几周/月/年', icon: FileCog, color: '#ffd32a' },
  ];

  const warnings = [
    { label: '排放超标企业', count: stats.exceedList.length, icon: XCircle, color: '#ff4d5e' },
    { label: '排污许可已过期', count: stats.expiredPermit.length, icon: FileWarning, color: '#ff9f43' },
    { label: '未安装净化设施', count: stats.noFacility.length, icon: AlertTriangle, color: '#ffb84d' },
    { label: '噪声扰民投诉', count: stats.noiseComplaint.length, icon: Volume2, color: '#b06bff' },
  ];

  const maxStreet = Math.max(...statistics.streetDistribution.map(s => s.count), 1);
  const maxBiz = Math.max(...statistics.businessTypeDistribution.map(s => s.count), 1);
  const scaleTotal = Math.max(statistics.scaleDistribution.reduce((s, x) => s + x.count, 0), 1);

  const selectedPos = selectedEnt
    ? (STREET_POS[selectedEnt.street] ?? STREET_POS['其他'])
    : null;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#01060f' }}>
      <div
        style={{
          width: DESIGN_W, height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute', left: offset.x, top: offset.y,
          background: 'radial-gradient(ellipse at 50% 28%, #072051 0%, #03102c 52%, #010714 100%)',
          fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
        className="text-white select-none flex flex-col"
      >
        {/* ═══ 头部 ═══ */}
        <header className="relative h-[72px] flex-shrink-0 flex items-center justify-between px-5">
          {/* 底部光带 */}
          <div className="absolute inset-x-0 bottom-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(63,210,255,.7) 20%, rgba(63,210,255,.7) 80%, transparent)' }} />
          {/* 标题两翼装饰 */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[720px] h-[46px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(30,111,255,.25) 50%, transparent)',
              clipPath: 'polygon(0 100%, 12% 30%, 50% 0, 88% 30%, 100% 100%)',
              borderBottom: '2px solid rgba(63,210,255,.5)',
            }} />

          <div className="w-[360px] flex items-center gap-3 text-[#9fd0ff]">
            <Clock className="w-4 h-4 text-[#4de3ff]" />
            <span className="text-[14px] font-mono tabular-nums tracking-wide">
              {now.getFullYear()}.{pad(now.getMonth() + 1)}.{pad(now.getDate())} {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
            </span>
          </div>

          <div className="relative z-10 text-center -mt-1">
            <h1 className="text-[30px] font-bold tracking-[0.12em]"
              style={{
                background: 'linear-gradient(180deg, #ffffff 20%, #a5e6ff 65%, #4dc3ff 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                textShadow: '0 0 24px rgba(77,195,255,0.35)',
              }}>
              宁波高新区餐饮油烟智慧监管驾驶舱
            </h1>
            <div className="text-[11px] tracking-[0.55em] text-[#6fa8e0] mt-0.5 ml-2">一 企 一 档 · 智 慧 监 管</div>
          </div>

          <div className="w-[360px] flex items-center justify-end gap-2">
            <button onClick={() => navigate('/enterprises')}
              className="flex items-center gap-1.5 px-3 h-[30px] text-[12px] text-[#9fd0ff] border rounded-[3px] transition-colors hover:bg-[#1e6fff]/20"
              style={{ borderColor: 'rgba(63,210,255,.4)', background: 'rgba(30,111,255,.12)' }}>
              <ArrowLeft className="w-3.5 h-3.5" />返回平台
            </button>
            <button onClick={toggleFullscreen}
              className="flex items-center justify-center w-[30px] h-[30px] text-[#9fd0ff] border rounded-[3px] transition-colors hover:bg-[#1e6fff]/20"
              style={{ borderColor: 'rgba(63,210,255,.4)', background: 'rgba(30,111,255,.12)' }}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* ═══ 主区域 ═══ */}
        <div className="flex-1 min-h-0 grid gap-2.5 px-3 pt-2.5 pb-3" style={{ gridTemplateColumns: '330px 1fr 350px' }}>

          {/* ─── 左列 ─── */}
          <div className="flex flex-col gap-2.5 min-h-0">
            <Panel title="企业总览" className="h-[118px]">
              <div className="grid grid-cols-3 gap-2 h-full items-center">
                {overviewStats.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-[38px] h-[38px] rounded-[6px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${s.color}1f`, border: `1px solid ${s.color}55` }}>
                        <Icon className="w-[18px] h-[18px]" style={{ color: s.color }} />
                      </div>
                      <div>
                        <div className="text-[11px] text-[#7fa8d9]">{s.label}</div>
                        <div className="text-[22px] font-bold leading-tight font-mono">
                          <AnimatedNumber value={s.value} />
                          <span className="text-[11px] font-normal text-[#7fa8d9] ml-0.5">{s.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="街道分布" subtitle="企业登记数量排名" className="flex-1">
              <div className="space-y-[13px] pt-1.5">
                {statistics.streetDistribution.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[12px] text-[#a9c8ec] w-[60px]">{s.name}</span>
                    <div className="flex-1 h-[10px] rounded-full" style={{ background: 'rgba(30,80,160,.25)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(s.count / maxStreet) * 100}%`,
                          background: 'linear-gradient(90deg,#1e6fff,#4de3ff)',
                          boxShadow: '0 0 8px rgba(77,227,255,.45)',
                        }} />
                    </div>
                    <span className="text-[13px] font-mono font-bold text-white w-[22px] text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="经营类型分布" subtitle="餐饮企业主要经商业态" className="flex-1">
              <div className="space-y-[9px] pt-1">
                {statistics.businessTypeDistribution.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[12px] text-[#a9c8ec] w-[48px]">{s.name}</span>
                    <div className="flex-1 h-[9px] rounded-full" style={{ background: 'rgba(30,80,160,.25)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(s.count / maxBiz) * 100}%`,
                          background: 'linear-gradient(90deg,#1e6fff,#4de3ff)',
                        }} />
                    </div>
                    <span className="text-[12px] font-mono text-white w-[34px] text-right">{s.count} <span className="text-[10px] text-[#7fa8d9]">家</span></span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="经营场所" subtitle="企业主要场所类型" className="h-[118px]">
              <div className="grid grid-cols-3 gap-2 h-full items-center">
                {statistics.venueDistribution.map(v => (
                  <div key={v.name} className="text-center rounded-[4px] py-2"
                    style={{ background: 'rgba(30,111,255,.08)', border: '1px solid rgba(56,130,220,.25)' }}>
                    <div className="text-[11px] text-[#7fa8d9]">{v.name}</div>
                    <div className="text-[20px] font-bold font-mono mt-0.5">
                      <AnimatedNumber value={v.count} /><span className="text-[10px] font-normal text-[#7fa8d9] ml-0.5">家</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#4de3ff]">{Math.round((v.count / Math.max(statistics.total, 1)) * 100)}%</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* ─── 中列 ─── */}
          <div className="flex flex-col gap-2.5 min-h-0">
            {/* KPI 卡片 */}
            <div className="grid grid-cols-3 gap-2.5 h-[96px] flex-shrink-0">
              {kpiCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[4px] border flex items-center gap-3 px-4"
                    style={{
                      background: 'linear-gradient(180deg, rgba(15,40,88,0.62), rgba(7,20,48,0.62))',
                      borderColor: 'rgba(56,130,220,0.38)',
                    }}>
                    <div className="w-[46px] h-[46px] rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{ background: `${card.color}1a`, border: `1px solid ${card.color}55`, boxShadow: `0 0 14px ${card.color}33` }}>
                      <Icon className="w-[22px] h-[22px]" style={{ color: card.color }} />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#7fa8d9]">{card.label}</div>
                      <div className="text-[26px] font-bold font-mono leading-tight">
                        <AnimatedNumber value={card.value} />
                        <span className="text-[12px] font-normal text-[#7fa8d9] ml-1">{card.unit}</span>
                      </div>
                      <div className="text-[10px] text-[#5f83b8]">{card.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 地图（手绘贴图 + 街道聚合气泡，标题与图例已烘焙在图内） */}
            <Panel className="flex-1 min-h-0" bodyClassName="!p-0 relative">
              <img src={MAP_IMG} alt="高新区企业热力分布" draggable={false}
                className="absolute inset-0 w-full h-full object-fill" />
              {clusters.map(c => {
                const count = c.enterprises.length;
                const color = clusterColor(count);
                const size = Math.min(38 + count * 1.8, 78);
                return (
                  <div key={c.key} className="absolute"
                    style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)' }}>
                    <button
                      onClick={() => { setSelectedCluster(c); setSelectedEnt(null); setTablePage(1); }}
                      className="relative group flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 cursor-pointer"
                      style={{
                        width: size, height: size,
                        background: `radial-gradient(circle, ${color} 0%, ${color}cc 52%, ${color}1e 100%)`,
                        boxShadow: `0 0 ${Math.round(size / 1.8)}px ${color}99`,
                      }}>
                      {/* 外圈装饰环（效果图同款） */}
                      <span className="absolute rounded-full border pointer-events-none animate-pulse"
                        style={{ inset: -9, borderColor: `${color}55` }} />
                      <span className="text-white font-bold drop-shadow-md" style={{ fontSize: count >= 10 ? 17 : 15 }}>
                        {count}
                      </span>
                      {/* hover 提示 */}
                      <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#d7f5ff] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20"
                        style={{ background: 'rgba(6,20,45,.95)', border: '1px solid rgba(63,210,255,.4)' }}>
                        <span className="font-bold">{c.name} · 企业数量：{count} 家</span><br />
                        <span className="text-[#7fa8d9]">点击查看企业清单</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </Panel>

            {/* 企业规模 + 合规汇总 */}
            <div className="grid grid-cols-2 gap-2.5 h-[128px] flex-shrink-0">
              <Panel title="企业规模" subtitle="小型 / 中型 / 大型分布" bodyClassName="flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {statistics.scaleDistribution.map(s => (
                    <div key={s.name} className="text-center">
                      <div className="text-[20px] font-bold font-mono">{s.count}<span className="text-[10px] font-normal text-[#7fa8d9] ml-0.5">家</span></div>
                      <div className="text-[11px] text-[#7fa8d9]">{s.name}</div>
                    </div>
                  ))}
                </div>
                <div className="h-[8px] rounded-full overflow-hidden flex" style={{ background: 'rgba(30,80,160,.25)' }}>
                  {['#4de3ff', '#1e6fff', '#7b5cff'].map((c, i) => (
                    <div key={c} className="h-full" style={{ width: `${(statistics.scaleDistribution[i].count / scaleTotal) * 100}%`, background: c }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-[#7fa8d9] font-mono">
                  {statistics.scaleDistribution.map(s => (
                    <span key={s.name}>{s.name} {Math.round((s.count / scaleTotal) * 100)}%</span>
                  ))}
                </div>
              </Panel>
              <Panel title="合规汇总" subtitle="净化设施安装与清洗周期设置情况" bodyClassName="flex flex-col justify-center gap-2.5">
                {[
                  { label: '已安装净化设施', value: statistics.pretreatmentCount, color: '#1fd0a2' },
                  { label: '已设置清洗周期', value: statistics.cleaningCycleCount, color: '#4de3ff' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between rounded-[4px] px-3 py-2"
                    style={{ background: `${r.color}14`, border: `1px solid ${r.color}44` }}>
                    <span className="flex items-center gap-2 text-[12px] text-[#c9e2ff]">
                      <span className="w-[6px] h-[6px] rounded-full" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }} />
                      {r.label}
                    </span>
                    <span className="text-[18px] font-bold font-mono" style={{ color: r.color }}>
                      {r.value}<span className="text-[10px] font-normal ml-0.5">家</span>
                    </span>
                  </div>
                ))}
              </Panel>
            </div>
          </div>

          {/* ─── 右列 ─── */}
          <div className="flex flex-col gap-2.5 min-h-0">
            <Panel title="监测设备" className="h-[168px]">
              <div className="flex h-full items-center">
                <div className="w-[130px] flex-shrink-0">
                  <Chart option={ringOption} height={128} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-3">
                  {[
                    { label: '设备总数', value: deviceStats.total, color: '#ffffff' },
                    { label: '在线设备', value: deviceStats.online, color: '#ffffff' },
                    { label: '净化器故障', value: deviceStats.purifierFault, color: '#ff4d5e' },
                    { label: '油烟超标', value: deviceStats.fumeExceed, color: '#ff9f43' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-[11px] text-[#7fa8d9]">{s.label}</div>
                      <div className="text-[20px] font-bold font-mono leading-tight" style={{ color: s.color }}>
                        <AnimatedNumber value={s.value} /><span className="text-[10px] font-normal text-[#7fa8d9] ml-0.5">台</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="预警信息" className="flex-1" bodyClassName="flex flex-col justify-center gap-2.5">
              {warnings.map(w => {
                const Icon = w.icon;
                return (
                  <button key={w.label}
                    onClick={() => {
                      const listMap: Record<string, Enterprise[]> = {
                        排放超标企业: stats.exceedList,
                        排污许可已过期: stats.expiredPermit,
                        未安装净化设施: stats.noFacility,
                        噪声扰民投诉: stats.noiseComplaint,
                      };
                      setSelectedCluster({ key: w.label, name: w.label, x: 50, y: 50, enterprises: listMap[w.label] });
                      setSelectedEnt(null);
                      setTablePage(1);
                    }}
                    className="flex items-center gap-2.5 rounded-[4px] px-3 py-[9px] text-left transition-all hover:brightness-150"
                    style={{ background: `${w.color}12`, border: `1px solid ${w.color}40` }}>
                    <Icon className="w-[16px] h-[16px]" style={{ color: w.color }} />
                    <span className="flex-1 text-[13px] text-[#d5e8ff]">{w.label}</span>
                    <span className="text-[20px] font-bold font-mono" style={{ color: w.color }}>{w.count}</span>
                  </button>
                );
              })}
            </Panel>

            <Panel title="月度登记趋势" subtitle="近12个月企业登记数量变化" className="h-[178px]"
              right={<span className="text-[10px] text-[#5f83b8]">近 12 个月 &gt;</span>}>
              <Chart option={trendOption} height="100%" />
            </Panel>

            <Panel title="本月登记动态" subtitle="与上月登记量对比" className="h-[118px]">
              <div className="grid grid-cols-3 gap-2 h-full items-center">
                <div className="text-center">
                  <div className="text-[11px] text-[#7fa8d9]">本月</div>
                  <div className="text-[22px] font-bold font-mono text-[#4de3ff]"><AnimatedNumber value={statistics.thisMonthCount} /><span className="text-[10px] font-normal ml-0.5">家</span></div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-[#7fa8d9]">上月</div>
                  <div className="text-[22px] font-bold font-mono"><AnimatedNumber value={statistics.lastMonthCount} /><span className="text-[10px] font-normal ml-0.5">家</span></div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-[#7fa8d9]">环比{monthDiff >= 0 ? '上升' : '下降'}</div>
                  <div className={`text-[22px] font-bold font-mono ${monthDiff >= 0 ? 'text-[#1fd0a2]' : 'text-[#ff4d5e]'}`}>
                    {monthDiff >= 0 ? '+' : ''}{monthDiff}<span className="text-[10px] font-normal ml-0.5">家</span>
                  </div>
                  <div className={`text-[10px] font-mono ${monthDiff >= 0 ? 'text-[#1fd0a2]' : 'text-[#ff4d5e]'}`}>{monthDiff >= 0 ? '+' : ''}{monthPercent}%</div>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* ═══ 点击聚合点 → 企业列表浮层 ═══ */}
        {selectedCluster && (
          <>
            <div className="absolute inset-0 z-40" style={{ background: 'rgba(1,6,15,.6)' }} onClick={closeOverlay} />
            <div className="absolute left-[220px] right-[220px] bottom-3 z-50 h-[300px] rounded-[4px] border flex flex-col overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(15,40,88,0.94), rgba(7,20,48,0.94))', borderColor: 'rgba(56,130,220,0.45)', boxShadow: '0 0 40px rgba(10,40,110,.5)' }}>
              <div className="flex items-center gap-2 px-3 h-[38px] flex-shrink-0 border-b" style={{ borderColor: 'rgba(56,130,220,0.22)' }}>
                <span className="w-[3px] h-[14px] rounded-full" style={{ background: 'linear-gradient(180deg,#4de3ff,#1e6fff)' }} />
                <span className="text-[14px] font-bold text-[#dcecff]">
                  聚合点企业列表（{clusterList.length} 家）
                </span>
                <span className="text-[11px] text-[#5f83b8] ml-1">{selectedCluster.name}</span>
                <span className="flex-1" />
                <button onClick={closeOverlay} className="text-[#7fa8d9] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-[#7fa8d9]" style={{ background: 'rgba(30,80,160,.22)' }}>
                      {['序号', '企业名称', '经营类型', '净化设施状态', '在线状态', '最近清洗时间', '排放状态', '风险等级', '操作'].map(h => (
                        <th key={h} className="px-3 py-[7px] font-normal text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageList.map((e, i) => {
                      const risk = riskLevel(e);
                      const online = (e.devices ?? []).some(d => d.online);
                      return (
                        <tr key={e.id}
                          className={`border-t transition-colors cursor-pointer ${selectedEnt?.id === e.id ? 'bg-[#1e6fff]/20' : 'hover:bg-[#1e6fff]/10'}`}
                          style={{ borderColor: 'rgba(56,130,220,0.14)' }}
                          onClick={() => setSelectedEnt(e)}>
                          <td className="px-3 py-[7px] text-[#7fa8d9] font-mono">{(tablePage - 1) * PAGE_SIZE + i + 1}</td>
                          <td className="px-3 py-[7px] text-[#e6f3ff] whitespace-nowrap max-w-[180px] truncate">{e.storeName}</td>
                          <td className="px-3 py-[7px] text-[#a9c8ec]">{e.businessType}</td>
                          <td className="px-3 py-[7px]">{e.hasPretreatment ? <span className="text-[#1fd0a2]">正常</span> : <span className="text-[#ff9f43]">未安装</span>}</td>
                          <td className="px-3 py-[7px]">{online ? <span className="text-[#4de3ff]">在线</span> : <span className="text-[#7fa8d9]">离线</span>}</td>
                          <td className="px-3 py-[7px] text-[#a9c8ec] font-mono">{e.lastMaintenanceDate || '—'}</td>
                          <td className="px-3 py-[7px]">{e.emissionExceed === '超标' ? <span className="text-[#ff4d5e] font-bold">超标</span> : <span className="text-[#1fd0a2]">正常</span>}</td>
                          <td className="px-3 py-[7px]">
                            <span className={`px-1.5 py-0.5 rounded-[3px] border text-[10px] ${risk.cls}`}>{risk.label}</span>
                          </td>
                          <td className="px-3 py-[7px]">
                            <button onClick={ev => { ev.stopPropagation(); setSelectedEnt(e); }}
                              className="text-[#4de3ff] hover:text-white transition-colors">查看</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 分页 */}
              <div className="flex items-center justify-center gap-1.5 h-[32px] flex-shrink-0 border-t" style={{ borderColor: 'rgba(56,130,220,0.14)' }}>
                <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}
                  className="p-1 rounded text-[#7fa8d9] hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (tablePage <= 3) p = i + 1;
                  else if (tablePage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = tablePage - 2 + i;
                  return (
                    <button key={p} onClick={() => setTablePage(p)}
                      className={`w-[20px] h-[20px] text-[10px] rounded-[3px] font-mono transition-colors ${tablePage === p ? 'text-white' : 'text-[#7fa8d9] hover:text-white'}`}
                      style={tablePage === p ? { background: 'linear-gradient(135deg,#1e6fff,#4de3ff)' } : { border: '1px solid rgba(56,130,220,.3)' }}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage === totalPages}
                  className="p-1 rounded text-[#7fa8d9] hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-[#5f83b8] ml-2">共{clusterList.length}条</span>
              </div>
            </div>
          </>
        )}

        {/* ═══ 点击企业 → 右侧企业详情抽屉（深色科技风，内容与一企一档一致） ═══ */}
        {selectedEnt && (
          <div className="absolute top-3 bottom-3 right-3 z-[60] w-[560px] rounded-[4px] border flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(180deg, rgba(10,26,58,0.97), rgba(5,14,34,0.97))', borderColor: 'rgba(63,210,255,0.45)', boxShadow: '0 0 50px rgba(10,50,120,.55)' }}>
            {/* 详情头部 */}
            <div className="flex items-start gap-2 px-4 pt-3 pb-2.5 border-b flex-shrink-0" style={{ borderColor: 'rgba(56,130,220,0.25)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#e6f3ff] truncate">{selectedEnt.storeName}</span>
                  <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] flex-shrink-0" style={{ background: 'rgba(77,227,255,.15)', color: '#4de3ff', border: '1px solid rgba(77,227,255,.4)' }}>{selectedEnt.businessType}</span>
                  <span className={`px-1.5 py-0.5 rounded-[3px] border text-[10px] flex-shrink-0 ${riskLevel(selectedEnt).cls}`}>风险 {riskLevel(selectedEnt).label}</span>
                </div>
                <div className="text-[10px] text-[#5f83b8] mt-1 truncate">{selectedEnt.fullName}</div>
              </div>
              <button onClick={() => setSelectedEnt(null)} className="text-[#7fa8d9] hover:text-white transition-colors flex-shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 详情内容（滚动区） */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5 text-[11px]">
              {/* 全景照片 */}
              {selectedEnt.panoramaPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {selectedEnt.panoramaPhotos.slice(0, 3).map((p, idx) => (
                    <img key={idx} src={p} alt="全景" className="w-full h-[64px] object-cover rounded-[3px] opacity-90" />
                  ))}
                </div>
              )}

              {/* 企业基本信息 */}
              <DSection title="企业基本信息" icon={<Building2 className="w-3.5 h-3.5 text-[#4de3ff]" />}>
                <div className="grid grid-cols-2 gap-x-3">
                  <DRow k="统一社会信用代码" v={<span className="font-mono">{selectedEnt.creditCode}</span>} />
                  <DRow k="所属街道" v={selectedEnt.street} />
                  <DRow k="经营类型" v={<>{selectedEnt.businessType}{selectedEnt.otherBusinessType && <span className="text-[#ff9f43] ml-1">（{selectedEnt.otherBusinessType}）</span>}</>} />
                  <DRow k="经营场所" v={selectedEnt.venueType} />
                  <DRow k="企业规模" v={selectedEnt.scale} cls={selectedEnt.scale === '大型' ? 'text-[#ff4d5e]' : selectedEnt.scale === '中型' ? 'text-[#ffd32a]' : 'text-[#4de3ff]'} />
                  <DRow k="对应灶头总功率" v={`${selectedEnt.stovePower} (10⁸ J/h)`} />
                  <DRow k="最大基准灶头数" v={`${selectedEnt.maxStoveCount} 个`} />
                  <DRow k="排气罩投影面积" v={`${selectedEnt.hoodArea} m²`} />
                  <DRow k="营业时段" v={selectedEnt.businessHours} />
                  <DRow k="负责人" v={<span className="inline-flex items-center gap-1"><User className="w-3 h-3 text-[#5f83b8]" />{selectedEnt.owner}</span>} />
                  <DRow k="联系电话" v={<span className="inline-flex items-center gap-1 font-mono"><Phone className="w-3 h-3 text-[#5f83b8]" />{selectedEnt.phone}</span>} />
                </div>
                <div className="mt-1.5 pt-1.5 border-t" style={{ borderColor: 'rgba(56,130,220,0.15)' }}>
                  <DRow k="营业执照地址" v={selectedEnt.licenseAddress} />
                  <DRow k="实际经营地址" v={selectedEnt.actualAddress} />
                </div>
              </DSection>

              {/* 位置定位 */}
              <DSection title="位置定位" icon={<MapPin className="w-3.5 h-3.5 text-[#4de3ff]" />}>
                {selectedPos && (
                  <MapThumb className="h-[130px] rounded-[3px] border" 
                    markers={[{ x: selectedPos.x, y: selectedPos.y, color: '#ff4d5e', size: 10 }]} />
                )}
                <div className="grid grid-cols-2 gap-x-3 mt-1.5">
                  <DRow k="GPS坐标" v={<span className="font-mono">{selectedEnt.longitude.toFixed(4)}, {selectedEnt.latitude.toFixed(4)}</span>} />
                  <DRow k="周边敏感点" v={`${selectedEnt.sensitiveType}（${selectedEnt.sensitiveDistance}m）`} />
                </div>
              </DSection>

              {/* 合规登记情况 */}
              <DSection title="合规登记情况" icon={<ClipboardCheck className="w-3.5 h-3.5 text-[#1fd0a2]" />}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[3px] px-2.5 py-2" style={{ background: 'rgba(10,30,66,.5)', border: '1px solid rgba(56,130,220,.2)' }}>
                    <div className="text-[#5f83b8] text-[10px]">排污许可证</div>
                    <div className={`font-bold mt-0.5 ${selectedEnt.pollutionPermit.status === '已办理' ? 'text-[#1fd0a2]' : selectedEnt.pollutionPermit.status === '已过期' ? 'text-[#ff9f43]' : 'text-[#7fa8d9]'}`}>
                      {selectedEnt.pollutionPermit.status}
                    </div>
                    {selectedEnt.pollutionPermit.licenseNo && <div className="text-[10px] text-[#5f83b8] font-mono mt-0.5">{selectedEnt.pollutionPermit.licenseNo}</div>}
                    {selectedEnt.pollutionPermit.expiryDate && <div className="text-[10px] text-[#5f83b8]">有效期至：{selectedEnt.pollutionPermit.expiryDate}</div>}
                  </div>
                  <div className="rounded-[3px] px-2.5 py-2" style={{ background: 'rgba(10,30,66,.5)', border: '1px solid rgba(56,130,220,.2)' }}>
                    <div className="text-[#5f83b8] text-[10px]">环保备案</div>
                    <div className={`font-bold mt-0.5 ${selectedEnt.envRecord === '已备案' ? 'text-[#1fd0a2]' : 'text-[#7fa8d9]'}`}>{selectedEnt.envRecord}</div>
                  </div>
                </div>
              </DSection>

              {/* 油烟净化设施 */}
              <DSection title="油烟净化设施" icon={<Wrench className="w-3.5 h-3.5 text-[#4de3ff]" />}>
                <DRow k="是否安装" v={selectedEnt.hasPretreatment ? '已安装' : '未安装'} cls={selectedEnt.hasPretreatment ? 'text-[#1fd0a2]' : 'text-[#ff9f43]'} />
                {selectedEnt.hasPretreatment ? (
                  <>
                    <DRow k="设施类型" v={<>{selectedEnt.facilityType}{selectedEnt.otherFacilityType && <span className="text-[#ff9f43] ml-1">（{selectedEnt.otherFacilityType}）</span>}</>} />
                    <DRow k="清洗周期" v={selectedEnt.cleaningCycle && selectedEnt.cleaningCycleNumber > 0 ? `每${selectedEnt.cleaningCycleNumber}${selectedEnt.cleaningCycle}清洗一次` : '未填写'} />
                    <DRow k="最近维护日期" v={<span className="font-mono">{selectedEnt.lastMaintenanceDate}</span>} />
                    <DRow k="CMA检测报告" v={selectedEnt.hasCMA ? '有' : '无'} cls={selectedEnt.hasCMA ? 'text-[#1fd0a2]' : 'text-[#7fa8d9]'} />
                    {selectedEnt.cmaReportNo && <DRow k="报告编号" v={<span className="font-mono">{selectedEnt.cmaReportNo}</span>} />}
                  </>
                ) : (
                  <div className="text-[#7fa8d9] text-[10px] mt-1">{selectedEnt.noPretreatmentReason}</div>
                )}
                {selectedEnt.facilityPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {selectedEnt.facilityPhotos.slice(0, 3).map((p, idx) => (
                      <img key={idx} src={p} alt="设施" className="w-full h-[52px] object-cover rounded-[3px] opacity-90" />
                    ))}
                  </div>
                )}
              </DSection>

              {/* 管道与排放口 */}
              {(selectedEnt.indoorPipePhotos.length > 0 || selectedEnt.outdoorPipePhotos.length > 0) && (
                <DSection title="管道与排放口" icon={<FileCog className="w-3.5 h-3.5 text-[#4de3ff]" />}>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEnt.indoorPipePhotos[0] && (
                      <div>
                        <div className="text-[#5f83b8] text-[10px] mb-1">室内管道</div>
                        <img src={selectedEnt.indoorPipePhotos[0]} alt="室内管道" className="w-full h-[72px] object-cover rounded-[3px] opacity-90" />
                      </div>
                    )}
                    {selectedEnt.outdoorPipePhotos[0] && (
                      <div>
                        <div className="text-[#5f83b8] text-[10px] mb-1">外立面管道/排放口</div>
                        <img src={selectedEnt.outdoorPipePhotos[0]} alt="外立面管道" className="w-full h-[72px] object-cover rounded-[3px] opacity-90" />
                      </div>
                    )}
                  </div>
                </DSection>
              )}

              {/* 噪声排放登记 */}
              <DSection title="噪声排放登记" icon={<Volume2 className="w-3.5 h-3.5 text-[#ffd32a]" />}>
                <DRow k="主要噪声源" v={<>{selectedEnt.noiseSources.join('、') || '无'}{selectedEnt.otherNoiseSource && <span className="text-[#ff9f43] ml-1">（其他：{selectedEnt.otherNoiseSource}）</span>}</>} />
                <DRow k="降噪措施" v={selectedEnt.noiseMeasures.join('、') || '无'} />
                <DRow k="扰民投诉记录" v={selectedEnt.noiseComplaint ? '有' : '无'} cls={selectedEnt.noiseComplaint ? 'text-[#ff9f43]' : 'text-[#1fd0a2]'} />
                {selectedEnt.noiseComplaintDesc && <DRow k="投诉情况" v={selectedEnt.noiseComplaintDesc} />}
                <DRow k="噪声排放" v={selectedEnt.noiseExceed} cls={selectedEnt.noiseExceed === '达标无扰民' ? 'text-[#1fd0a2]' : 'text-[#ff9f43]'} />
              </DSection>

              {/* 现场排查记录 */}
              <DSection title="现场排查记录" icon={<ClipboardCheck className="w-3.5 h-3.5 text-[#4de3ff]" />}>
                <DRow k="油烟直排自然环境" v={selectedEnt.directDischarge ? '存在' : '不存在'} cls={selectedEnt.directDischarge ? 'text-[#ff9f43]' : 'text-[#1fd0a2]'} />
                {selectedEnt.directDischargeLocation && <DRow k="直排位置" v={selectedEnt.directDischargeLocation} />}
                <DRow k="设施配置情况" v={selectedEnt.facilityMissing} cls={selectedEnt.facilityMissing === '全部配置' ? 'text-[#1fd0a2]' : 'text-[#ff9f43]'} />
                <DRow k="油烟排放" v={<>{selectedEnt.emissionExceed}{selectedEnt.emissionExceedValue ? ` (${selectedEnt.emissionExceedValue})` : ''}</>} cls={selectedEnt.emissionExceed === '达标' ? 'text-[#1fd0a2]' : 'text-[#ff4d5e] font-bold'} />
              </DSection>

              {/* 排查登记信息 */}
              {selectedEnt.status === '已排查' && (
                <DSection title="排查登记信息" icon={<Clock className="w-3.5 h-3.5 text-[#4de3ff]" />}>
                  <div className="grid grid-cols-2 gap-x-3">
                    <DRow k="排查日期" v={<span className="font-mono">{selectedEnt.inspectionDate}</span>} />
                    <DRow k="现场调查人" v={selectedEnt.inspector} />
                    {selectedEnt.reviewer && <DRow k="数据复核人" v={selectedEnt.reviewer} />}
                  </div>
                </DSection>
              )}
            </div>

            {/* 底部操作 */}
            <div className="flex gap-2 px-4 py-2.5 border-t flex-shrink-0" style={{ borderColor: 'rgba(56,130,220,0.25)' }}>
              <button onClick={() => openFullDetail(selectedEnt)}
                className="flex items-center gap-1.5 px-3 py-[5px] text-[11px] rounded-[3px] text-white transition-colors"
                style={{ background: 'linear-gradient(135deg,#1e6fff,#4de3ff)' }}>
                <Eye className="w-3.5 h-3.5" />一企一档
              </button>
              <button onClick={() => setReportEnt(selectedEnt)}
                className="flex items-center gap-1.5 px-3 py-[5px] text-[11px] rounded-[3px] text-[#c9a7ff] transition-colors hover:brightness-150"
                style={{ background: 'rgba(139,92,246,.18)', border: '1px solid rgba(139,92,246,.45)' }}>
                <FileText className="w-3.5 h-3.5" />报告
              </button>
              <button onClick={() => setDeviceEnt(selectedEnt)}
                className="flex items-center gap-1.5 px-3 py-[5px] text-[11px] rounded-[3px] text-[#7ef0d4] transition-colors hover:brightness-150"
                style={{ background: 'rgba(31,208,162,.14)', border: '1px solid rgba(31,208,162,.45)' }}>
                <Cpu className="w-3.5 h-3.5" />设备信息
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 一企一档抽屉 + 弹窗 */}
      <EnterpriseDetail />
      <ReportModal open={!!reportEnt} onClose={() => setReportEnt(null)} enterprise={reportEnt} />
      <DeviceInfoModal open={!!deviceEnt} onClose={() => setDeviceEnt(null)} enterprise={deviceEnt} />
    </div>
  );
}
