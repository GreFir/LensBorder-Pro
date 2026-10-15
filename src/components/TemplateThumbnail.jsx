import LiveTemplateThumbnail from './LiveTemplateThumbnail';

// Keep the neutral schematic only until a photo has been imported.
export default function TemplateThumbnail({ id, image, config, meta }) {
  if (image && config) {
    return <LiveTemplateThumbnail key={image.src} id={id} image={image} config={config} meta={meta} />;
  }
  const dark = ['minimal', 'cinema', 'noir', 'monolith'].includes(id);
  const glass = ['glassframe', 'glass-brand'].includes(id);
  const postcard = ['postcard', 'postcard-note'].includes(id);
  const palette = ['palette-card', 'palette-poem'].includes(id);
  const thick = ['gallery', 'museum'].includes(id);
  const inset = thick ? 13 : 8;
  const top = id === 'palette-poem' ? 13 : 7;
  return (
    <svg className="lb-template-thumbnail" viewBox="0 0 128 84" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="126" height="82" rx="5" fill={dark ? '#20242b' : postcard ? '#fbf4e7' : '#fff'} stroke={thick ? '#bfb9ad' : '#d2d5da'} strokeWidth={thick ? 5 : 1} />
      <rect x={inset} y={top} width={128 - 2 * inset} height={55 - top} rx="2" fill={glass ? '#cedae1' : '#b7cacc'} />
      <path d={`M${inset} 47 41 23 68 45 89 32 ${128 - inset} 48v7H${inset}Z`} fill="#718c90" />
      <circle cx="99" cy="22" r="6" fill="#eee6ce" />
      {id === 'borderline' && <rect x="4" y="4" width="120" height="76" rx="1" fill="none" stroke="#7e858a" />}
      {glass && <rect x="4" y="4" width="120" height="76" rx="4" fill="#fff" fillOpacity=".17" stroke="#fff" />}
      {id === 'creator-signature' ? <><circle cx="18" cy="17" r="6" fill="#fff" /><path d="M30 16h40" stroke="#fff" strokeWidth="3" /></> : null}
      <path d="M12 65h40m-40 7h26" stroke={dark ? '#dee2e7' : '#747d85'} strokeWidth="2.5" strokeLinecap="round" />
      {postcard ? <circle cx="105" cy="68" r="8" fill="none" stroke="#918675" strokeDasharray="2 2" /> : palette ? <g>{['#95aeab','#5e7a86','#e2cfab','#a98965'].map((color, i) => <rect key={color} x={72+i*10} y="64" width="8" height="8" rx="2" fill={color} />)}</g> : <path d="M78 65h37m-24 7h24" stroke={dark ? '#aaa' : '#b1b7bc'} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}
