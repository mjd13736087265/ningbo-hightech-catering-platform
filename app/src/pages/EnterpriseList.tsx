import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Plus, Filter, ChevronLeft, ChevronRight, Eye, MapPin, Pencil, FileUp, Cpu, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STREETS } from '@/data/enterprises';
import EnterpriseEdit from '@/components/EnterpriseEdit';
import ReportModal from '@/components/ReportModal';
import DeviceInfoModal from '@/components/DeviceInfoModal';

export default function EnterpriseList() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [streetFilter, setStreetFilter] = useState('全部');
  const [scaleFilter, setScaleFilter] = useState('全部');
  const [permitFilter, setPermitFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editEnterprise, setEditEnterprise] = useState<typeof state.enterprises[0] | null>(null);
  const [reportEnterprise, setReportEnterprise] = useState<typeof state.enterprises[0] | null>(null);
  const [deviceEnterprise, setDeviceEnterprise] = useState<typeof state.enterprises[0] | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return state.enterprises.filter(e => {
      const matchSearch = !searchQuery || 
        e.storeName.includes(searchQuery) || 
        e.fullName.includes(searchQuery) || 
        e.actualAddress.includes(searchQuery) ||
        e.owner.includes(searchQuery) ||
        e.phone.includes(searchQuery);
      const matchStreet = streetFilter === '全部' || e.street === streetFilter;
      const matchScale = scaleFilter === '全部' || e.scale === scaleFilter;
      const matchPermit = permitFilter === '全部' || e.pollutionPermit.status === permitFilter;
      return matchSearch && matchStreet && matchScale && matchPermit;
    });
  }, [state.enterprises, searchQuery, streetFilter, scaleFilter, permitFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleViewDetail = (enterprise: typeof state.enterprises[0]) => {
    dispatch({ type: 'SELECT_ENTERPRISE', payload: enterprise });
    dispatch({ type: 'TOGGLE_DRAWER' });
  };

  const handleEdit = (enterprise: typeof state.enterprises[0]) => {
    setEditEnterprise(enterprise);
    setEditOpen(true);
  };

  const getScaleBadge = (scale: string) => {
    const colors: Record<string, string> = {
      '小型': 'bg-blue-50 text-blue-700 border-blue-200',
      '中型': 'bg-amber-50 text-amber-700 border-amber-200',
      '大型': 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[scale] || 'bg-slate-50 text-slate-700';
  };



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">一企一档</h1>
          <p className="text-sm text-slate-500 mt-0.5">共 {filtered.length} 家餐饮企业</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cockpit')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <MonitorPlay className="w-4 h-4" />
            驾驶舱
          </button>
          <button
            onClick={() => navigate('/mobile/inspection')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            新增排查
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="搜索企业名称、地址、联系人..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={streetFilter}
              onChange={e => { setStreetFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="全部">全部街道</option>
              {STREETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={scaleFilter}
              onChange={e => { setScaleFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="全部">全部规模</option>
              <option value="小型">小型</option>
              <option value="中型">中型</option>
              <option value="大型">大型</option>
            </select>
            <select
              value={permitFilter}
              onChange={e => { setPermitFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="全部">全部许可证</option>
              <option value="已办理">已办理</option>
              <option value="未办理">未办理</option>
              <option value="已过期">已过期</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-600">企业名称</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">所属街道</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">经营类型</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">规模</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">排污许可证</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">环保备案</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">净化设施</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((enterprise, idx) => (
                <tr
                  key={enterprise.id}
                  className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors duration-100"
                  style={{ animation: `fadeInUp 0.3s ease ${idx * 30}ms both` }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{enterprise.storeName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {enterprise.actualAddress}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{enterprise.street}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {enterprise.businessType}
                    {enterprise.otherBusinessType && (
                      <span className="text-[10px] text-amber-500 ml-0.5">({enterprise.otherBusinessType})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getScaleBadge(enterprise.scale)}`}>
                      {enterprise.scale}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      enterprise.pollutionPermit.status === '已办理' ? 'text-emerald-600' :
                      enterprise.pollutionPermit.status === '已过期' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {enterprise.pollutionPermit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${enterprise.envRecord === '已备案' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {enterprise.envRecord}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${enterprise.hasPretreatment ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {enterprise.hasPretreatment ? '已安装' : '未安装'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleViewDetail(enterprise)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        查看
                      </button>
                      <button
                        onClick={() => handleEdit(enterprise)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        编辑
                      </button>
                      <button
                        onClick={() => setReportEnterprise(enterprise)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 rounded-md hover:bg-violet-100 transition-colors"
                        title="上传/查看报告"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        报告
                      </button>
                      <button
                        onClick={() => setDeviceEnterprise(enterprise)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-600 bg-cyan-50 rounded-md hover:bg-cyan-100 transition-colors"
                        title="监测设备信息"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                        设备
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    暂无符合条件的数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              第 {currentPage} / {totalPages} 页，共 {filtered.length} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    className={`w-8 h-8 text-xs rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EnterpriseEdit
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditEnterprise(null); }}
        enterprise={editEnterprise}
      />

      {/* Report Modal */}
      <ReportModal
        open={!!reportEnterprise}
        onClose={() => setReportEnterprise(null)}
        enterprise={reportEnterprise}
      />

      {/* Device Info Modal */}
      <DeviceInfoModal
        open={!!deviceEnterprise}
        onClose={() => setDeviceEnterprise(null)}
        enterprise={deviceEnterprise}
      />
    </div>
  );
}
