import './HdrExportOptions.css';

export default function HdrExportOptions({ mode, onChange, source, disabled }) {
  const sourceLabel = !source ? '导入照片后自动检测原图动态范围。' :
    source.status === 'hdr' ? `原图：HDR JPEG 增益图 · ${source.colorSpace === 'display-p3' ? 'Display P3' : 'sRGB'}。自动模式保留 HDR。` :
    source.status === 'sdr' ? '原图：SDR。自动模式导出普通 JPEG。' : source.reason;
  return (
    <div className="lb-hdr-options">
      <label htmlFor="lb-export-range">动态范围</label>
      <select id="lb-export-range" value={mode} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-describedby="lb-hdr-help">
        <option value="auto">自动（跟随每张原图）</option>
        <option value="sdr">SDR JPEG</option>
        <option value="hdr">HDR JPEG（保留增益图）</option>
      </select>
      <p id="lb-hdr-help">{sourceLabel}</p>
      <p>预览为 SDR；HDR 成品需兼容的查看器与屏幕。HDR 模式不会给普通照片虚构高光。</p>
    </div>
  );
}
