import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Building2, Wrench, Droplets, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Enterprise } from '@/types';
import StatCardDetail from '@/components/StatCardDetail';
import CardStatDetail from '@/components/CardStatDetail';

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <div ref={ref} className="text-2xl font-bold text-slate-800">
      {display}
    </div>
  );
}

const statCards = [
  { key: 'total', title: '总登记数', icon: Building2, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { key: 'pretreatmentCount', title: '已安装净化设施', icon: Wrench, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { key: 'cleaningCycleCount', title: '已设清洗周期', icon: Droplets, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
];

export default function Dashboard() {
  const { statistics, state } = useApp();
  const navigate = useNavigate();
  const [progressBars, setProgressBars] = useState<Record<string, number>>({});
  const [bar2Progress, setBar2Progress] = useState<Record<string, number>>({});
  // 顶部3张卡片的详情弹窗
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [cardDetailType, setCardDetailType] = useState<string>('');

  // 下面统计项的企业列表弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailList, setDetailList] = useState<Enterprise[]>([]);

  const statsData: Record<string, number> = {
    total: statistics.total,
    pretreatmentCount: statistics.pretreatmentCount,
    cleaningCycleCount: statistics.cleaningCycleCount,
  };

  const monthDiff = statistics.thisMonthCount - statistics.lastMonthCount;
  const monthPercent = statistics.lastMonthCount > 0
    ? Math.round((monthDiff / statistics.lastMonthCount) * 100)
    : 0;

  // 打开顶部卡片详情弹窗
  const openCardDetail = useCallback((type: string) => {
    setCardDetailType(type);
    setCardDetailOpen(true);
  }, []);

  // 打开数据项企业列表弹窗
  const openDetail = useCallback((title: string, list: Enterprise[]) => {
    setDetailTitle(title);
    setDetailList(list);
    setDetailOpen(true);
  }, []);

  // 过滤出某月登记的企业
  const getMonthEnterprises = useCallback((monthLabel: string) => {
    const [year, month] = monthLabel.split('-').map(Number);
    return state.enterprises.filter(e => {
      if (!e.inspectionDate) return false;
      const d = new Date(e.inspectionDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [state.enterprises]);

  // 过滤出本月/上月企业
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const lastMonthDate = new Date(thisYear, thisMonth - 2, 1);
  const lastYear = lastMonthDate.getFullYear();
  const lastMonth = lastMonthDate.getMonth() + 1;

  const thisMonthList = state.enterprises.filter(e => {
    if (!e.inspectionDate) return false;
    const d = new Date(e.inspectionDate);
    return d.getFullYear() === thisYear && d.getMonth() + 1 === thisMonth;
  });
  const lastMonthList = state.enterprises.filter(e => {
    if (!e.inspectionDate) return false;
    const d = new Date(e.inspectionDate);
    return d.getFullYear() === lastYear && d.getMonth() + 1 === lastMonth;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const bars: Record<string, number> = {};
      const maxCount = Math.max(...statistics.streetDistribution.map(s => s.count));
      statistics.streetDistribution.forEach(s => { bars[s.name] = (s.count / maxCount) * 100; });
      setProgressBars(bars);
      const bars2: Record<string, number> = {};
      const maxCount2 = Math.max(...statistics.businessTypeDistribution.map(s => s.count));
      statistics.businessTypeDistribution.forEach(s => { bars2[s.name] = (s.count / maxCount2) * 100; });
      setBar2Progress(bars2);
    }, 300);
    return () => clearTimeout(timer);
  }, [statistics]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">工作台</h1>
          <p className="text-xs text-slate-500 mt-0">全区餐饮企业摸底统计概览</p>
        </div>
        <button
          onClick={() => navigate('/mobile/inspection')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          新增排查
        </button>
      </div>

      {/* Stat Cards - Top 3 */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = statsData[card.key];
          return (
            <div
              key={card.key}
              onClick={() => openCardDetail(card.key)}
              className="bg-white rounded-lg p-3 border border-slate-100 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-xs text-slate-500 font-medium">{card.title}</span>
                <div className={`w-7 h-7 rounded-md ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <AnimatedNumber value={value} />
              {card.key === 'total' && <p className="text-[10px] text-slate-400 mt-0.5">全区登记餐饮企业</p>}
              {card.key === 'pretreatmentCount' && <p className="text-[10px] text-emerald-500 mt-0.5">安装率 {Math.round((statistics.pretreatmentCount / statistics.total) * 100)}%</p>}
              {card.key === 'cleaningCycleCount' && <p className="text-[10px] text-cyan-500 mt-0.5">有清洗计划</p>}
            </div>
          );
        })}
      </div>

      {/* Middle Row: Trend Chart + Compare */}
      <div className="grid grid-cols-4 gap-3">
        {/* Monthly Trend */}
        <div className="col-span-3 bg-white rounded-lg p-3 border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">月度登记趋势</h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.monthlyTrend} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 11 }}
                  formatter={(value: number) => [`${value} 家`, '登记数']}
                  labelFormatter={(label: string) => `${label}（点击查看企业）`}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(data: { month: string }) => {
                    const list = getMonthEnterprises(data.month);
                    openDetail(`${data.month} 登记企业`, list);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Compare */}
        <div className="bg-white rounded-lg p-3 border border-slate-100 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-slate-800">登记对比</h2>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => openDetail(`${thisYear}-${String(thisMonth).padStart(2, '0')} 登记企业`, thisMonthList)}
              className="bg-blue-50 rounded-md p-2 text-center cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <div className="text-[10px] text-slate-500 mb-0.5">本月登记</div>
              <div className="text-xl font-bold text-blue-700">{statistics.thisMonthCount}</div>
              <div className="text-[10px] text-blue-400">家</div>
            </div>
            <div
              onClick={() => openDetail(`${lastYear}-${String(lastMonth).padStart(2, '0')} 登记企业`, lastMonthList)}
              className="bg-slate-50 rounded-md p-2 text-center cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="text-[10px] text-slate-500 mb-0.5">上月登记</div>
              <div className="text-xl font-bold text-slate-700">{statistics.lastMonthCount}</div>
              <div className="text-[10px] text-slate-400">家</div>
            </div>
          </div>
          <div className={`rounded-md py-1.5 text-center ${monthDiff >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <span className={`text-xs font-semibold ${monthDiff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {monthDiff >= 0 ? '+' : ''}{monthDiff} 家
            </span>
            <span className={`text-[10px] ml-1 ${monthDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ({monthDiff >= 0 ? '+' : ''}{monthPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Info Row: Street + Scale + Compliance */}
      <div className="grid grid-cols-3 gap-3">
        {/* Street */}
        <div className="bg-white rounded-lg p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">街道分布</h2>
            <span className="text-[10px] text-slate-400">按街道</span>
          </div>
          <div className="space-y-1.5">
            {statistics.streetDistribution.map((street) => (
              <div
                key={street.name}
                onClick={() => openDetail(`${street.name} 企业列表`, state.enterprises.filter(e => e.street === street.name))}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <span className="text-xs text-slate-600 w-16 truncate group-hover:text-blue-600 transition-colors">{street.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressBars[street.name] || 0}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-10 text-right group-hover:text-blue-600 transition-colors">{street.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="bg-white rounded-lg p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">规模分布</h2>
            <span className="text-[10px] text-slate-400">大/中/小</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {statistics.scaleDistribution.map((scale) => (
              <div
                key={scale.name}
                onClick={() => openDetail(`${scale.name}企业列表`, state.enterprises.filter(e =>
                  scale.name === '小型' ? e.scale.includes('小型') : e.scale === scale.name
                ))}
                className="bg-slate-50 rounded-md p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <div className="text-lg font-bold text-slate-800">{scale.count}</div>
                <div className="text-[10px] text-slate-500">{scale.name}</div>
              </div>
            ))}
          </div>
          <div className="h-2 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-400" style={{ width: `${(statistics.scaleDistribution[0].count / statistics.total) * 100}%` }} />
            <div className="h-full bg-blue-500" style={{ width: `${(statistics.scaleDistribution[1].count / statistics.total) * 100}%` }} />
            <div className="h-full bg-blue-600" style={{ width: `${(statistics.scaleDistribution[2].count / statistics.total) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>小{Math.round((statistics.scaleDistribution[0].count / statistics.total) * 100)}%</span>
            <span>中{Math.round((statistics.scaleDistribution[1].count / statistics.total) * 100)}%</span>
            <span>大{Math.round((statistics.scaleDistribution[2].count / statistics.total) * 100)}%</span>
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-lg p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">合规汇总</h2>
            <span className="text-[10px] text-slate-400">许可证/备案</span>
          </div>
          <div className="space-y-1">
            <div
              onClick={() => openDetail('已安装净化设施企业', state.enterprises.filter(e => e.hasPretreatment))}
              className="bg-purple-50 rounded-md px-2 py-1.5 flex justify-between items-center cursor-pointer hover:bg-purple-100 transition-colors"
            >
              <span className="text-[11px] text-slate-600">已安装净化设施</span>
              <span className="text-sm font-bold text-purple-700">{statistics.pretreatmentCount}</span>
            </div>
            <div
              onClick={() => openDetail('已设清洗周期企业', state.enterprises.filter(e => e.hasPretreatment && e.cleaningCycle && e.cleaningCycleNumber > 0))}
              className="bg-cyan-50 rounded-md px-2 py-1.5 flex justify-between items-center cursor-pointer hover:bg-cyan-100 transition-colors"
            >
              <span className="text-[11px] text-slate-600">已设清洗周期</span>
              <span className="text-sm font-bold text-cyan-700">{statistics.cleaningCycleCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Type + Venue */}
      <div className="grid grid-cols-2 gap-3">
        {/* Business Type */}
        <div className="bg-white rounded-lg p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">经营类型分布</h2>
            <span className="text-[10px] text-slate-400">按类型</span>
          </div>
          <div className="space-y-1.5">
            {statistics.businessTypeDistribution.map((bt) => (
              <div
                key={bt.name}
                onClick={() => openDetail(`${bt.name} 企业列表`, state.enterprises.filter(e => e.businessType === bt.name))}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <span className="text-xs text-slate-600 w-12 group-hover:text-blue-600 transition-colors">{bt.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${bar2Progress[bt.name] || 0}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right group-hover:text-blue-600 transition-colors">{bt.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Venue */}
        <div className="bg-white rounded-lg p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">经营场所</h2>
            <span className="text-[10px] text-slate-400">按场所</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {statistics.venueDistribution.map((vd) => (
              <div
                key={vd.name}
                onClick={() => openDetail(`${vd.name} 企业列表`, state.enterprises.filter(e => e.venueType === vd.name))}
                className="bg-slate-50 rounded-md p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <div className="text-lg font-bold text-slate-800">{vd.count}</div>
                <div className="text-[10px] text-slate-500">{vd.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 Cards Detail Modal */}
      <CardStatDetail
        open={cardDetailOpen}
        onClose={() => setCardDetailOpen(false)}
        type={cardDetailType}
        enterprises={state.enterprises}
      />

      {/* Data Item Detail Modal */}
      <StatCardDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detailTitle}
        enterprises={detailList}
      />
    </div>
  );
}
