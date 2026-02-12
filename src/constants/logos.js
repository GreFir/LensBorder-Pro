export const BRAND_LOGOS = {
  apple: { name: 'Apple', type: 'svg', path: "M17.2,11.6c-0.9-0.5-1.5-1.4-1.5-2.5c0-2,1.6-3.6,3.6-3.6c0.1,0,0.3,0,0.4,0c-0.8-1.2-2.1-1.9-3.5-2c-1.5-0.1-2.9,0.9-3.7,0.9c-0.8,0-2-0.8-3.3-0.8c-1.7,0-3.3,1-4.2,2.6c-1.8,3.1-0.5,7.6,1.2,10.1c0.9,1.2,1.9,2.6,3.2,2.5c1.3-0.1,1.8-0.8,3.3-0.8c1.5,0,2,0.8,3.3,0.8c1.4,0,2.3-1.2,3.1-2.4c1-1.4,1.4-2.8,1.4-2.9C20.6,13.4,18.1,12.1,17.2,11.6z M14.3,3.7c0.7-0.9,1.2-2.1,1-3.3c-1.1,0-2.3,0.7-3,1.5c-0.6,0.7-1.2,1.9-1,3.1C12.4,5.2,13.6,4.6,14.3,3.7z" },
  sony: { name: 'Sony', type: 'text', font: 'Times New Roman' },
  canon: { name: 'Canon', type: 'text', font: 'serif' },
  nikon: { name: 'Nikon', type: 'text', font: 'sans-serif-black' }, // Ideally need a heavy font
  fujifilm: { name: 'Fujifilm', type: 'text', font: 'sans-serif' },
  leica: { name: 'Leica', type: 'text', font: 'sans-serif' },
  hasselblad: { name: 'Hasselblad', type: 'text', font: 'serif' },
  none: { name: 'No Logo', type: 'none' }
};

export const LAYOUTS = [
  { id: 'bottom-classic', label: '经典白框' },
  { id: 'cinema', label: '暗色电影' },
  { id: 'polaroid', label: '拍立得' },
  { id: 'simple-frame', label: '极简细框' }
];