# Editor appearance themes

The editor has three UI materials: **液态玻璃** (`glass`, the default), **孟菲斯**
(`memphis`) and **纸艺拼接** (`collage`). Open **界面外观** in the bottom of the
left sidebar to select a material. Light / dark / system remain independent.
When the sidebar is collapsed, the palette button expands it again.

These are **editor skins**, not additional photograph/watermark templates.
They do not modify `config.colors`, template selection, EXIF, GPX matching,
or the export renderer. Theme preferences do not travel with “同步样式”.
The loaded photograph sits on the same neutral stage in each material.

## What changes

- Glass: translucent panels, specular edges, soft outer and inset shadows.
- Memphis: geometric SVG patterns, bolder edges, solid offset shadows,
  asymmetric cards, squared range handles and pressed-button offsets.
- Collage: paper texture, stitched outlines, tape motifs, layered paper,
  serif headings and photo-strip paper mounts.
- Shared coverage: sidebar, upload area, template cards, appearance swatches,
  input fields, sliders, switches, optional GPX section, empty-state illustration,
  batch toolbar, thumbnails and keyboard-focus indicators.

Original SVGs live in `src/themes/Icons.jsx` and `src/themes/assets/`.
This theme layer introduces no network resources, remote fonts or additional
npm dependencies; pre-existing photograph fonts in index.css are unchanged.
CSS is scoped to `.lb-interface`; photo template SVGs and the canvas are not
recolored. Existing SettingsPanel controls are skinned through its
`aside[aria-expanded]` markup and direct section containers.

## State and accessibility

`lensborder-ui-style` stores material separately from the existing
`lensborder-theme-mode` key. Invalid/missing values fall back to `glass`.
Blocked/full storage is non-fatal; style updates synchronize between tabs.
The application still owns light/dark/system mode. Native radio groups support
keyboard navigation and the appearance disclosure starts closed. Reduced
motion, reduced transparency, opaque WebView fallbacks and focus-visible
outlines are included. Decorative SVGs are hidden from screen readers.

Preview resize observation now starts when the image viewport mounts, which
also allows fitting to react to sidebar/settings-panel size changes. Batch
thumbnail selection and removal use sibling buttons, rather than nested buttons.

## Validation

```sh
node --test tests/uiThemes.test.js
node --test tests/gpxUtils.test.js
npm run build
npm run dev
```

Manual acceptance: select each material in light and dark mode, reload, use
keyboard Tab/arrow keys, open and close the appearance panel, collapse the
sidebar and tray, open the optional GPX section, import two photographs,
change photo template and colors, adjust zoom, select/remove thumbnails,
synchronize photo styles and compare exported images across UI materials.
Test native Tauri separately; browser-only checks are not a desktop-build test.
