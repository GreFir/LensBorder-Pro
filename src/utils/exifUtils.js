import ExifReader from 'exifreader';

export const createEmptyMeta = () => ({
  make: '',
  model: '',
  lens: '',
  focalLength: '',
  fNumber: '',
  exposureTime: '',
  iso: '',
  dateTime: '',
  artist: '',
});

const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(' ').trim();
  return String(value).trim();
};

const readTag = (tags, key) => {
  const tag = tags?.[key];
  if (!tag) return '';
  return cleanText(tag.description ?? tag.value);
};

const numberFrom = (value) => {
  const text = cleanText(value);
  if (!text) return '';
  const match = text.match(/[\d.]+/);
  return match ? match[0] : '';
};

const formatDate = (value) => {
  const text = cleanText(value);
  if (!text) return '';
  const parts = text.split(' ');
  const datePart = parts[0].replace(/:/g, '.');
  const timePart = parts[1] ? parts[1].slice(0, 5) : '';
  return timePart ? `${datePart} ${timePart}` : datePart;
};

const formatShutter = (value) => {
  const text = cleanText(value);
  if (!text) return '';
  if (text.includes('/')) return `${text}s`;
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  if (numeric >= 1) return `${numeric}s`;
  const denominator = Math.round(1 / numeric);
  return `1/${denominator}s`;
};

const formatFNumber = (value) => {
  const text = cleanText(value);
  if (!text) return '';
  const cleaned = text.replace(/^f\/?/i, '');
  return `f/${cleaned}`;
};

const formatIso = (value) => {
  const text = cleanText(value);
  if (!text) return '';
  return text.toUpperCase().startsWith('ISO') ? text : `ISO${text}`;
};

const formatFocalLength = (raw, equivalent) => {
  const eqValue = numberFrom(equivalent);
  if (eqValue) return `${eqValue}mm (eq)`;
  const rawValue = numberFrom(raw);
  return rawValue ? `${rawValue}mm` : '';
};

const normalizeMakeModel = (makeRaw, modelRaw) => {
  let make = cleanText(makeRaw);
  let model = cleanText(modelRaw);
  if (make && model && model.toLowerCase().includes(make.toLowerCase())) {
    make = '';
  }
  return { make, model };
};

export const extractExif = async (file) => {
  if (!ExifReader) {
    return createEmptyMeta();
  }

  try {
    const tags = await ExifReader.load(file);
    const makeRaw = readTag(tags, 'Make');
    const modelRaw = readTag(tags, 'Model');
    const { make, model } = normalizeMakeModel(makeRaw, modelRaw);
    const lens =
      readTag(tags, 'LensModel') ||
      readTag(tags, 'Lens') ||
      readTag(tags, 'LensSpecification');

    const focalLength = formatFocalLength(
      readTag(tags, 'FocalLength'),
      readTag(tags, 'FocalLengthIn35mmFilm')
    );

    const fNumber = formatFNumber(readTag(tags, 'FNumber'));
    const exposureTime = formatShutter(readTag(tags, 'ExposureTime'));
    const iso = formatIso(
      readTag(tags, 'ISOSpeedRatings') ||
        readTag(tags, 'PhotographicSensitivity') ||
        readTag(tags, 'ISO')
    );

    const dateTime = formatDate(
      readTag(tags, 'DateTimeOriginal') ||
        readTag(tags, 'CreateDate') ||
        readTag(tags, 'DateTime')
    );

    const artist = readTag(tags, 'Artist') || readTag(tags, 'Copyright');

    return {
      make,
      model,
      lens,
      focalLength,
      fNumber,
      exposureTime,
      iso,
      dateTime,
      artist,
    };
  } catch (error) {
    console.error('EXIF Error:', error);
    return createEmptyMeta();
  }
};
