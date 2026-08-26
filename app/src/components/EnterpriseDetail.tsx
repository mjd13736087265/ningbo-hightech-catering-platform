import { useApp } from '@/context/AppContext';
import { X, MapPin, Phone, Clock, User, Building2, CheckCircle } from 'lucide-react';

export default function EnterpriseDetail() {
  const { state, dispatch } = useApp();
  const { selectedEnterprise: e, drawerOpen } = state;

  if (!e) return null;

  const handleClose = () => {
    dispatch({ type: 'CLOSE_DRAWER' });
  };

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full bg-white z-50 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 640 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{e.storeName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{e.fullName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              企业基本信息
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">统一社会信用代码</span>
                <p className="text-slate-800 font-medium">{e.creditCode}</p>
              </div>
              <div>
                <span className="text-slate-500">所属街道</span>
                <p className="text-slate-800 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {e.street}
                </p>
              </div>
              <div>
                <span className="text-slate-500">经营类型</span>
                <p className="text-slate-800 font-medium">
                  {e.businessType}
                  {e.otherBusinessType && (
                    <span className="text-xs text-amber-600 ml-1">（{e.otherBusinessType}）</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-500">经营场所</span>
                <p className="text-slate-800 font-medium">{e.venueType}</p>
              </div>
              <div>
                <span className="text-slate-500">企业规模</span>
                <p className="text-slate-800 font-medium">
                  <span className={`inline-flex px-2 py-0.5 text-xs rounded-md ${
                    e.scale === '大型' ? 'bg-red-100 text-red-700' :
                    e.scale === '中型' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{e.scale}</span>
                </p>
              </div>
              <div>
                <span className="text-slate-500">对应灶头总功率</span>
                <p className="text-slate-800 font-medium">{e.stovePower} (10⁸ J/h)</p>
              </div>
              <div>
                <span className="text-slate-500">最大基准灶头数</span>
                <p className="text-slate-800 font-medium">{e.maxStoveCount} 个</p>
              </div>
              <div>
                <span className="text-slate-500">排气罩投影面积</span>
                <p className="text-slate-800 font-medium">{e.hoodArea} m²</p>
              </div>
              <div>
                <span className="text-slate-500">营业时段</span>
                <p className="text-slate-800 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {e.businessHours}
                </p>
              </div>
              <div>
                <span className="text-slate-500">负责人</span>
                <p className="text-slate-800 font-medium flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {e.owner}
                </p>
              </div>
              <div>
                <span className="text-slate-500">联系电话</span>
                <p className="text-slate-800 font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {e.phone}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">营业执照地址</span>
                  <p className="text-slate-800">{e.licenseAddress}</p>
                </div>
                <div>
                  <span className="text-slate-500">实际经营地址</span>
                  <p className="text-slate-800">{e.actualAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              合规登记情况
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3">
                <span className="text-slate-500 text-xs">排污许可证</span>
                <p className={`font-medium mt-0.5 ${
                  e.pollutionPermit.status === '已办理' ? 'text-emerald-600' :
                  e.pollutionPermit.status === '已过期' ? 'text-amber-600' : 'text-slate-500'
                }`}>{e.pollutionPermit.status}</p>
                {e.pollutionPermit.licenseNo && (
                  <p className="text-xs text-slate-400 mt-1">{e.pollutionPermit.licenseNo}</p>
                )}
                {e.pollutionPermit.expiryDate && (
                  <p className="text-xs text-slate-400">有效期至：{e.pollutionPermit.expiryDate}</p>
                )}
              </div>
              <div className="bg-white rounded-lg p-3">
                <span className="text-slate-500 text-xs">环保备案</span>
                <p className={`font-medium mt-0.5 ${e.envRecord === '已备案' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {e.envRecord}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              地理位置
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">GPS坐标</span>
                <span className="text-slate-800 font-mono">{e.longitude.toFixed(4)}, {e.latitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">周边敏感点</span>
                <span className="text-slate-800">{e.sensitiveType}（{e.sensitiveDistance}m）</span>
              </div>
            </div>
            {e.panoramaPhotos.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-slate-500">企业全景照片</span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {e.panoramaPhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt="全景" className="w-full h-20 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Facility */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              油烟净化设施
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">是否安装</span>
                <span className={e.hasPretreatment ? 'text-emerald-600 font-medium' : 'text-slate-500 font-medium'}>
                  {e.hasPretreatment ? '已安装' : '未安装'}
                </span>
              </div>
              {e.hasPretreatment ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">设施类型</span>
                    <span className="text-slate-800">
                      {e.facilityType}
                      {e.otherFacilityType && (
                        <span className="text-xs text-amber-600 ml-1">（{e.otherFacilityType}）</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">清洗周期</span>
                    <span className="text-slate-800">{e.cleaningCycle && e.cleaningCycleNumber > 0 ? `每${e.cleaningCycleNumber}${e.cleaningCycle}清洗一次` : '未填写'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">最近维护日期</span>
                    <span className="text-slate-800">{e.lastMaintenanceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CMA检测报告</span>
                    <span className={e.hasCMA ? 'text-emerald-600' : 'text-slate-500'}>
                      {e.hasCMA ? '有' : '无'}
                    </span>
                  </div>
                  {e.cmaReportNo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">报告编号</span>
                      <span className="text-slate-800">{e.cmaReportNo}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">{e.noPretreatmentReason}</p>
              )}
            </div>
            {e.facilityPhotos.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-slate-500">设施照片（含铭牌）</span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {e.facilityPhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt="设施" className="w-full h-20 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pipes */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              管道与排放口
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {e.indoorPipePhotos.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">室内管道</span>
                  <img src={e.indoorPipePhotos[0]} alt="室内管道" className="w-full h-24 object-cover rounded-lg mt-1.5" />
                </div>
              )}
              {e.outdoorPipePhotos.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">外立面管道/排放口</span>
                  <img src={e.outdoorPipePhotos[0]} alt="外立面管道" className="w-full h-24 object-cover rounded-lg mt-1.5" />
                </div>
              )}
            </div>
          </div>

          {/* Noise */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              噪声排放登记
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">主要噪声源</span>
                <span className="text-slate-800">
                  {e.noiseSources.join('、') || '无'}
                  {e.otherNoiseSource && (
                    <span className="text-xs text-amber-600 ml-1">（其他：{e.otherNoiseSource}）</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">降噪措施</span>
                <span className="text-slate-800">{e.noiseMeasures.join('、') || '无'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">扰民投诉记录</span>
                <span className={e.noiseComplaint ? 'text-amber-600' : 'text-emerald-600'}>
                  {e.noiseComplaint ? '有' : '无'}
                </span>
              </div>
              {e.noiseComplaintDesc && (
                <div className="flex justify-between">
                  <span className="text-slate-500">投诉情况</span>
                  <span className="text-slate-800">{e.noiseComplaintDesc}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">噪声排放</span>
                <span className={e.noiseExceed === '达标无扰民' ? 'text-emerald-600' : 'text-amber-600'}>
                  {e.noiseExceed}
                </span>
              </div>
            </div>
            {e.noisePhotos.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-slate-500">噪声设备照片</span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {e.noisePhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt="噪声设备" className="w-full h-20 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Core Inspection */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              现场排查记录
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">油烟直排自然环境</span>
                <span className={e.directDischarge ? 'text-amber-600' : 'text-emerald-600'}>
                  {e.directDischarge ? '存在' : '不存在'}
                </span>
              </div>
              {e.directDischargeLocation && (
                <div className="flex justify-between">
                  <span className="text-slate-500">直排位置</span>
                  <span className="text-slate-800">{e.directDischargeLocation}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">设施配置情况</span>
                <span className={e.facilityMissing === '全部配置' ? 'text-emerald-600' : 'text-amber-600'}>
                  {e.facilityMissing}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">油烟排放</span>
                <span className={e.emissionExceed === '达标' ? 'text-emerald-600' : 'text-amber-600'}>
                  {e.emissionExceed}{e.emissionExceedValue ? ` (${e.emissionExceedValue})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Inspection Record */}
          {e.status === '已排查' && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                排查登记信息
              </h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">排查日期</span>
                  <span className="text-slate-800">{e.inspectionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">现场调查人</span>
                  <span className="text-slate-800">{e.inspector}</span>
                </div>
                {e.reviewer && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">数据复核人</span>
                    <span className="text-slate-800">{e.reviewer}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
