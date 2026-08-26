import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Save } from 'lucide-react';
import type { Enterprise } from '@/types';
import { STREETS, BUSINESS_TYPES } from '@/data/enterprises';

interface EnterpriseEditProps {
  open: boolean;
  onClose: () => void;
  enterprise: Enterprise | null;
}

export default function EnterpriseEdit({ open, onClose, enterprise }: EnterpriseEditProps) {
  const { dispatch } = useApp();
  const [form, setForm] = useState<Partial<Enterprise>>({});

  useEffect(() => {
    if (enterprise) {
      setForm({ ...enterprise });
    }
  }, [enterprise]);

  if (!open || !enterprise) return null;

  const update = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updated = { ...enterprise, ...form } as Enterprise;
    dispatch({ type: 'UPDATE_ENTERPRISE', payload: updated });
    onClose();
  };

  const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white z-50 shadow-2xl overflow-y-auto flex flex-col" style={{ width: 560 }}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">编辑企业信息</h2>
            <p className="text-xs text-slate-500">{enterprise.storeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Save className="w-4 h-4" />
              保存
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 flex-1">
          {/* Basic Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">企业基本信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>企业工商全称</label>
                <input className={fieldClass} value={form.fullName || ''} onChange={e => update('fullName', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>门店名称</label>
                <input className={fieldClass} value={form.storeName || ''} onChange={e => update('storeName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>所属街道</label>
                <select className={fieldClass} value={form.street || ''} onChange={e => update('street', e.target.value)}>
                  {STREETS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>经营类型</label>
                <select className={fieldClass} value={form.businessType || ''} onChange={e => update('businessType', e.target.value)}>
                  {BUSINESS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.businessType === '其他' && (
                <div className="col-span-2">
                  <label className={labelClass}>其他经营类型说明</label>
                  <input className={fieldClass} value={form.otherBusinessType || ''} onChange={e => update('otherBusinessType', e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelClass}>经营场所</label>
                <select className={fieldClass} value={form.venueType || ''} onChange={e => update('venueType', e.target.value)}>
                  <option value="沿街商铺">沿街商铺</option>
                  <option value="商业综合体">商业综合体</option>
                  <option value="独立楼宇">独立楼宇</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>负责人</label>
                <input className={fieldClass} value={form.owner || ''} onChange={e => update('owner', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>联系电话</label>
                <input className={fieldClass} value={form.phone || ''} onChange={e => update('phone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>营业时段</label>
                <input className={fieldClass} value={form.businessHours || ''} onChange={e => update('businessHours', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Scale */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">规模数据</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>灶头总功率 (10⁸ J/h)</label>
                <input className={fieldClass} type="number" step="0.01" value={form.stovePower || ''} onChange={e => update('stovePower', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className={labelClass}>基准灶头数</label>
                <input className={fieldClass} type="number" step="0.1" value={form.maxStoveCount || ''} onChange={e => update('maxStoveCount', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className={labelClass}>投影面积 (m²)</label>
                <input className={fieldClass} type="number" step="0.01" value={form.hoodArea || ''} onChange={e => update('hoodArea', parseFloat(e.target.value))} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">当前规模：{form.scale}</p>
          </div>

          {/* Facility */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">净化设施</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>是否安装</label>
                <select className={fieldClass} value={form.hasPretreatment ? '是' : '否'} onChange={e => update('hasPretreatment', e.target.value === '是')}>
                  <option value="是">已安装</option>
                  <option value="否">未安装</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>设施类型</label>
                <select className={fieldClass} value={form.facilityType || ''} onChange={e => update('facilityType', e.target.value)}>
                  <option value="">请选择</option>
                  <option value="静电式">静电式</option>
                  <option value="UV光解式">UV光解式</option>
                  <option value="复合式">复合式</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              {form.facilityType === '其他' && (
                <div className="col-span-2">
                  <label className={labelClass}>其他设施类型说明</label>
                  <input className={fieldClass} value={form.otherFacilityType || ''} onChange={e => update('otherFacilityType', e.target.value)} />
                </div>
              )}
              {(form.hasPretreatment) && (
                <>
                  <div>
                    <label className={labelClass}>清洗周期单位</label>
                    <select className={fieldClass} value={form.cleaningCycle || ''} onChange={e => update('cleaningCycle', e.target.value)}>
                      <option value="">请选择</option>
                      <option value="周">周</option>
                      <option value="月">月</option>
                      <option value="年">年</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>几{form.cleaningCycle || 'X'}清洗一次</label>
                    <input className={fieldClass} type="number" value={form.cleaningCycleNumber || ''} onChange={e => update('cleaningCycleNumber', parseInt(e.target.value))} />
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>最近维护日期</label>
                <input className={fieldClass} type="date" value={form.lastMaintenanceDate || ''} onChange={e => update('lastMaintenanceDate', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>CMA检测报告</label>
                <select className={fieldClass} value={form.hasCMA ? '有' : '无'} onChange={e => update('hasCMA', e.target.value === '有')}>
                  <option value="有">有</option>
                  <option value="无">无</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">合规情况</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>排污许可证</label>
                <select className={fieldClass} value={form.pollutionPermit?.status || ''} onChange={e => update('pollutionPermit', { ...form.pollutionPermit, status: e.target.value })}>
                  <option value="已办理">已办理</option>
                  <option value="未办理">未办理</option>
                  <option value="已过期">已过期</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>环保备案</label>
                <select className={fieldClass} value={form.envRecord || ''} onChange={e => update('envRecord', e.target.value)}>
                  <option value="已备案">已备案</option>
                  <option value="未备案">未备案</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inspection */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">排查信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>排查日期</label>
                <input className={fieldClass} type="date" value={form.inspectionDate || ''} onChange={e => update('inspectionDate', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>调查人</label>
                <input className={fieldClass} value={form.inspector || ''} onChange={e => update('inspector', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
