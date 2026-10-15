# Live template thumbnails

After importing photos, the template library previews the **currently selected photo** through all 24 real template renderers. Before importing or after clearing photos, the existing SVG schematics remain available. Selecting a different photo in the batch tray updates the library. Borders, palette, metadata, custom text, GPX overlays, stamps and logos use the same configuration as the main preview.

UI themes remain independent from the photo. Portraits and complete borders are contained in fixed-aspect thumbnail boxes, not cropped. Expanded and collapsed sidebars both support live previews.

## Performance and lifecycle

- Canvas backing stores are bounded to a longest edge of 320 pixels. Original image dimensions are still used for layout, so font sizes and padding follow the real renderer. The existing unbounded export path is unchanged.
- In right-side-text templates, the temporary rotated canvas is also bounded for thumbnails; it does not allocate another full-resolution photograph per card.
- A shared queue renders one card per animation frame, and IntersectionObserver delays offscreen work. Browsers without IntersectionObserver use the same queue without lazy loading.
- Photo switches remount the preview, cancel obsolete jobs and discard old canvases. Config changes coalesce pending work. Fonts and asynchronously loaded stickers/logos invalidate visible previews.
- Previews use local canvases, not JPEG/base64 snapshots or object URLs. No extra network upload, image library or runtime dependency is introduced.
- If a template render fails, the card falls back to the original photo with an error label; other cards remain usable.

## Checks

```sh
node --test tests/uiThemes.test.js tests/templatePreview.test.js
npm run build
npm run dev
```

The `Live template preview checks` workflow additionally launches the actual Vite app in Chromium. It imports landscape and portrait PNG fixtures, checks all 24 templates, changes metadata, switches photos rapidly, checks bounded rotation and full-resolution rendering, exercises the three UI themes and collapsed sidebar, exports a JPEG and clears the tray. Screenshots and results are uploaded as `live-template-preview-results`.

These browser checks use generated fixtures and do not certify Tauri/WebView behavior on every OS, real camera RAW/HEIC formats or every user-supplied sticker/font. Release packaging is not triggered until the feature is merged into main. Version metadata is unchanged in this feature branch.
