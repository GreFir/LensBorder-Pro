import { useUiTheme } from '../themes/context';
import { UI_STYLES } from '../themes/preferences';
import { Icon, ThemeSwatch } from '../themes/Icons';

export default function AppearancePanel({ themeMode, onThemeModeChange }) {
  const { style, setStyle } = useUiTheme();
  const current = UI_STYLES.find((item) => item.id === style);
  return (
    <details className="lb-appearance">
      <summary>
        <Icon name="palette" size={17} /><span>界面外观</span>
        <span className="lb-summary-value">{current.name}</span><Icon name="chevron" size={13} />
      </summary>
      <div className="lb-appearance-body">
        <p className="lb-help">仅改变编辑器外观，不影响照片与导出水印。</p>
        <fieldset className="lb-theme-choices">
          <legend className="lb-sr-only">界面风格</legend>
          {UI_STYLES.map((item) => (
            <label className="lb-theme-choice" key={item.id} data-active={style === item.id}>
              <input type="radio" name="lb-ui-style" value={item.id} checked={style === item.id} onChange={() => setStyle(item.id)} />
              <ThemeSwatch style={item.id} />
              <span className="lb-theme-copy"><strong>{item.name}</strong><small>{item.subtitle}</small></span>
              <span className="lb-radio-mark">{style === item.id && <Icon name="check" size={12} />}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="lb-mode-choices">
          <legend>明暗模式</legend>
          <div>
            {[
              { id: 'system', label: '自动', icon: 'monitor' },
              { id: 'light', label: '浅色', icon: 'sun' },
              { id: 'dark', label: '深色', icon: 'moon' },
            ].map((mode) => (
              <label key={mode.id} data-active={themeMode === mode.id}>
                <input type="radio" name="lb-color-mode" value={mode.id} checked={themeMode === mode.id} onChange={() => onThemeModeChange(mode.id)} />
                <Icon name={mode.icon} size={15} /><span>{mode.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </details>
  );
}
