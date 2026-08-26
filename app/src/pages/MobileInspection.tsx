import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { InspectionForm } from '@/types';
import { ChevronLeft, Save, Camera, MapPin, X, Check } from 'lucide-react';
import { STREETS, BUSINESS_TYPES, calculateScale, calcStoveCountFromPower } from '@/data/enterprises';

const emptyForm: InspectionForm = {
  fullName: '', storeName: '', creditCode: '', licenseAddress: '', actualAddress: '',
  street: '', businessType: '', otherBusinessType: '', venueType: '', owner: '', phone: '', businessHours: '',
  stovePower: '', maxStoveCount: '', hoodArea: '',
  pollutionPermitStatus: '', pollutionPermitNo: '', pollutionPermitExpiry: '',
  envRecord: '', longitude: '', latitude: '', sensitiveType: '', sensitiveDistance: '',
  panoramaPhotos: [], hasPretreatment: '', noPretreatmentReason: '', facilityType: '', otherFacilityType: '',
  cleaningCycle: '', cleaningCycleNumber: '', cleaningNote: '', lastMaintenanceDate: '', hasCMA: '', cmaReportNo: '',
  facilityPhotos: [], indoorPipePhotos: [], outdoorPipePhotos: [], noiseSources: [], otherNoiseSource: '',
  noiseMeasures: [], noiseComplaint: '', noiseComplaintDesc: '', noisePhotos: [],
  directDischarge: '', directDischargeLocation: '', facilityMissing: '', emissionExceed: '',
  emissionExceedValue: '', noiseExceed: '', problemPhotos: [], inspector: '', reviewer: '',
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FormSection({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 text-left"
      >
        <div className="w-1 h-5 bg-blue-600 rounded-full" />
        <span className="flex-1 text-sm font-semibold text-slate-800">{title}</span>
        <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform ${open ? '-rotate-90' : 'rotate-0'}`} />
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

/**
 * 根据已填写的数据自动判断企业规模
 * 如果填写了灶头总功率，以功率对应的规模标准为准
 * 否则取灶头数和投影面积的最大规模
 */
function ScaleResult({ form }: { form: InspectionForm }) {
  const stovePower = parseFloat(form.stovePower);
  const maxStoveCount = parseFloat(form.maxStoveCount);
  const hoodArea = parseFloat(form.hoodArea);

  // 没有任何有效数据
  if ((!stovePower || stovePower <= 0) && (!hoodArea || hoodArea <= 0)) {
    return <span className="text-sm text-slate-400">请填写灶头功率或投影面积</span>;
  }

  const scale = calculateScale(stovePower || 0, maxStoveCount || 0, hoodArea || 0);
  const isSpecial = scale.includes('未达到');
  const baseScale = isSpecial ? '小型' : scale;
  const colors: Record<string, string> = {
    '小型': 'bg-blue-100 text-blue-700',
    '中型': 'bg-amber-100 text-amber-700',
    '大型': 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-lg ${colors[baseScale] || 'bg-slate-100 text-slate-700'}`}>
      {scale}
    </span>
  );
}

function TextInput({ label, value, onChange, placeholder = '', required = false, type = 'text', step }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      />
    </div>
  );
}

function RadioGroup({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
              value === opt
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({ label, values, onChange, options }: {
  label: string; values: string[]; onChange: (v: string[]) => void; options: string[];
}) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
              values.includes(opt)
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoUpload({ photos, onChange, max = 3, label }: { photos: string[]; onChange: (photos: string[]) => void; max?: number; label?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, max - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onChange([...photos, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
            <img src={photo} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(idx)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
          >
            <Camera className="w-5 h-5 text-slate-400" />
            <span className="text-xs text-slate-400">上传</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export default function MobileInspection() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [form, setForm] = useState<InspectionForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [locating, setLocating] = useState(false);

  const update = useCallback(<K extends keyof InspectionForm>(key: K, value: InspectionForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  }, []);

  const getLocation = () => {
    setLocating(true);
    setTimeout(() => {
      const lng = (121.55 + (Math.random() - 0.5) * 0.1).toFixed(6);
      const lat = (29.88 + (Math.random() - 0.5) * 0.1).toFixed(6);
      update('longitude', lng);
      update('latitude', lat);
      setLocating(false);
    }, 1500);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = '请输入企业工商全称';
    if (!form.storeName.trim()) newErrors.storeName = '请输入门店名称';
    if (!form.street) newErrors.street = '请选择所属街道';
    // 功率和投影面积至少填一个
    if (!form.stovePower && !form.hoodArea) {
      newErrors.stovePower = '请填写灶头总功率或排气罩投影面积（至少一项）';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      const firstError = document.querySelector('[data-error="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const newEnterprise = {
      id: `E${Date.now()}`,
      fullName: form.fullName,
      storeName: form.storeName,
      creditCode: form.creditCode,
      licenseAddress: form.licenseAddress,
      actualAddress: form.actualAddress,
      street: form.street,
      businessType: form.businessType || '饭店',
      otherBusinessType: form.businessType === '其他' ? form.otherBusinessType : undefined,
      venueType: form.venueType || '沿街商铺',
      owner: form.owner,
      phone: form.phone,
      businessHours: form.businessHours,
      // 企业规模自动计算（三个数据取最大）
      scale: calculateScale(
        parseFloat(form.stovePower) || 0,
        parseFloat(form.maxStoveCount) || 0,
        parseFloat(form.hoodArea) || 0
      ),
      stovePower: parseFloat(form.stovePower) || 0,
      maxStoveCount: parseFloat(form.maxStoveCount) || calcStoveCountFromPower(parseFloat(form.stovePower) || 0),
      hoodArea: parseFloat(form.hoodArea) || 0,
      pollutionPermit: {
        status: form.pollutionPermitStatus || '未办理',
        licenseNo: form.pollutionPermitNo || undefined,
        expiryDate: form.pollutionPermitExpiry || undefined,
      },
      envRecord: form.envRecord || '未备案',
      longitude: parseFloat(form.longitude) || 0,
      latitude: parseFloat(form.latitude) || 0,
      sensitiveType: form.sensitiveType || '无',
      sensitiveDistance: parseFloat(form.sensitiveDistance) || 0,
      panoramaPhotos: form.panoramaPhotos,
      hasPretreatment: form.hasPretreatment === '是',
      noPretreatmentReason: form.noPretreatmentReason,
      facilityType: form.facilityType,
      otherFacilityType: form.facilityType === '其他' ? form.otherFacilityType : undefined,
      cleaningCycle: form.cleaningCycle,
      cleaningCycleNumber: form.cleaningCycle ? parseInt(form.cleaningCycleNumber) || 0 : 0,
      cleaningNote: form.cleaningNote,
      lastMaintenanceDate: form.lastMaintenanceDate,
      hasCMA: form.hasCMA === '有',
      cmaReportNo: form.cmaReportNo,
      facilityPhotos: form.facilityPhotos,
      indoorPipePhotos: form.indoorPipePhotos,
      outdoorPipePhotos: form.outdoorPipePhotos,
      noiseSources: form.noiseSources,
      otherNoiseSource: form.noiseSources.includes('其他') ? form.otherNoiseSource : undefined,
      noiseMeasures: form.noiseMeasures,
      noiseComplaint: form.noiseComplaint === '有',
      noiseComplaintDesc: form.noiseComplaintDesc,
      noisePhotos: form.noisePhotos,
      directDischarge: form.directDischarge === '存在',
      directDischargeLocation: form.directDischargeLocation,
      facilityMissing: form.facilityMissing || '',
      emissionExceed: form.emissionExceed || '达标',
      emissionExceedValue: form.emissionExceedValue,
      noiseExceed: form.noiseExceed || '达标无扰民',
      problemPhotos: form.problemPhotos,
      inspectionDate: new Date().toISOString().split('T')[0],
      inspector: form.inspector || '现场调查员',
      reviewer: form.reviewer,
      status: '已排查',
    };

    dispatch({ type: 'ADD_ENTERPRISE', payload: newEnterprise });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/enterprises');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">新增排查登记</h1>
          <button onClick={() => {}} className="p-2 -mr-2">
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Project Title */}
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="bg-blue-50 rounded-lg px-4 py-3">
          <h2 className="text-sm font-semibold text-blue-800">宁波市高新区餐饮企业排摸专项调查</h2>
          <p className="text-xs text-blue-600 mt-0.5">调查单位：浙江中一检测研究院股份有限公司</p>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">提交成功！</span>
        </div>
      )}

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Section 1: Enterprise Info */}
        <FormSection title="一、餐饮企业主体信息">
          <div data-error={!!errors.fullName}>
            <TextInput label="企业工商全称" value={form.fullName} onChange={v => update('fullName', v)} required />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>
          <div data-error={!!errors.storeName}>
            <TextInput label="门店实际经营名称（门头名称）" value={form.storeName} onChange={v => update('storeName', v)} required />
            {errors.storeName && <p className="text-xs text-red-500 mt-1">{errors.storeName}</p>}
          </div>
          <TextInput label="统一社会信用代码" value={form.creditCode} onChange={v => update('creditCode', v)} />
          <TextInput label="营业执照经营地址" value={form.licenseAddress} onChange={v => update('licenseAddress', v)} placeholder="精确至街道、社区、门牌号" />
          <TextInput label="实际经营地址" value={form.actualAddress} onChange={v => update('actualAddress', v)} placeholder="精确至街道、社区、门牌号" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              实际所属街道/排查区块 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.street}
              onChange={e => update('street', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
            >
              <option value="">请选择</option>
              {STREETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <RadioGroup label="经营类型" value={form.businessType} onChange={v => { update('businessType', v); if (v !== '其他') update('otherBusinessType', ''); }} options={[...BUSINESS_TYPES]} />
          {form.businessType === '其他' && (
            <TextInput label="其他经营类型说明" value={form.otherBusinessType} onChange={v => update('otherBusinessType', v)} placeholder="请说明具体经营类型" required />
          )}
          <RadioGroup label="经营场所属性" value={form.venueType} onChange={v => update('venueType', v)} options={['沿街商铺', '商业综合体', '独立楼宇']} />
          <TextInput label="经营负责人/法定代表人" value={form.owner} onChange={v => update('owner', v)} />
          <TextInput label="有效联系电话" value={form.phone} onChange={v => update('phone', v)} type="tel" />
          <TextInput label="日常营业时段" value={form.businessHours} onChange={v => update('businessHours', v)} placeholder="如: 09:00-21:00" />
          {/* 企业规模判断 */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              总灶头规模 <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">填写对应灶头总功率或投影面积任意一项即可判断规模（都填也可以）</p>

            {/* 对应灶头总功率 - 必填 */}
            <TextInput
              label="对应灶头总功率 (10⁸ J/h)"
              value={form.stovePower}
              onChange={v => {
                update('stovePower', v);
                const p = parseFloat(v);
                if (!isNaN(p) && p > 0) {
                  update('maxStoveCount', String(calcStoveCountFromPower(p)));
                } else {
                  update('maxStoveCount', '');
                }
              }}
              type="number"
              step="0.01"
              placeholder="例如: 5.01"
              required
            />

            {/* 最大基准灶头数 - 自动计算反显 */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                最大基准灶头数（自动计算）
              </label>
              <div className={`w-full px-4 py-3 rounded-lg border-2 text-center ${
                form.maxStoveCount
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-100 border-slate-200'
              }`}>
                {form.maxStoveCount ? (
                  <span className="text-2xl font-bold text-emerald-700">{form.maxStoveCount}</span>
                ) : (
                  <span className="text-sm text-slate-400">填写功率后自动计算</span>
                )}
                {form.maxStoveCount && (
                  <span className="text-sm text-emerald-600 ml-1">个</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">计算公式：基准灶头数 = 功率 / 1.67（保留一位小数）</p>
            </div>

            {/* 投影面积 - 必填 */}
            <div className="mt-3">
              <TextInput
                label="对应排气罩灶面总投影面积 (m²)"
                value={form.hoodArea}
                onChange={v => update('hoodArea', v)}
                type="number"
                step="0.01"
                placeholder="例如: 4.50"
                required
              />
            </div>

            {/* 自动判断的企业规模 */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-slate-600">企业规模：</span>
              <ScaleResult form={form} />
            </div>

            {/* 判断标准说明 */}
            <div className="mt-2 text-[10px] text-slate-400 leading-relaxed">
              <p>功率：小型[1.67,&lt;5.00) 中型[≥5.00,&lt;10) 大型[≥10]</p>
              <p>灶头：小型[≥1,&lt;3] 中型[≥3,&lt;6] 大型[≥6]</p>
              <p>面积：小型[≥1.1,&lt;3.3) 中型[≥3.3,&lt;6.6) 大型[≥6.6]</p>
  <p className="text-blue-500">填写功率后以功率标准为准；未填功率则取灶头数和面积最大规模；均未达小型标准显示&quot;小型（未达到小型企业最低标准）&quot;</p>
            </div>
          </div>
          <RadioGroup label="排污许可证情况" value={form.pollutionPermitStatus} onChange={v => update('pollutionPermitStatus', v)} options={['已办理', '未办理', '已过期']} />
          {form.pollutionPermitStatus === '已办理' && (
            <>
              <TextInput label="许可证编号" value={form.pollutionPermitNo} onChange={v => update('pollutionPermitNo', v)} />
              <TextInput label="有效期至" value={form.pollutionPermitExpiry} onChange={v => update('pollutionPermitExpiry', v)} type="date" />
            </>
          )}
          <RadioGroup label="环保备案情况" value={form.envRecord} onChange={v => update('envRecord', v)} options={['已备案', '未备案']} />
        </FormSection>

        {/* Section 2: Location */}
        <FormSection title="二、企业地理位置信息">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">GPS定位</label>
            <div className="flex gap-2">
              <input value={form.longitude} readOnly placeholder="经度" className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50" />
              <input value={form.latitude} readOnly placeholder="纬度" className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50" />
              <button
                onClick={getLocation}
                disabled={locating}
                className="px-3 py-2.5 bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1 disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                {locating ? '定位中' : '定位'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">手机定位经纬度，转换勘测经纬度</p>
          </div>
          <TextInput label="周边环境敏感点（居民区/学校/医院等）" value={form.sensitiveType} onChange={v => update('sensitiveType', v)} placeholder="敏感点类型" />
          <TextInput label="最近直线距离(m)" value={form.sensitiveDistance} onChange={v => update('sensitiveDistance', v)} type="number" />
          <PhotoUpload photos={form.panoramaPhotos} onChange={v => update('panoramaPhotos', v)} max={3} label="企业全景照片" />
        </FormSection>

        {/* Section 3: Facility */}
        <FormSection title="三、油烟预处理（净化）设施情况">
          <RadioGroup label="是否安装油烟预处理设施" value={form.hasPretreatment} onChange={v => update('hasPretreatment', v)} options={['是', '否']} />
          {form.hasPretreatment === '否' && (
            <TextInput label="未安装原因" value={form.noPretreatmentReason} onChange={v => update('noPretreatmentReason', v)} />
          )}
          {form.hasPretreatment === '是' && (
            <>
              <RadioGroup label="设施类型" value={form.facilityType} onChange={v => { update('facilityType', v); if (v !== '其他') update('otherFacilityType', ''); }} options={['静电式', 'UV光解式', '复合式', '其他']} />
              {form.facilityType === '其他' && (
                <TextInput label="其他设施类型说明" value={form.otherFacilityType} onChange={v => update('otherFacilityType', v)} placeholder="请说明具体设施类型" required />
              )}
              <RadioGroup label="日常清洗维护周期" value={form.cleaningCycle} onChange={v => update('cleaningCycle', v)} options={['周', '月', '年']} />
              {form.cleaningCycle && (
                <TextInput label={`几${form.cleaningCycle}清洗一次`} value={form.cleaningCycleNumber} onChange={v => update('cleaningCycleNumber', v)} type="number" placeholder={`如：2（表示每2${form.cleaningCycle}清洗一次）`} />
              )}
              <TextInput label="情况说明" value={form.cleaningNote} onChange={v => update('cleaningNote', v)} />
              <TextInput label="最近一次维护清洗日期" value={form.lastMaintenanceDate} onChange={v => update('lastMaintenanceDate', v)} type="date" />
              <RadioGroup label="设备CMA检测报告" value={form.hasCMA} onChange={v => update('hasCMA', v)} options={['有', '无']} />
              {form.hasCMA === '有' && (
                <TextInput label="报告编号" value={form.cmaReportNo} onChange={v => update('cmaReportNo', v)} />
              )}
            </>
          )}
          <PhotoUpload photos={form.facilityPhotos} onChange={v => update('facilityPhotos', v)} max={3} label="净化设施实拍照片（含铭牌）" />
        </FormSection>

        {/* Section 4: Pipes */}
        <FormSection title="四、室内油烟管网情况">
          <PhotoUpload photos={form.indoorPipePhotos} onChange={v => update('indoorPipePhotos', v)} max={3} label="室内管道现场照片" />
        </FormSection>

        {/* Section 5: Exterior Pipes */}
        <FormSection title="五、外立面管道 & 油烟排放口情况">
          <PhotoUpload photos={form.outdoorPipePhotos} onChange={v => update('outdoorPipePhotos', v)} max={3} label="外立面管道、排放口照片" />
        </FormSection>

        {/* Section 6: Noise */}
        <FormSection title="六、噪声排放专项排查">
          <CheckboxGroup label="主要噪声源（可多选）" values={form.noiseSources} onChange={v => { update('noiseSources', v); if (!v.includes('其他')) update('otherNoiseSource', ''); }} options={['风机', '油烟净化器', '空调外机', '后厨设备', '其他']} />
          {form.noiseSources.includes('其他') && (
            <TextInput label="其他噪声源说明" value={form.otherNoiseSource} onChange={v => update('otherNoiseSource', v)} placeholder="请说明具体噪声源" required />
          )}
          <CheckboxGroup label="现有降噪措施" values={form.noiseMeasures} onChange={v => update('noiseMeasures', v)} options={['减震垫', '隔声罩', '消声器', '管道软连接', '无']} />
          <RadioGroup label="噪声扰民投诉记录" value={form.noiseComplaint} onChange={v => update('noiseComplaint', v)} options={['无', '有']} />
          {form.noiseComplaint === '有' && (
            <TextInput label="情况简述" value={form.noiseComplaintDesc} onChange={v => update('noiseComplaintDesc', v)} />
          )}
          <PhotoUpload photos={form.noisePhotos} onChange={v => update('noisePhotos', v)} max={3} label="噪声设备现场照片" />
        </FormSection>

        {/* Section 7: Core Inspection */}
        <FormSection title="七、核心问题专项排查（重点核查项）">
          <RadioGroup label="油烟直排自然环境" value={form.directDischarge} onChange={v => update('directDischarge', v)} options={['不存在', '存在']} />
          {form.directDischarge === '存在' && (
            <TextInput label="直排位置、排放方式" value={form.directDischargeLocation} onChange={v => update('directDischargeLocation', v)} />
          )}
          <RadioGroup label="油烟预处理设施配置情况" value={form.facilityMissing} onChange={v => update('facilityMissing', v)} options={['全部配置', '部分未配置', '完全未配置']} />
          <div className="grid grid-cols-2 gap-3">
            <RadioGroup label="油烟超标排放" value={form.emissionExceed} onChange={v => update('emissionExceed', v)} options={['达标', '超标']} />
            {form.emissionExceed === '超标' && (
              <TextInput label="超标数值、具体位置" value={form.emissionExceedValue} onChange={v => update('emissionExceedValue', v)} />
            )}
          </div>
          <RadioGroup label="噪声超标/扰民" value={form.noiseExceed} onChange={v => update('noiseExceed', v)} options={['达标无扰民', '噪声超标', '存在扰民现象']} />
          <PhotoUpload photos={form.problemPhotos} onChange={v => update('problemPhotos', v)} max={3} label="问题现场照片" />
        </FormSection>

        {/* Section 8: Sign-off */}
        <FormSection title="八、登记信息">
          <TextInput label="现场调查人" value={form.inspector} onChange={v => update('inspector', v)} />
          <TextInput label="数据复核人" value={form.reviewer} onChange={v => update('reviewer', v)} />
        </FormSection>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
          >
            提交排查登记
          </button>
        </div>
      </div>
    </div>
  );
}
