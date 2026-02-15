import sonyLogo from '../assets/camera_logos/SONY.svg';
import sigmaLogo from '../assets/camera_logos/Sigma.svg';
import pentaxLogo from '../assets/camera_logos/pentax.svg';
import panasonicLogo from '../assets/camera_logos/Panasonic.svg';
import olympusLogo from '../assets/camera_logos/olympus.svg';
import nikonLogo from '../assets/camera_logos/Nikon.svg';
import leicaLogo from '../assets/camera_logos/Leica.svg';
import hasselbladLogo from '../assets/camera_logos/Hasselblad.svg';
import fujifilmLogo from '../assets/camera_logos/fujifilm.svg';
import djiLogo from '../assets/camera_logos/Dji.svg';
import canonLogo from '../assets/camera_logos/Canon-black.svg';

const CAMERA_BRAND_RULES = [
  {
    key: 'sony',
    logoSrc: sonyLogo,
    aliases: ['sony'],
    patterns: [/\bsony\b/i, /\bzv[-\s]?[a-z0-9]+\b/i, /\bilce[-\s]?[a-z0-9]+\b/i, /\b(a|fx|rx)\d[a-z0-9-]*\b/i],
  },
  {
    key: 'canon',
    logoSrc: canonLogo,
    aliases: ['canon'],
    patterns: [/\bcanon\b/i, /\beos\b/i, /\bpowershot\b/i],
  },
  {
    key: 'nikon',
    logoSrc: nikonLogo,
    aliases: ['nikon', 'nikon corporation'],
    patterns: [/\bnikon(?:\s+corporation)?\b/i, /\bcoolpix\b/i, /\bz\s?\d{1,2}\b/i, /\bd\d{2,4}\b/i, /\bnikkor\b/i],
  },
  {
    key: 'fujifilm',
    logoSrc: fujifilmLogo,
    aliases: ['fujifilm', 'fuji'],
    patterns: [/\bfujifilm\b/i, /\bfuji\b/i, /\bgfx\b/i, /\bx[-\s]?[a-z0-9]+\b/i],
  },
  {
    key: 'leica',
    logoSrc: leicaLogo,
    aliases: ['leica'],
    patterns: [/\bleica\b/i, /\bd[-\s]?lux\b/i, /\bv[-\s]?lux\b/i, /\bsl\d\b/i, /\bq\d\b/i],
  },
  {
    key: 'hasselblad',
    logoSrc: hasselbladLogo,
    aliases: ['hasselblad'],
    patterns: [/\bhasselblad\b/i, /\bx[12]d\b/i, /\b907x\b/i],
  },
  {
    key: 'panasonic',
    logoSrc: panasonicLogo,
    aliases: ['panasonic', 'lumix'],
    patterns: [/\bpanasonic\b/i, /\blumix\b/i, /\bdc-[a-z0-9]+\b/i],
  },
  {
    key: 'olympus',
    logoSrc: olympusLogo,
    aliases: ['olympus', 'om system', 'om-system'],
    patterns: [/\bolympus\b/i, /\bom[-\s]?system\b/i, /\be-m\d+\b/i, /\btg-\d+\b/i],
  },
  {
    key: 'dji',
    logoSrc: djiLogo,
    aliases: ['dji'],
    patterns: [/\bdji\b/i, /\bdji[-\s]?(camera|drone)?\b/i, /\bmavic\b/i, /\bosmo\b/i, /\bphantom\b/i, /\bmini\s?\d\b/i],
  },
  {
    key: 'sigma',
    logoSrc: sigmaLogo,
    aliases: ['sigma'],
    patterns: [/\bsigma\b/i, /\bfp\b/i, /\bfp\s?l\b/i, /\bsd\s?quattro\b/i],
  },
  {
    key: 'pentax',
    logoSrc: pentaxLogo,
    aliases: ['pentax', 'ricoh imaging'],
    patterns: [/\bpentax\b/i, /\bricoh imaging\b/i, /\bk-\d+\b/i, /\b645z\b/i],
  },
];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildCandidates = (meta = {}) => {
  const model = normalizeText(meta.model);
  const make = normalizeText(meta.make);
  const lens = normalizeText(meta.lens);
  const combined = [model, make, lens].filter(Boolean).join(' ');
  return [
    { field: 'model', text: model, baseScore: 30 },
    { field: 'make', text: make, baseScore: 24 },
    { field: 'lens', text: lens, baseScore: 18 },
    { field: 'combined', text: combined, baseScore: 10 },
  ].filter((item) => item.text);
};

const hasAliasMatch = (rule, text) =>
  (rule.aliases || []).some((alias) => text.includes(alias));

export const matchCameraBrand = (meta = {}) => {
  const candidates = buildCandidates(meta);
  if (!candidates.length) return null;

  let best = null;
  for (const candidate of candidates) {
    for (const rule of CAMERA_BRAND_RULES) {
      for (const pattern of rule.patterns) {
        if (!pattern.test(candidate.text)) continue;
        let score = candidate.baseScore + 1;
        if (hasAliasMatch(rule, candidate.text)) score += 20;
        if (score > (best?.score ?? -1)) {
          best = { rule, score };
        }
      }
    }
  }
  return best?.rule || null;
};

export const getCameraBrandLogoSrc = (meta = {}) => matchCameraBrand(meta)?.logoSrc || '';
