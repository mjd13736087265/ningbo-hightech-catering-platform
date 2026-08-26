import { useState } from 'react';
import { X, Building2, Wrench, Droplets, Search } from 'lucide-react';
import type { Enterprise } from '@/types';

interface CardStatDetailProps {
  open: boolean;
  onClose: () => void;
  type: string;
  enterprises: Enterprise[];
}

// 清洗周期分布统计
function getCleaningCycleDist(enterprises: Enterprise[]) {
  const map: Record<string, number> = {};
  enterprises.filter(e => e.hasPretreatment && e.cleaningCycle && e.cleaningCycleNumber > 0).forEach(e => {
    const key = `${e.cleaningCycleNumber}${e.cleaningCycle}`;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export default function CardStatDetail({ open, onClose, type, enterprises }: CardStatDetailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  if (!open) return null;

  const total = enterprises.length;

  const renderContent = () => {
    switch (type) {
      case 'total': {
        const filtered = searchQuery
          ? enterprises.filter(e => e.storeName.includes(searchQuery) || e.fullName.includes(searchQuery) || e.street.includes(searchQuery))
          : enterprises;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {['新明街道', '梅墟街道', '聚贤街道', '贵驷街道', '其他'].map(street => {
                const count = enterprises.filter(e => e.street === street).length;
                return (
                  <div key={street} className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{count}</div>
                    <div className="text-xs text-blue-500 mt-0.5">{street}</div>
                  </div>
                );
              })}
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{total}</div>
                <div className="text-xs text-emerald-500 mt-0.5">合计</div>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索企业名称..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            {/* List */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">企业列表（{filtered.length}家）</h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {filtered.slice(0, 20).map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                    <div>
                      <span className="text-sm text-slate-800 font-medium">{e.storeName}</span>
                      <span className="text-xs text-slate-400 ml-2">{e.street}</span>
                    </div>
                    <span className="text-xs text-slate-400">{e.inspectionDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'pretreatmentCount': {
        const pretreatmentList = enterprises.filter(e => e.hasPretreatment);
        const noPretreatmentList = enterprises.filter(e => !e.hasPretreatment);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{pretreatmentList.length}</div>
                <div className="text-xs text-emerald-500 mt-0.5">已安装</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{noPretreatmentList.length}</div>
                <div className="text-xs text-amber-500 mt-0.5">未安装</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{total > 0 ? Math.round((pretreatmentList.length / total) * 100) : 0}%</div>
                <div className="text-xs text-blue-500 mt-0.5">安装率</div>
              </div>
            </div>
            {/* 按街道的安装分布 */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">各街道安装情况</h4>
              <div className="space-y-2">
                {['新明街道', '梅墟街道', '聚贤街道', '贵驷街道', '其他'].map(street => {
                  const all = enterprises.filter(e => e.street === street).length;
                  const installed = enterprises.filter(e => e.street === street && e.hasPretreatment).length;
                  const rate = all > 0 ? Math.round((installed / all) * 100) : 0;
                  return (
                    <div key={street} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-16">{street}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-16 text-right">{installed}/{all} ({rate}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 未安装企业 */}
            {noPretreatmentList.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-2">未安装净化设施企业（{noPretreatmentList.length}家）</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {noPretreatmentList.slice(0, 10).map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-amber-50 rounded-md px-3 py-2">
                      <span className="text-sm text-slate-800">{e.storeName}</span>
                      <span className="text-xs text-amber-600">{e.noPretreatmentReason || '未说明'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'cleaningCycleCount': {
        const cleaningCycleList = enterprises.filter(e => e.hasPretreatment && e.cleaningCycle && e.cleaningCycleNumber > 0);
        const noCleaningCycleList = enterprises.filter(e => e.hasPretreatment && (!e.cleaningCycle || e.cleaningCycleNumber <= 0));
        const cycleDist = getCleaningCycleDist(enterprises);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-cyan-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-cyan-700">{cleaningCycleList.length}</div>
                <div className="text-xs text-cyan-500 mt-0.5">已设清洗周期</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{noCleaningCycleList.length}</div>
                <div className="text-xs text-amber-500 mt-0.5">未设清洗周期</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{enterprises.filter(e => e.hasPretreatment).length > 0 ? Math.round((cleaningCycleList.length / enterprises.filter(e => e.hasPretreatment).length) * 100) : 0}%</div>
                <div className="text-xs text-blue-500 mt-0.5">覆盖率</div>
              </div>
            </div>
            {/* 清洗周期分布 */}
            {cycleDist.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">清洗周期分布</h4>
                <div className="space-y-2">
                  {cycleDist.map(item => (
                    <div key={item.key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-20">每{item.key}一次</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(item.count / cleaningCycleList.length) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{item.count}家</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        );
      }

      default:
        return <p className="text-sm text-slate-500">暂无详细数据</p>;
    }
  };

  const titles: Record<string, { title: string; icon: typeof Building2; color: string }> = {
    total: { title: '总登记数详情', icon: Building2, color: 'text-blue-600' },
    pretreatmentCount: { title: '净化设施安装详情', icon: Wrench, color: 'text-emerald-600' },
    cleaningCycleCount: { title: '清洗周期设置详情', icon: Droplets, color: 'text-cyan-600' },
  };

  const config = titles[type] || { title: '详情', icon: Building2, color: 'text-blue-600' };
  const Icon = config.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            <h3 className="text-base font-semibold text-slate-900">{config.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
