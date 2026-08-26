import type { Enterprise } from '@/types';

export const STREETS = ['新明街道', '梅墟街道', '聚贤街道', '贵驷街道', '其他'] as const;
export const BUSINESS_TYPES = ['酒店', '饭店', '快餐店', '小吃店', '美食铺', '其他'] as const;

const FIRST_NAMES = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林'];
const LAST_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超'];
const SHOP_PREFIXES = ['江南', '老北京', '川味', '外婆', '乡村', '鲜味', '金牌', '美味', '老字号', '正宗', '特色', '家常'];
const SHOP_SUFFIXES = ['餐厅', '饭店', '酒楼', '餐馆', '食府', '面馆', '饺子馆', '火锅城', '大排档', '小吃', '快餐', '烧烤'];

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function randomName(): string {
  return randomPick(FIRST_NAMES) + randomPick(LAST_NAMES) + (Math.random() > 0.5 ? randomPick(LAST_NAMES) : '');
}

function randomPhone(): string {
  const prefixes = ['138', '139', '136', '137', '150', '151', '152', '157', '158', '159', '187', '188'];
  return randomPick(prefixes) + String(randomInt(10000000, 99999999));
}

function generateCreditCode(): string {
  return '91330201MA2' + String(randomInt(100000, 999999)) + String(randomInt(10, 99));
}

function generateDate(year: number, month: number): string {
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── 规模判断标准 ──────────────────────────────────

function getScaleByPower(power: number): number {
  // 小型：[1.67, <5.00)  中型：[≥5.00, <10)  大型：[≥10]
  if (power >= 10) return 3;
  if (power >= 5) return 2;
  if (power >= 1.67) return 1;
  return 0; // 未达小型最低标准
}

function getScaleByStoveCount(count: number): number {
  // 小型：[≥1, <3]  中型：[≥3, <6]  大型：[≥6]
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

function getScaleByHoodArea(area: number): number {
  // 小型：[≥1.1, <3.3)  中型：[≥3.3, <6.6)  大型：[≥6.6]
  if (area >= 6.6) return 3;
  if (area >= 3.3) return 2;
  if (area >= 1.1) return 1;
  return 0;
}

const LEVEL_NAMES: Record<number, string> = { 0: '未达标准', 1: '小型', 2: '中型', 3: '大型' };

/**
 * 根据指标判断企业规模
 * 如果填写了灶头总功率（>0），以功率对应的规模标准为准
 * 否则取三个指标中最大的规模
 * 若都未达到小型最低标准，返回特殊标记
 */
export function calculateScale(stovePower: number, maxStoveCount: number, hoodArea: number): string {
  // 如果填写了灶头总功率，以功率对应的规模标准为准
  if (stovePower > 0) {
    const level = getScaleByPower(stovePower);
    if (level === 0) return '小型（未达到小型企业最低标准）';
    return LEVEL_NAMES[level];
  }

  // 否则取三个指标中最大的
  const s = getScaleByStoveCount(maxStoveCount);
  const h = getScaleByHoodArea(hoodArea);

  const maxLevel = Math.max(s, h);

  if (maxLevel === 0) {
    return '小型（未达到小型企业最低标准）';
  }

  return LEVEL_NAMES[maxLevel];
}

/**
 * 由灶头总功率计算基准灶头数：功率 / 1.67，保留一位小数
 */
export function calcStoveCountFromPower(power: number): number {
  return parseFloat((power / 1.67).toFixed(1));
}

/**
 * 由基准灶头数计算总功率：灶头数 × 1.67，保留两位小数
 */
export function calcPowerFromStoveCount(count: number): number {
  return parseFloat((count * 1.67).toFixed(2));
}

export function generateEnterprises(count: number = 128): Enterprise[] {
  const enterprises: Enterprise[] = [];

  for (let i = 0; i < count; i++) {
    const street = randomPick(STREETS);
    const businessType = randomPick(BUSINESS_TYPES);
    const hasPermit = Math.random() > 0.4;
    const envRecord = Math.random() > 0.35 ? '已备案' : '未备案';
    const hasPretreatment = Math.random() > 0.3;
    const shopName = randomPick(SHOP_PREFIXES) + randomPick(SHOP_SUFFIXES);

    // 先生成基准灶头数（1~10，保留一位小数）
    const maxStoveCount = randomFloat(0.5, 10);
    // 由灶头数计算总功率
    const stovePower = calcPowerFromStoveCount(maxStoveCount);
    // 生成投影面积（0.5~12）
    const hoodArea = randomFloat(0.5, 12);

    const scale = calculateScale(stovePower, maxStoveCount, hoodArea);

    enterprises.push({
      id: `E${i}`,
      fullName: `宁波市高新区${shopName}有限公司`,
      storeName: shopName,
      creditCode: generateCreditCode(),
      licenseAddress: `宁波市高新区${street}江南路${randomInt(100, 2000)}号`,
      actualAddress: `宁波市高新区${street}沧海路${randomInt(100, 2000)}号`,
      street,
      businessType,
      otherBusinessType: businessType === '其他' ? '特色餐饮店' : undefined,
      venueType: randomPick(['沿街商铺', '商业综合体', '独立楼宇'] as const),
      owner: randomName(),
      phone: randomPhone(),
      businessHours: `${randomInt(6, 10)}:00-${randomInt(20, 23)}:00`,
      scale,
      stovePower,
      maxStoveCount,
      hoodArea,
      pollutionPermit: {
        status: hasPermit ? '已办理' : Math.random() > 0.7 ? '已过期' : '未办理',
        licenseNo: hasPermit ? `浙甬环许字[202${randomInt(1, 5)}]第${randomInt(1000, 9999)}号` : undefined,
        expiryDate: hasPermit ? generateDate(2025 + randomInt(0, 2), randomInt(1, 12)) : undefined,
      },
      envRecord,
      longitude: 121.55 + randomInt(-500, 500) / 10000,
      latitude: 29.88 + randomInt(-500, 500) / 10000,
      sensitiveType: randomPick(['居民区', '学校', '医院', '幼儿园', '办公楼', '无'] as const),
      sensitiveDistance: randomInt(10, 200),
      panoramaPhotos: [`/images/shop${randomInt(1, 4)}.jpg`],
      hasPretreatment,
      noPretreatmentReason: hasPretreatment ? undefined : '经营规模较小，未安装净化设施',
      facilityType: hasPretreatment ? randomPick(['静电式', 'UV光解式', '复合式', '其他'] as const) : '',
      otherFacilityType: hasPretreatment && Math.random() > 0.8 ? '水喷淋式' : undefined,
      cleaningCycle: hasPretreatment ? randomPick(['周', '月', '年'] as const) : '',
      cleaningCycleNumber: hasPretreatment ? randomInt(1, 6) : 0,
      cleaningNote: hasPretreatment ? '每月定期清洗' : undefined,
      lastMaintenanceDate: hasPretreatment ? generateDate(2025, randomInt(1, 6)) : '',
      hasCMA: Math.random() > 0.6,
      cmaReportNo: '',
      facilityPhotos: hasPretreatment ? [`/images/equipment${randomInt(1, 2)}.jpg`] : [],
      indoorPipePhotos: [`/images/pipe${randomInt(1, 2)}.jpg`],
      outdoorPipePhotos: [`/images/pipe${randomInt(1, 2)}.jpg`],
      noiseSources: [randomPick(['风机', '油烟净化器', '空调外机', '后厨设备', '其他'] as const)],
      otherNoiseSource: Math.random() > 0.9 ? '排风扇' : undefined,
      noiseMeasures: [randomPick(['减震垫', '隔声罩', '消声器', '管道软连接'] as const)],
      noiseComplaint: Math.random() > 0.85,
      noiseComplaintDesc: '',
      noisePhotos: [],
      directDischarge: Math.random() > 0.9,
      directDischargeLocation: '',
      facilityMissing: hasPretreatment ? '全部配置' : Math.random() > 0.5 ? '部分未配置' : '完全未配置',
      emissionExceed: Math.random() > 0.85 ? '超标' : '达标',
      emissionExceedValue: '',
      noiseExceed: Math.random() > 0.85 ? '存在扰民现象' : '达标无扰民',
      problemPhotos: [],
      inspectionDate: generateDate(randomInt(2025, 2026), randomInt(1, 12)),
      inspector: randomName(),
      reviewer: '',
      status: '已排查',
    });
  }

  return enterprises;
}

export const initialEnterprises = generateEnterprises(128);

export function getMonthlyTrend(enterprises: Enterprise[]) {
  const now = new Date();
  const months: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = enterprises.filter(e => {
      if (!e.inspectionDate) return false;
      const ed = new Date(e.inspectionDate);
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
    }).length;
    months.push({ month: monthLabel, count });
  }
  return months;
}

export function getStatistics(enterprises: Enterprise[]) {
  const total = enterprises.length;
  const streetDistribution = STREETS.map(street => ({
    name: street,
    count: enterprises.filter(e => e.street === street).length,
  }));

  // 规模统计（含特殊标记）
  const scaleDistribution = [
    { name: '小型', count: enterprises.filter(e => e.scale === '小型' || e.scale === '小型（未达到小型企业最低标准）').length },
    { name: '中型', count: enterprises.filter(e => e.scale === '中型').length },
    { name: '大型', count: enterprises.filter(e => e.scale === '大型').length },
  ];

  const businessTypeDistribution = BUSINESS_TYPES.map(type => ({
    name: type,
    count: enterprises.filter(e => e.businessType === type).length,
  }));

  const venueDistribution = [
    { name: '沿街商铺', count: enterprises.filter(e => e.venueType === '沿街商铺').length },
    { name: '商业综合体', count: enterprises.filter(e => e.venueType === '商业综合体').length },
    { name: '独立楼宇', count: enterprises.filter(e => e.venueType === '独立楼宇').length },
  ];

  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const thisMonthCount = enterprises.filter(e => {
    if (!e.inspectionDate) return false;
    const d = new Date(e.inspectionDate);
    return d.getFullYear() === thisYear && d.getMonth() + 1 === thisMonth;
  }).length;

  const lastMonthDate = new Date(thisYear, thisMonth - 2, 1);
  const lastMonthCount = enterprises.filter(e => {
    if (!e.inspectionDate) return false;
    const d = new Date(e.inspectionDate);
    return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() + 1 === lastMonthDate.getMonth() + 1;
  }).length;

  const pretreatmentCount = enterprises.filter(e => e.hasPretreatment).length;
  const cleaningCycleCount = enterprises.filter(e => e.hasPretreatment && e.cleaningCycleNumber > 0).length;

  const monthlyTrend = getMonthlyTrend(enterprises);

  return {
    total,
    thisMonthCount,
    lastMonthCount,
    streetDistribution,
    scaleDistribution,
    businessTypeDistribution,
    venueDistribution,
    pretreatmentCount,
    cleaningCycleCount,
    monthlyTrend,
  };
}
