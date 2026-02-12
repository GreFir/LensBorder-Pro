export const DEFAULT_META = {
  make: '',
  model: '',
  lens: '',
  focalLength: '',
  fNumber: '',
  exposureTime: '',
  iso: '',
  dateTime: '',
  artist: '',
};

export const DEFAULT_VISIBILITY = {
  make: true,
  model: true,
  lens: true,
  focalLength: true,
  fNumber: true,
  exposureTime: true,
  iso: true,
  dateTime: true,
  artist: false,
};

export const METADATA_FIELDS = [
  { key: 'make', label: '品牌', placeholder: 'Canon' },
  { key: 'model', label: '机型', placeholder: 'EOS R5' },
  { key: 'lens', label: '镜头', placeholder: 'RF 24-70mm f/2.8' },
  { key: 'focalLength', label: '等效焦距', placeholder: '35mm' },
  { key: 'fNumber', label: '光圈', placeholder: 'f/1.8' },
  { key: 'exposureTime', label: '快门', placeholder: '1/125s' },
  { key: 'iso', label: 'ISO', placeholder: 'ISO200' },
  { key: 'dateTime', label: '时间', placeholder: '2025.08.21 17:30' },
  { key: 'artist', label: '作者', placeholder: 'Your Name' },
];

export const METADATA_GROUPS = [
  { id: 'camera', label: '相机信息', keys: ['make', 'model', 'lens'] },
  { id: 'capture', label: '曝光参数', keys: ['focalLength', 'fNumber', 'exposureTime', 'iso'] },
  { id: 'extra', label: '附加信息', keys: ['dateTime', 'artist'] },
];
