/** 油烟在线监测设备 */
export interface MonitorDevice {
  id: string;
  mn: string;                    // 设备MN号
  online: boolean;               // 是否在线
  fumeConcentration: number;     // 油烟浓度 mg/m³
  particleConcentration: number; // 颗粒物浓度 mg/m³
  nmhc: number;                  // 非甲烷总烃 mg/m³
  purifierCurrent: number;       // 净化器电流值 A
  purifierStatus: '运行' | '关闭' | '故障'; // 净化器状态
  fanCurrent: number;            // 风机电流值 A
  fanStatus: '运行' | '关闭';    // 风机状态
  dataTime: string;              // 数据时间
}

/** 企业档案报告文件 */
export interface ReportFile {
  id: string;
  name: string;
  fileType: 'pdf' | 'image';
  /** 内置示例报告：静态资源路径 */
  url?: string;
  /** 用户上传报告：base64 dataUrl（localStorage 持久化） */
  dataUrl?: string;
  size: number;                  // 字节
  uploadTime: string;
  source: 'builtin' | 'uploaded';
}

export interface Enterprise {
  id: string;
  fullName: string;
  storeName: string;
  creditCode: string;
  licenseAddress: string;
  actualAddress: string;
  street: string;
  businessType: string;
  otherBusinessType?: string; // 经营类型为"其他"时的说明
  venueType: string;
  owner: string;
  phone: string;
  businessHours: string;
  scale: string;
  stovePower: number;
  maxStoveCount: number;
  hoodArea: number;
  pollutionPermit: {
    status: string;
    licenseNo?: string;
    expiryDate?: string;
  };
  envRecord: string;
  longitude: number;
  latitude: number;
  sensitiveType: string;
  sensitiveDistance: number;
  panoramaPhotos: string[];
  hasPretreatment: boolean;
  noPretreatmentReason?: string;
  facilityType: string;
  otherFacilityType?: string; // 设施类型为"其他"时的说明
  cleaningCycle: string;
  cleaningCycleNumber: number;
  cleaningNote?: string;
  lastMaintenanceDate: string;
  hasCMA: boolean;
  cmaReportNo?: string;
  facilityPhotos: string[];
  indoorPipePhotos: string[];
  outdoorPipePhotos: string[];
  noiseSources: string[];
  otherNoiseSource?: string; // 噪声源含"其他"时的说明
  noiseMeasures: string[];
  noiseComplaint: boolean;
  noiseComplaintDesc?: string;
  noisePhotos: string[];
  directDischarge: boolean;
  directDischargeLocation?: string;
  facilityMissing: string;
  emissionExceed: string;
  emissionExceedValue?: string;
  noiseExceed: string;
  problemPhotos: string[];
  inspectionDate: string;
  inspector: string;
  reviewer: string;
  status: string;
  /** 监测设备（可能多台） */
  devices?: MonitorDevice[];
  /** 内置示例报告 */
  reports?: ReportFile[];
}

export interface InspectionForm {
  fullName: string;
  storeName: string;
  creditCode: string;
  licenseAddress: string;
  actualAddress: string;
  street: string;
  businessType: string;
  otherBusinessType: string;
  venueType: string;
  owner: string;
  phone: string;
  businessHours: string;
  stovePower: string;
  maxStoveCount: string;
  hoodArea: string;
  pollutionPermitStatus: string;
  pollutionPermitNo: string;
  pollutionPermitExpiry: string;
  envRecord: string;
  longitude: string;
  latitude: string;
  sensitiveType: string;
  sensitiveDistance: string;
  panoramaPhotos: string[];
  hasPretreatment: string;
  noPretreatmentReason: string;
  facilityType: string;
  otherFacilityType: string;
  cleaningCycle: string;
  cleaningCycleNumber: string;
  cleaningNote: string;
  lastMaintenanceDate: string;
  hasCMA: string;
  cmaReportNo: string;
  facilityPhotos: string[];
  indoorPipePhotos: string[];
  outdoorPipePhotos: string[];
  noiseSources: string[];
  otherNoiseSource: string;
  noiseMeasures: string[];
  noiseComplaint: string;
  noiseComplaintDesc: string;
  noisePhotos: string[];
  directDischarge: string;
  directDischargeLocation: string;
  facilityMissing: string;
  emissionExceed: string;
  emissionExceedValue: string;
  noiseExceed: string;
  problemPhotos: string[];
  inspector: string;
  reviewer: string;
}
