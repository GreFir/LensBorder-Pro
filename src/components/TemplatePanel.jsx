import { TEMPLATES } from '../constants/templates';
import { useUiTheme } from '../themes/context';
import { UI_STYLES } from '../themes/preferences';
import { Icon } from '../themes/Icons';
import AppearancePanel from './AppearancePanel';
import TemplateThumbnail from './TemplateThumbnail';

const clampZoom = (value) => Math.min(3.5, Math.max(0.2, value));

export default function TemplatePanel({
  config, exifStatus, isProcessing, onUpload, onTemplateChange, zoom, onZoomChange,
  hasImage, onDownload, exportQuality, onExportQualityChange,
  themeMode, onThemeModeChange, isCollapsed, onToggleCollapse,
}) {
  const { style } = useUiTheme();
  const currentStyle = UI_STYLES.find((item) => item.id === style);
  return (
    <aside className="lb-sidebar" data-collapsed={isCollapsed} aria-label="模板与素材">
      <header className="lb-brand">
        <span className="lb-brand-mark"><Icon name="aperture" size={25} /></span>
        {!isCollapsed && <div className="lb-brand-copy"><strong>LensBorder<span> Pro</span></strong><small>THE PHOTO FINISHING STUDIO</small></div>}
        <button type="button" className="lb-icon-button lb-collapse" onClick={onToggleCollapse} aria-label={isCollapsed ? '展开左侧面板' : '收起左侧面板'} title={isCollapsed ? '展开左侧面板' : '收起左侧面板'}><Icon name="chevron" size={16} /></button>
      </header>

      <div className="lb-sidebar-content">
        <label className={isCollapsed ? 'lb-upload-compact lb-icon-button' : 'lb-upload'} title="导入照片">
          <input type="file" accept="image/*,.heic,.heif" multiple onChange={onUpload} disabled={isProcessing} className="lb-sr-only" aria-label="导入照片" />
          <span className="lb-upload-symbol"><Icon name="upload" size={isCollapsed ? 19 : 23} /></span>
          {!isCollapsed && <><strong>{isProcessing ? '正在读取照片…' : '导入你的照片'}</strong><span>JPG · PNG · WebP · HEIC</span><small><Icon name="lock" size={11} />本地处理，保留你的隐私</small></>}
        </label>
        {!isCollapsed && <div className="lb-import-status" role="status"><span className="lb-status-dot" data-state={exifStatus} />{exifStatus === 'ready' ? 'EXIF 已就绪' : exifStatus === 'error' ? 'EXIF 不可用，可手动输入' : '正在加载 EXIF'}</div>}

        <section className="lb-library" aria-label="水印模板">
          {!isCollapsed && <div className="lb-section-heading"><span><Icon name="grid" size={16} />模板库</span><small>{String(TEMPLATES.length).padStart(2, '0')} STYLES</small></div>}
          <div className="lb-template-grid">
            {TEMPLATES.map((template, index) => (
              <button key={template.id} type="button" className="lb-template-card" aria-pressed={template.id === config.template} aria-label={template.label} onClick={() => onTemplateChange(template.id)} title={`${template.label} · ${template.caption}`}>
                <TemplateThumbnail id={template.id} />
                {!isCollapsed && <div className="lb-template-copy"><span className="lb-template-number">{String(index + 1).padStart(2, '0')}</span><strong>{template.label}</strong><small>{template.caption}</small></div>}
                {template.id === config.template && <span className="lb-template-check"><Icon name="check" size={11} /></span>}
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="lb-sidebar-footer">
        {isCollapsed ? <>
          <button type="button" className="lb-icon-button" onClick={onToggleCollapse} aria-label="展开面板以设置界面外观" title="界面外观"><Icon name="palette" /></button>
          <button type="button" className="lb-icon-button lb-primary" disabled={!hasImage} onClick={onDownload} aria-label="导出当前图片" title="导出当前图片"><Icon name="download" /></button>
        </> : <>
          <AppearancePanel themeMode={themeMode} onThemeModeChange={onThemeModeChange} />
          <details className="lb-export-options">
            <summary><Icon name="sliders" size={16} /><span>预览与导出</span><span className="lb-summary-value">JPEG · {Math.round(exportQuality * 100)}%</span><Icon name="chevron" size={13} /></summary>
            <div className="lb-export-options-body">
              <label htmlFor="lb-preview-zoom">预览缩放<output>{Math.round(zoom * 100)}%</output></label>
              <div className="lb-zoom-control">
                <button type="button" className="lb-icon-button" onClick={() => onZoomChange(clampZoom(zoom - 0.1))} aria-label="缩小预览"><Icon name="minus" size={13} /></button>
                <input id="lb-preview-zoom" type="range" min="0.2" max="3.5" step="0.05" value={zoom} onChange={(event) => onZoomChange(clampZoom(Number(event.target.value)))} />
                <button type="button" className="lb-icon-button" onClick={() => onZoomChange(clampZoom(zoom + 0.1))} aria-label="放大预览"><Icon name="plus" size={13} /></button>
              </div>
              <label htmlFor="lb-export-quality">导出质量<output>{Math.round(exportQuality * 100)}%</output></label>
              <input id="lb-export-quality" type="range" min="0.5" max="1" step="0.01" value={exportQuality} onChange={(event) => onExportQualityChange(Number(event.target.value))} />
            </div>
          </details>
          <button type="button" className="lb-button lb-primary lb-export" disabled={!hasImage} onClick={onDownload}><Icon name="download" size={16} /><span>导出高清图</span><small>JPEG</small></button>
          <div className="lb-edition"><Icon name={style} size={12} />{currentStyle.english}<span>LOCAL FIRST</span></div>
        </>}
      </footer>
    </aside>
  );
}
