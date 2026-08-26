import { useEffect, useMemo, useRef, useState } from 'react';
import type { Enterprise, ReportFile } from '@/types';
import { X, Upload, FileText, Image as ImageIcon, Eye, Trash2, FileWarning } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  enterprise: Enterprise | null;
}

const storageKey = (enterpriseId: string) => `yyjd-reports-${enterpriseId}`;

function loadUploaded(enterpriseId: string): ReportFile[] {
  try {
    const raw = localStorage.getItem(storageKey(enterpriseId));
    return raw ? (JSON.parse(raw) as ReportFile[]) : [];
  } catch {
    return [];
  }
}

function saveUploaded(enterpriseId: string, reports: ReportFile[]) {
  try {
    localStorage.setItem(storageKey(enterpriseId), JSON.stringify(reports));
  } catch {
    alert('本地存储空间不足，文件过大无法保存。可选择较小的文件（建议 3MB 以内）。');
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ReportModal({ open, onClose, enterprise }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<ReportFile[]>([]);
  const [preview, setPreview] = useState<ReportFile | null>(null);

  useEffect(() => {
    if (open && enterprise) {
      setUploaded(loadUploaded(enterprise.id));
      setPreview(null);
    }
  }, [open, enterprise]);

  const allReports = useMemo(() => {
    const builtin = enterprise?.reports ?? [];
    return [...uploaded, ...builtin];
  }, [enterprise, uploaded]);

  if (!open || !enterprise) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
      if (!isPdf && !isImage) {
        alert(`不支持的文件类型：${file.name}\n仅支持 PDF 或图片文件。`);
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        alert(`文件过大：${file.name}\n原型版本限制单个文件 3MB 以内。`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const report: ReportFile = {
          id: `U${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          fileType: isPdf ? 'pdf' : 'image',
          dataUrl: reader.result as string,
          size: file.size,
          uploadTime: new Date().toLocaleString('zh-CN', { hour12: false }),
          source: 'uploaded',
        };
        setUploaded(prev => {
          const next = [report, ...prev];
          saveUploaded(enterprise.id, next);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (report: ReportFile) => {
    if (report.source === 'builtin') return;
    setUploaded(prev => {
      const next = prev.filter(r => r.id !== report.id);
      saveUploaded(enterprise.id, next);
      return next;
    });
    if (preview?.id === report.id) setPreview(null);
  };

  const previewSrc = preview ? (preview.dataUrl || preview.url || '') : '';

  return (
    <>
      {/* 报告列表弹窗 */}
      <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">企业报告</h3>
              <p className="text-xs text-slate-500 mt-0.5">{enterprise.storeName} · 共 {allReports.length} 份</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* 上传区 */}
          <div className="px-5 pt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-blue-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-blue-600 hover:bg-blue-50/60 hover:border-blue-400 transition-all"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">点击上传报告</span>
              <span className="text-[11px] text-slate-400">支持 PDF / 图片，单文件 3MB 以内，可多次上传</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {/* 报告列表 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {allReports.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <FileWarning className="w-8 h-8 text-slate-300" />
                暂无报告，点击上方区域上传
              </div>
            )}
            {allReports.map(report => (
              <div
                key={report.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  report.fileType === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
                }`}>
                  {report.fileType === 'pdf' ? <FileText className="w-4.5 h-4.5" /> : <ImageIcon className="w-4.5 h-4.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{report.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{formatSize(report.size)}</span>
                    <span>{report.uploadTime}</span>
                    {report.source === 'builtin' && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">示例</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPreview(report)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  预览
                </button>
                {report.source === 'uploaded' && (
                  <button
                    onClick={() => handleDelete(report)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 预览弹窗 */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="text-sm font-medium text-slate-800 truncate">{preview.name}</div>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 overflow-auto flex items-start justify-center">
              {preview.fileType === 'pdf' ? (
                <iframe src={previewSrc} title={preview.name} className="w-full h-full border-0" />
              ) : (
                <img src={previewSrc} alt={preview.name} className="max-w-full h-auto" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
