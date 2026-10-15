// Original inline SVGs. No icon CDN, remote fonts, image requests or license dependency.
const paths = {
  aperture: <><circle cx="12" cy="12" r="9" /><path d="m9 3-3 9 6 8m8-11-9-3-8 6m12 9 3-9-6-8" /></>,
  glass: <><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" /><path d="M8 15a4 4 0 0 0 4 4m5-13 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z" /></>,
  memphis: <><circle cx="7" cy="7" r="4" /><path d="m15 3 6 10H10Z M3 17l3 3 3-3 3 3 3-3 3 3 3-3" /></>,
  collage: <><path d="m4 4 12-1 2 15-12 1Z" /><path d="m17 6 4 1-2 15-12-2m1-13 6-1m-5 5 6-1" /><path d="m6 2 5 1-1 3-5-1Z" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></>,
  download: <><path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  palette: <><path d="M21 12a9 9 0 1 0-9 9h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h3a2 2 0 0 0 2-2Z" /><circle cx="7" cy="10" r=".8" /><circle cx="10" cy="6" r=".8" /><circle cx="16" cy="7" r=".8" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" /></>,
  moon: <path d="M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z" />,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  plus: <path d="M12 4v16M4 12h16" />,
  minus: <path d="M4 12h16" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>,
  stack: <><path d="m3 7 9-4 9 4-9 4Z M3 12l9 4 9-4M3 17l9 4 9-4" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3m-10 0 1 15h12l1-15M10 10v7m4-7v7" /></>,
  sliders: <><path d="M4 6h8m4 0h4M4 12h2m4 0h10M4 18h10m4 0h2" /><circle cx="14" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>,
};
export function Icon({ name, size = 18, className = '' }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`lb-icon ${className}`}>{paths[name] || paths.image}</svg>;
}

export function ThemeSwatch({ style }) {
  return (
    <svg className={`lb-theme-swatch lb-swatch-${style}`} viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      <rect className="swatch-bg" x="1" y="1" width="118" height="70" rx="11" />
      {style === 'glass' ? <><circle fill="#b3caf8" cx="88" cy="25" r="20" /><circle fill="#f6d9b8" cx="56" cy="52" r="22" /><rect x="15" y="13" width="83" height="45" rx="12" fill="#fff" fillOpacity=".55" stroke="#fff" /><rect x="22" y="20" width="18" height="31" rx="6" fill="#fff" fillOpacity=".7" /><path d="M48 24h37m-37 7h26m-26 8h30" stroke="#7c94ba" strokeWidth="3" strokeLinecap="round" /></> : style === 'memphis' ? <><path d="m89 5 22 27H67Z" fill="#f5cc52" stroke="#2d2b55" strokeWidth="2" /><circle cx="26" cy="23" r="15" fill="#fe93a6" stroke="#2d2b55" strokeWidth="2" /><rect x="31" y="27" width="59" height="34" rx="3" fill="#2d2b55" /><rect x="27" y="23" width="59" height="34" rx="3" fill="#b4daea" stroke="#2d2b55" strokeWidth="2" /><path d="m39 43 7-8 7 8 7-8 7 8m29 15 5-5 5 5 5-5" fill="none" stroke="#2d2b55" strokeWidth="2.5" /></> : <><path d="M9 23 54 9l16 50-45 8Z" fill="#b8c9bb" /><path d="m62 5 44 12-11 47-42-10Z" fill="#d5a496" /><rect x="29" y="18" width="65" height="44" rx="1" fill="#fff8e7" stroke="#947d64" /><path d="M34 23h55v34H34Z" fill="none" stroke="#a38a70" strokeDasharray="3 3" /><path d="m45 12 28 2-1 10-29-2Z" fill="#ddc788" fillOpacity=".8" /><path d="M43 37h36M43 44h25" stroke="#9c8870" strokeWidth="2" /></>}
    </svg>
  );
}

export function StudioIllustration() {
  return (
    <svg className="lb-studio-illustration" viewBox="0 0 320 228" aria-hidden="true" focusable="false">
      <g className="lb-art-decor" fill="none" stroke="var(--lb-accent)" strokeWidth="2">
        <circle cx="264" cy="62" r="22" /><path d="m23 166 8-8 8 8 8-8 8 8m220-15 18 30h-36Z M52 48v14m-7-7h14" />
      </g>
      <g className="lb-art-back"><rect x="76" y="28" width="160" height="170" rx="14" style={{ rx: 'var(--lb-art-radius)' }} fill="var(--lb-secondary)" /></g>
      <g className="lb-art-paper">
        <rect x="60" y="40" width="176" height="165" rx="14" style={{ rx: 'var(--lb-art-radius)' }} fill="var(--lb-solid)" stroke="var(--lb-line)" strokeWidth="var(--lb-line-width)" />
        <path className="lb-art-stitch" d="M68 48h160v149H68Z" fill="none" stroke="var(--lb-muted)" strokeDasharray="4 4" />
        <rect x="72" y="52" width="152" height="110" rx="5" fill="var(--lb-art-sky)" />
        <circle cx="186" cy="80" r="14" fill="var(--lb-art-sun)" />
        <path d="m72 136 43-45 43 38 29-23 37 35v21H72Z" fill="var(--lb-art-mountain)" />
        <path d="m72 148 54-26 47 23 51-20v37H72Z" fill="var(--lb-art-front)" />
        <path d="M77 180h70m-70 9h45" stroke="var(--lb-muted)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="209" cy="183" r="8" fill="none" stroke="var(--lb-accent)" strokeWidth="2" />
      </g>
      <path className="lb-art-tape" d="m122 32 62 5-2 19-62-5Z" fill="var(--lb-tape)" />
    </svg>
  );
}
