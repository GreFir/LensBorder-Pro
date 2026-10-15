import { useEffect, useState } from 'react';
import { Icon } from '../themes/Icons';

export default function ImageTray({ images, currentId, isOpen, onToggle, onSelect, onApplyToOthers, onExportAll, onRemove, onClearAll }) {
  const hasImages = images.length > 0;
  const canApplyToOthers = images.length > 1 && !!currentId;
  const [applyFeedback, setApplyFeedback] = useState('');
  useEffect(() => {
    if (!applyFeedback) return;
    const timer = setTimeout(() => setApplyFeedback(''), 2400);
    return () => clearTimeout(timer);
  }, [applyFeedback]);
  const handleApplyToOthers = async () => {
    if (!canApplyToOthers || !onApplyToOthers) return;
    try {
      const count = await Promise.resolve(onApplyToOthers());
      setApplyFeedback(count > 0 ? `已应用到 ${count} 张` : '无可应用目标');
    } catch { setApplyFeedback('应用失败，请重试'); }
  };

  return (
    <section className="lb-tray" data-collapsed={!isOpen} aria-label="批量工作台">
      <header className="lb-tray-header">
        <div className="lb-tray-title"><span className="lb-tray-mark"><Icon name="stack" size={18} /></span><strong>批量工作台</strong><span className="lb-count">{String(images.length).padStart(2, '0')}</span></div>
        <div className="lb-tray-actions">
          <span className="lb-tray-feedback" role="status">{applyFeedback}</span>
          <button type="button" className="lb-button" disabled={!canApplyToOthers} onClick={handleApplyToOthers} aria-label="应用到其他图片" title="应用到其他图片"><Icon name="stack" size={14} /><span>同步样式</span></button>
          <button type="button" className="lb-button lb-danger" disabled={!hasImages} onClick={onClearAll} aria-label="清空图片" title="清空图片"><Icon name="trash" size={14} /><span>清空</span></button>
          <button type="button" className="lb-button lb-primary" disabled={!hasImages} onClick={onExportAll} aria-label="导出全部照片"><Icon name="download" size={14} /><span>导出全部</span></button>
          <button type="button" className="lb-icon-button lb-tray-toggle" onClick={onToggle} aria-expanded={isOpen} aria-label={isOpen ? '收起批量工作台' : '展开批量工作台'} title={isOpen ? '收起批量工作台' : '展开批量工作台'}><Icon name="chevron" size={15} /></button>
        </div>
      </header>
      {isOpen && <div className="lb-filmstrip">
        {hasImages ? images.map((item, index) => (
          <article key={item.id} className="lb-film-frame" data-active={item.id === currentId}>
            <button type="button" className="lb-film-select" onClick={() => onSelect(item.id)} aria-pressed={item.id === currentId} aria-label={`选择照片 ${item.name}`}>
              <img src={item.url} alt={item.name} loading="lazy" />
              <span className="lb-film-label"><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.name}</strong></span>
              {item.id === currentId && <span className="lb-film-current"><Icon name="check" size={11} />当前</span>}
            </button>
            {/* Siblings, not nested buttons: both actions remain keyboard accessible. */}
            <button type="button" className="lb-film-remove" onClick={() => onRemove(item.id)} aria-label={`移除照片 ${item.name}`} title={`移除 ${item.name}`}><Icon name="close" size={12} /></button>
          </article>
        )) : <div className="lb-film-empty"><span className="lb-film-placeholder"><Icon name="plus" size={20} /></span><div><strong>留给下一张好照片</strong><p>导入多张照片后，在这里切换、同步样式和批量导出。</p></div><span className="lb-film-dashes" aria-hidden="true" /></div>}
      </div>}
    </section>
  );
}
