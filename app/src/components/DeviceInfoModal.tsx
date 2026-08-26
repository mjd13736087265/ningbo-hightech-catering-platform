import type { Enterprise, MonitorDevice } from '@/types';
import { X, Wifi, WifiOff, Fan, Zap, AlertTriangle, Gauge } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  enterprise: Enterprise | null;
}

function PurifierIcon({ status }: { status: MonitorDevice['purifierStatus'] }) {
  if (status === '运行') {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <span className="relative flex w-4 h-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full w-4 h-4 bg-emerald-500 items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white" />
          </span>
        </span>
        运行
      </span>
    );
  }
  if (status === '故障') {
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <AlertTriangle className="w-4 h-4" />
        故障
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <span className="w-4 h-4 rounded-full bg-slate-300 inline-flex items-center justify-center">
        <Zap className="w-2.5 h-2.5 text-white" />
      </span>
      关闭
    </span>
  );
}

function DeviceCard({ device, index }: { device: MonitorDevice; index: number }) {
  const fumeExceed = device.online && device.fumeConcentration > 2.0;
  const nmhcExceed = device.online && device.nmhc > 10;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* 设备头 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">设备 {index + 1}</span>
          <span className="text-xs text-slate-500 font-mono">MN: {device.mn}</span>
        </div>
        {device.online ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Wifi className="w-4 h-4" /> 在线
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
            <WifiOff className="w-4 h-4" /> 离线
          </span>
        )}
      </div>

      {/* 监测数据 */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 text-center">
        <div className="bg-white py-2.5">
          <div className="text-[11px] text-slate-500">油烟浓度(mg/m³)</div>
          <div className={`text-base font-bold mt-0.5 ${fumeExceed ? 'text-red-600' : 'text-slate-800'}`}>
            {device.fumeConcentration.toFixed(2)}
          </div>
        </div>
        <div className="bg-white py-2.5">
          <div className="text-[11px] text-slate-500">颗粒物浓度(mg/m³)</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{device.particleConcentration.toFixed(2)}</div>
        </div>
        <div className="bg-white py-2.5">
          <div className="text-[11px] text-slate-500">非甲烷总烃(mg/m³)</div>
          <div className={`text-base font-bold mt-0.5 ${nmhcExceed ? 'text-red-600' : 'text-slate-800'}`}>
            {device.nmhc.toFixed(2)}
          </div>
        </div>
        <div className="bg-white py-2.5">
          <div className="text-[11px] text-slate-500">净化器电流值(A)</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{device.purifierCurrent.toFixed(1)}</div>
        </div>
        <div className="bg-white py-2.5">
          <div className="text-[11px] text-slate-500">净化器状态</div>
          <div className="mt-1 flex justify-center"><PurifierIcon status={device.purifierStatus} /></div>
        </div>
        <div className="bg-white py-2.5">
          <div className="text-[11px] text-slate-500">风机电流值(A)</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{device.fanCurrent.toFixed(1)}</div>
        </div>
      </div>

      {/* 底部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <Fan className={`w-3.5 h-3.5 ${device.fanStatus === '运行' ? 'text-emerald-500 animate-spin' : 'text-slate-400'}`}
            style={device.fanStatus === '运行' ? { animationDuration: '2s' } : undefined} />
          风机状态：<span className={device.fanStatus === '运行' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{device.fanStatus}</span>
        </span>
        <span className="text-slate-400">数据时间：{device.dataTime}</span>
      </div>
    </div>
  );
}

export default function DeviceInfoModal({ open, onClose, enterprise }: Props) {
  if (!open || !enterprise) return null;

  const devices = enterprise.devices ?? [];
  const onlineCount = devices.filter(d => d.online).length;

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">监测设备信息</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {enterprise.storeName} · 共 {devices.length} 台设备，{onlineCount} 台在线
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {devices.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">该企业暂未接入监测设备</div>
          )}
          {devices.map((device, idx) => (
            <DeviceCard key={device.id} device={device} index={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
