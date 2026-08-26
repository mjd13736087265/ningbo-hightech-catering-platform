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
  Building2, ClipboardCheck, Wrench, FileCog, ArrowLeft, Maximize, Minimize,
  XCircle, FileWarning, AlertTriangle, Volume2, MapPin, MousePointerClick,
  ChevronLeft, ChevronRight, Eye, FileText, Cpu, Clock,
} from 'lucide-react';

// ─── 地图注册（模块级，保证在任何 setOption 之前完成） ────
echarts.registerMap('gaoxin', GAOXIN_GEOJSON as never);

// ─── 设计稿基准分辨率（整体等比缩放适配） ─────────────────
const DESIGN_W = 1920;
const DESIGN_H = 1080;

// ─── 通用 ECharts 容器 ──────────────────────────────────
function Chart({ option, height, onClick }: {
  option: echarts.EChartsOption; height: number | string;
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

// ─── 聚合逻辑（3 公里范围内企业合并为一个点） ─────────────
interface Cluster {
  lng: number;
  lat: number;
  enterprises: Enterprise[];
}

function clusterEnterprises(enterprises: Enterprise[]): Cluster[] {
  const LNG_THRESHOLD = 0.032; // ≈ 3km
  const LAT_THRESHOLD = 0.028;
  const clusters: Cluster[] = [];
  enterprises.forEach(e => {
    if (!e.longitude || !e.latitude) return;
    const found = clusters.find(
      c => Math.abs(c.lng - e.longitude) < LNG_THRESHOLD && Math.abs(c.lat - e.latitude) < LAT_THRESHOLD
    );
    if (found) {
      found.enterprises.push(e);
      found.lng = found.enterprises.reduce((s, x) => s + x.longitude, 0) / found.enterprises.length;
      found.lat = found.enterprises.reduce((s, x) => s + x.latitude, 0) / found.enterprises.length;
    } else {
      clusters.push({ lng: e.longitude, lat: e.latitude, enterprises: [e] });
    }
  });
  return clusters;
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

/** 周边行政区标注（装饰） */
const NEIGHBOR_LABELS = [
  { name: '慈溪市', lng: 121.568, lat: 30.005 },
  { name: '北仑区', lng: 121.706, lat: 29.895 },
  { name: '鄞州区', lng: 121.556, lat: 29.862 },
  { name: '奉化区', lng: 121.583, lat: 29.826 },
  { name: '宁海县', lng: 121.660, lat: 29.824 },
];

// ═══ 主页面 ═══════════════════════════════════════════════
export default function Cockpit() {
  const { state, dispatch, statistics } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [yinzhouReady, setYinzhouReady] = useState(false);
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

  // 鄞州区底图
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
    const deviceGoodRate = deviceStats.total
      ? Math.round(((deviceStats.total - deviceStats.purifierFault) / deviceStats.total) * 100)
      : 100;
    const exceedList = enterprises.filter(e => e.emissionExceed === '超标');
    const expiredPermit = enterprises.filter(e => e.pollutionPermit.status === '已过期');
    const noFacility = enterprises.filter(e => !e.hasPretreatment);
    const noiseComplaint = enterprises.filter(e => e.noiseComplaint);
    return { total, inspected, deviceGoodRate, exceedList, expiredPermit, noFacility, noiseComplaint };
  }, [enterprises, deviceStats]);

  const clusters = useMemo(() => clusterEnterprises(enterprises), [enterprises]);

  const onlineRate = deviceStats.total ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0;

  // ─── 地图配置 ───
  const mapOption = useMemo((): echarts.EChartsOption => {
    const geoIndex = yinzhouReady ? 1 : 0;
    const geos: echarts.EChartsOption['geo'] = [];
    if (yinzhouReady) {
      geos.push({
        map: 'yinzhou',
        boundingCoords: MAP_BOUNDS,
        silent: true,
        z: 1,
        itemStyle: {
          areaColor: 'rgba(10, 28, 62, 0.6)',
          borderColor: 'rgba(45, 95, 170, 0.45)',
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
          type: 'radial', x: 0.5, y: 0.45, r: 0.85,
          colorStops: [
            { offset: 0, color: 'rgba(21, 66, 138, 0.95)' },
            { offset: 1, color: 'rgba(8, 26, 60, 0.98)' },
          ],
        } as never,
        borderColor: '#3fd2ff',
        borderWidth: 2,
        shadowColor: 'rgba(63, 210, 255, 0.7)',
        shadowBlur: 24,
      },
      label: { show: false },
    });

    return {
      backgroundColor: 'transparent',
      geo: geos,
      series: [
        // 街道分界线
        {
          type: 'lines', coordinateSystem: 'geo', geoIndex, polyline: true, silent: true, z: 3,
          lineStyle: { color: 'rgba(94, 200, 255, 0.3)', width: 1, type: 'dashed' },
          data: STREET_LINES.map(l => ({ coords: l.path })),
        } as never,
        // 街道标注
        {
          type: 'scatter', coordinateSystem: 'geo', geoIndex, silent: true, z: 4, symbol: 'none',
          label: {
            show: true, formatter: (p: { name: string }) => p.name,
            color: 'rgba(150, 205, 255, 0.9)', fontSize: 12, fontWeight: 600,
            textShadowColor: 'rgba(0,10,30,0.9)', textShadowBlur: 4,
          },
          data: STREET_LABELS.map(s => ({ name: s.name, value: [s.lng, s.lat] })),
        } as never,
        // 周边行政区标注
        {
          type: 'scatter', coordinateSystem: 'geo', geoIndex, silent: true, z: 4, symbol: 'none',
          label: {
            show: true, formatter: (p: { name: string }) => p.name,
            color: 'rgba(110, 155, 215, 0.55)', fontSize: 12,
          },
          data: NEIGHBOR_LABELS.map(s => ({ name: s.name, value: [s.lng, s.lat] })),
        } as never,
        // 聚合热力点（柔光气泡 + 白色数量）
        {
          type: 'scatter', coordinateSystem: 'geo', geoIndex, z: 5,
          symbolSize: (val: number[]) => Math.min(30 + val[2] * 1.5, 68),
          label: {
            show: true, position: 'inside',
            formatter: (p: { data: { count: number } }) => String(p.data.count),
            color: '#ffffff', fontSize: 15, fontWeight: 700,
            textShadowColor: 'rgba(0,0,0,0.6)', textShadowBlur: 3,
          },
          tooltip: {
            formatter: (p: { data: { count: number; streets: string } }) =>
              `<div style="font-weight:600">该区域企业数量：${p.data.count} 家</div>` +
              `<div style="opacity:.75">覆盖：${p.data.streets}</div>` +
              `<div style="opacity:.6;margin-top:2px">点击查看企业清单</div>`,
          },
          data: clusters.map(c => {
            const color = clusterColor(c.enterprises.length);
            return {
              name: `${c.enterprises.length}家企业`,
              value: [c.lng, c.lat, c.enterprises.length],
              count: c.enterprises.length,
              streets: [...new Set(c.enterprises.map(e => e.street))].join('、'),
              cluster: c,
              itemStyle: {
                color: {
                  type: 'radial', x: 0.5, y: 0.5, r: 0.5,
                  colorStops: [
                    { offset: 0, color },
                    { offset: 0.65, color: color + 'cc' },
                    { offset: 1, color: color + '33' },
                  ],
                } as never,
                shadowColor: color,
                shadowBlur: 18,
              },
            };
          }),
        } as never,
      ],
    };
  }, [clusters, yinzhouReady]);

  const handleMapClick = (params: echarts.ECElementEvent) => {
    const data = params.data as { cluster?: Cluster } | undefined;
    if (data?.cluster) {
      setSelectedCluster(data.cluster);
      setSelectedEnt(null);
      setTablePage(1);
    }
  };

  // ─── 小地图（左下导航 + 位置定位共用） ───
  const miniMapOption = useMemo((): echarts.EChartsOption => ({
    backgroundColor: 'transparent',
    geo: [{
      map: 'gaoxin', boundingCoords: MAP_BOUNDS, silent: true,
      itemStyle: { areaColor: 'rgba(15,45,100,0.9)', borderColor: 'rgba(63,210,255,0.6)', borderWidth: 1 },
      label: { show: false },
    }],
    series: [{
      type: 'scatter', coordinateSystem: 'geo', silent: true,
      symbolSize: 5,
      itemStyle: { color: '#ffd32a', shadowColor: '#ffd32a', shadowBlur: 4 },
      data: clusters.map(c => ({ value: [c.lng, c.lat] })),
    } as never],
  }), [clusters]);

  const locationMapOption = useMemo((): echarts.EChartsOption => ({
    backgroundColor: 'transparent',
    geo: [{
      map: 'gaoxin', boundingCoords: MAP_BOUNDS, silent: true,
      itemStyle: { areaColor: 'rgba(15,45,100,0.9)', borderColor: 'rgba(63,210,255,0.6)', borderWidth: 1 },
      label: { show: false },
    }],
    series: selectedEnt ? [{
      type: 'effectScatter', coordinateSystem: 'geo', silent: true,
      symbolSize: 12, rippleEffect: { brushType: 'stroke', scale: 3 },
      itemStyle: { color: '#ff4d5e', shadowColor: '#ff4d5e', shadowBlur: 10 },
      data: [{ value: [selectedEnt.longitude, selectedEnt.latitude] }],
      label: {
        show: true, position: 'bottom', formatter: selectedEnt.actualAddress,
        color: '#9fd0ff', fontSize: 10,
      },
    } as never] : [],
  }), [selectedEnt]);

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

  const pad = (n: number) => String(n).padStart(2, '0');

  // 本月/上月
  const monthDiff = statistics.thisMonthCount - statistics.lastMonthCount;
  const monthPercent = statistics.lastMonthCount > 0
    ? Math.round((monthDiff / statistics.lastMonthCount) * 100)
    : 0;

  // 底部表格分页
  const PAGE_SIZE = 5;
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
        <div className="flex-1 min-h-0 grid gap-2.5 px-3 pt-2.5" style={{ gridTemplateColumns: '330px 1fr 350px' }}>

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

            {/* 地图 */}
            <Panel title="高新区企业热力分布" className="flex-1 min-h-0" bodyClassName="!p-0 relative">
              <Chart option={mapOption} height="100%" onClick={handleMapClick} />
              {/* 图例 */}
              <div className="absolute left-0 right-0 bottom-1 flex items-center justify-center gap-5 text-[11px] text-[#a9c8ec]">
                <span className="text-[#7fa8d9]">企业数量（聚合热力）</span>
                {[['#2f7bff', '1-4 家'], ['#1fd0a2', '5-9 家'], ['#ffd32a', '10-19 家'], ['#ff7a1a', '20+ 家']].map(([c, t]) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="w-[10px] h-[10px] rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                    {t}
                  </span>
                ))}
              </div>
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
                      setSelectedCluster({ lng: 0, lat: 0, enterprises: listMap[w.label] });
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

        {/* ═══ 底部交互条 ═══ */}
        <div className="h-[218px] flex-shrink-0 grid gap-2.5 px-3 py-2.5" style={{ gridTemplateColumns: '320px 1fr 440px' }}>
          {/* 操作引导 */}
          <div className="rounded-[4px] border relative overflow-hidden flex"
            style={{ background: 'linear-gradient(180deg, rgba(15,40,88,0.62), rgba(7,20,48,0.62))', borderColor: 'rgba(56,130,220,0.38)' }}>
            <div className="w-[118px] flex flex-col justify-center px-4 flex-shrink-0">
              <MousePointerClick className="w-6 h-6 text-[#4de3ff] mb-2" />
              <div className="text-[16px] font-bold text-[#4de3ff] leading-snug">点击聚合点<br />展开企业列表</div>
              <div className="text-[10px] text-[#5f83b8] mt-2 leading-relaxed">注：地图上聚合点为 3 公里范围内企业数量，点击可查看详细企业列表</div>
            </div>
            <div className="flex-1 relative">
              <Chart option={miniMapOption} height="100%" />
            </div>
          </div>

          {/* 聚合点企业列表 */}
          <div className="rounded-[4px] border flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(180deg, rgba(15,40,88,0.62), rgba(7,20,48,0.62))', borderColor: 'rgba(56,130,220,0.38)' }}>
            <div className="flex items-center gap-2 px-3 h-[34px] flex-shrink-0 border-b" style={{ borderColor: 'rgba(56,130,220,0.22)' }}>
              <span className="w-[3px] h-[13px] rounded-full" style={{ background: 'linear-gradient(180deg,#4de3ff,#1e6fff)' }} />
              <span className="text-[13px] font-bold text-[#dcecff]">
                {selectedCluster ? `聚合点企业列表（${clusterList.length} 家）` : '聚合点企业列表'}
              </span>
              {!selectedCluster && <span className="text-[10px] text-[#5f83b8] ml-1">请先点击地图上的聚合点</span>}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[#7fa8d9]" style={{ background: 'rgba(30,80,160,.22)' }}>
                    {['序号', '企业名称', '经营类型', '净化设施状态', '在线状态', '最近清洗时间', '排放状态', '风险等级', '操作'].map(h => (
                      <th key={h} className="px-2 py-[6px] font-normal text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageList.map((e, i) => {
                    const risk = riskLevel(e);
                    const online = (e.devices ?? []).some(d => d.online);
                    return (
                      <tr key={e.id} className="border-t hover:bg-[#1e6fff]/10 transition-colors" style={{ borderColor: 'rgba(56,130,220,0.14)' }}>
                        <td className="px-2 py-[6px] text-[#7fa8d9] font-mono">{(tablePage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-2 py-[6px] text-[#e6f3ff] whitespace-nowrap max-w-[130px] truncate">{e.storeName}</td>
                        <td className="px-2 py-[6px] text-[#a9c8ec]">{e.businessType}</td>
                        <td className="px-2 py-[6px]">{e.hasPretreatment ? <span className="text-[#1fd0a2]">正常</span> : <span className="text-[#ff9f43]">未安装</span>}</td>
                        <td className="px-2 py-[6px]">{online ? <span className="text-[#4de3ff]">在线</span> : <span className="text-[#7fa8d9]">离线</span>}</td>
                        <td className="px-2 py-[6px] text-[#a9c8ec] font-mono">{e.lastMaintenanceDate || '—'}</td>
                        <td className="px-2 py-[6px]">{e.emissionExceed === '超标' ? <span className="text-[#ff4d5e] font-bold">超标</span> : <span className="text-[#1fd0a2]">正常</span>}</td>
                        <td className="px-2 py-[6px]">
                          <span className={`px-1.5 py-0.5 rounded-[3px] border text-[10px] ${risk.cls}`}>{risk.label}</span>
                        </td>
                        <td className="px-2 py-[6px]">
                          <button onClick={() => setSelectedEnt(e)}
                            className="text-[#4de3ff] hover:text-white transition-colors">查看</button>
                        </td>
                      </tr>
                    );
                  })}
                  {pageList.length === 0 && (
                    <tr><td colSpan={9} className="px-2 py-8 text-center text-[#5f83b8]">点击地图上的聚合热力点，此处展开该点位的企业清单</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            <div className="flex items-center justify-center gap-1.5 h-[30px] flex-shrink-0 border-t" style={{ borderColor: 'rgba(56,130,220,0.14)' }}>
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

          {/* 企业详情 */}
          <div className="rounded-[4px] border flex overflow-hidden"
            style={{ background: 'linear-gradient(180deg, rgba(15,40,88,0.62), rgba(7,20,48,0.62))', borderColor: 'rgba(56,130,220,0.38)' }}>
            {selectedEnt ? (
              <>
                <div className="flex-1 min-w-0 px-3 py-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#e6f3ff] truncate">{selectedEnt.storeName}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="px-1.5 py-0.5 rounded-[3px] text-[10px]" style={{ background: 'rgba(77,227,255,.15)', color: '#4de3ff', border: '1px solid rgba(77,227,255,.4)' }}>{selectedEnt.businessType}</span>
                      <span className="px-1.5 py-0.5 rounded-[3px] text-[10px]" style={selectedEnt.emissionExceed === '超标'
                        ? { background: 'rgba(255,77,94,.15)', color: '#ff4d5e', border: '1px solid rgba(255,77,94,.4)' }
                        : { background: 'rgba(31,208,162,.15)', color: '#1fd0a2', border: '1px solid rgba(31,208,162,.4)' }}>
                        {selectedEnt.emissionExceed === '超标' ? '超标' : '正常'}
                      </span>
                    </div>
                  </div>
                  {selectedEnt.panoramaPhotos[0] && (
                    <img src={selectedEnt.panoramaPhotos[0]} alt="门店" className="w-full h-[52px] object-cover rounded-[3px] mt-1.5 opacity-90" />
                  )}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-[3px] mt-1.5 text-[10px] flex-1">
                    {[
                      ['地址', selectedEnt.actualAddress],
                      ['联系人', selectedEnt.owner],
                      ['联系电话', selectedEnt.phone],
                      ['净化设施', selectedEnt.hasPretreatment ? '正常' : '未安装'],
                      ['在线状态', (selectedEnt.devices ?? []).some(d => d.online) ? '在线' : '离线'],
                      ['最近清洗', selectedEnt.lastMaintenanceDate || '—'],
                      ['排放状态', selectedEnt.emissionExceed === '超标' ? '超标' : '正常'],
                      ['风险等级', riskLevel(selectedEnt).label],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-1 truncate">
                        <span className="text-[#5f83b8] flex-shrink-0">{k}：</span>
                        <span className="text-[#c9e2ff] truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => openFullDetail(selectedEnt)}
                      className="flex items-center gap-1 px-2 py-[3px] text-[10px] rounded-[3px] text-white transition-colors"
                      style={{ background: 'linear-gradient(135deg,#1e6fff,#4de3ff)' }}>
                      <Eye className="w-3 h-3" />一企一档
                    </button>
                    <button onClick={() => setReportEnt(selectedEnt)}
                      className="flex items-center gap-1 px-2 py-[3px] text-[10px] rounded-[3px] text-[#c9a7ff] transition-colors hover:brightness-150"
                      style={{ background: 'rgba(139,92,246,.18)', border: '1px solid rgba(139,92,246,.45)' }}>
                      <FileText className="w-3 h-3" />报告
                    </button>
                    <button onClick={() => setDeviceEnt(selectedEnt)}
                      className="flex items-center gap-1 px-2 py-[3px] text-[10px] rounded-[3px] text-[#7ef0d4] transition-colors hover:brightness-150"
                      style={{ background: 'rgba(31,208,162,.14)', border: '1px solid rgba(31,208,162,.45)' }}>
                      <Cpu className="w-3 h-3" />设备
                    </button>
                  </div>
                </div>
                <div className="w-[150px] flex-shrink-0 border-l flex flex-col" style={{ borderColor: 'rgba(56,130,220,0.22)' }}>
                  <div className="flex items-center gap-1 px-2 h-[26px] text-[10px] text-[#7fa8d9] border-b flex-shrink-0" style={{ borderColor: 'rgba(56,130,220,0.22)' }}>
                    <MapPin className="w-3 h-3 text-[#4de3ff]" />位置定位
                  </div>
                  <div className="flex-1">
                    <Chart option={locationMapOption} height="100%" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#5f83b8] gap-2">
                <Building2 className="w-8 h-8 opacity-40" />
                <span className="text-[11px]">在企业列表中点击「查看」<br />此处展示企业详情</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 一企一档抽屉 + 弹窗 */}
      <EnterpriseDetail />
      <ReportModal open={!!reportEnt} onClose={() => setReportEnt(null)} enterprise={reportEnt} />
      <DeviceInfoModal open={!!deviceEnt} onClose={() => setDeviceEnt(null)} enterprise={deviceEnt} />
    </div>
  );
}
