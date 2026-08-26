import { useState } from 'react';
import { X, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Enterprise } from '@/types';

interface StatCardDetailProps {
  open: boolean;
  onClose: () => void;
  title: string;
  enterprises: Enterprise[];
}

const PAGE_SIZE = 8;

export default function StatCardDetail({ open, onClose, title, enterprises }: StatCardDetailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  if (!open) return null;

  const filtered = enterprises.filter(e =>
    !searchQuery ||
    e.storeName.includes(searchQuery) ||
    e.fullName.includes(searchQuery) ||
    e.actualAddress.includes(searchQuery) ||
    e.owner.includes(searchQuery)
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getScaleBadge = (scale: string) => {
    const colors: Record<string, string> = {
      '小型': 'bg-blue-50 text-blue-700 border-blue-200',
      '中型': 'bg-amber-50 text-amber-700 border-amber-200',
      '大型': 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[scale] || 'bg-slate-50 text-slate-700';
  };

  const formatCleaningCycle = (e: Enterprise) => {
    if (!e.hasPretreatment || !e.cleaningCycle || e.cleaningCycleNumber <= 0) return '-';
    return `每${e.cleaningCycleNumber}${e.cleaningCycle}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">共 {filtered.length} 家企业</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search */}
        {enterprises.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="搜索企业名称、地址..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">企业名称</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">街道</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">类型</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">规模</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">排查日期</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">清洗周期</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800 text-xs">{e.storeName}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {e.street}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{e.street}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {e.businessType}
                    {e.otherBusinessType && <span className="text-[10px] text-amber-500">({e.otherBusinessType})</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border ${getScaleBadge(e.scale.includes('小型') ? '小型' : e.scale)}`}>
                      {e.scale.includes('小型') ? '小型' : e.scale}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{e.inspectionDate}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{formatCleaningCycle(e)}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    暂无符合条件的数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">第 {currentPage} / {totalPages} 页</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${
                      currentPage === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
