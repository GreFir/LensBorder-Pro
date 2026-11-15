"""Real Chromium Canvas regression checks; no HDR monitor is required for pixel tests.
Run: python -m pip install playwright && python -m playwright install chromium
     python tests/browser-hdr.py
Set CHROMIUM_PATH to use a system Chromium. No external page/image requests are made.
"""
import json
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
modules = {name: (root / 'src/utils/hdr' / f'{name}.js').read_text(encoding='utf-8') for name in ('jpeg', 'math', 'source', 'canvas')}
with sync_playwright() as p:
    launch = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        launch['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = p.chromium.launch(**launch)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    result = page.evaluate('''async (sources) => {
      const urls = {};
      for (const name of ['jpeg','math','source','canvas']) {
        let code = sources[name];
        for (const [key,url] of Object.entries(urls)) code = code.replaceAll(`'./${key}.js'`, JSON.stringify(url));
        urls[name] = URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
      }
      const j=await import(urls.jpeg), m=await import(urls.math), s=await import(urls.source), c=await import(urls.canvas);
      let count=0;const checks=[];
      function check(test, name) {if(!test) throw new Error(name);count++;checks.push(name);}
      const jpeg = async (color, space='srgb', width=32,height=24) => {
        const cv=c.makeCanvas(width,height,space);const ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,width,height);
        const b=await c.jpegBlob(cv,1);c.releaseCanvas(cv);return new Uint8Array(await b.arrayBuffer());
      };
      const sourceFor = async (bytes) => s.preparePhotoSource(new File([bytes],'photo.jpg',{type:'image/jpeg'}));
      const base=await jpeg('white'), gain=await jpeg('white');
      check(j.jpegColorSpace(base)==='srgb','sRGB ICC recognized');
      const p3=await jpeg('white','display-p3');
      check(j.jpegColorSpace(p3)==='display-p3','Display P3 ICC recognized');
      const fixture=j.packGainMap(base,gain,{min:0,max:2,capacity:2});
      const info=j.inspectJpeg(fixture);
      check(info.status==='hdr' && info.gainMap.end===fixture.length,'MPF/XMP round trip');
      const hdr=await sourceFor(fixture), plain=await sourceFor(base);
      check(hdr.status==='hdr' && plain.status==='sdr','auto distinguishes HDR and SDR');
      check(m.resolveExportMode('auto',hdr)==='hdr' && m.resolveExportMode('auto',plain)==='sdr','mixed-batch per-source selection');
      check(j.inspectJpeg(new Uint8Array(await hdr.previewBlob.arrayBuffer())).status==='sdr','preview contains only SDR base');
      const decoded=await c.reconstructSource(hdr);
      const getLinear=(cv,x,y)=>m.srgbToLinear(cv.getContext('2d').getImageData(x,y,1,1,{pixelFormat:'rgba-float16',colorSpace:'srgb'}).data[0]);
      check(Math.abs(getLinear(decoded,16,12)-4.046875)<.03,'original HDR recovered above SDR white');
      const image=await c.loadBitmap(hdr.previewBlob);
      const renderer=(ctx,img,config)=>{
        ctx.canvas.width=img.width+32;ctx.canvas.height=img.height+32;
        ctx.fillStyle='white';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
        ctx.drawImage(img,16,16);
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(16,16,4,4);
        if(config.textPosition==='bottom'){ctx.fillStyle='black';ctx.fillRect(2,2,2,2);}
      };
      const frame=await c.encodeHdrJpeg(renderer,image,{template:'classic',textPosition:'bottom'}, {},hdr,.95);
      const exported=await s.preparePhotoSource(new File([frame],'result.jpg',{type:'image/jpeg'}));
      check(exported.status==='hdr','export is recognized as a gain-map JPEG');
      const finished=await c.reconstructSource(exported);
      check(Math.abs(getLinear(finished,32,28)-4.046875)<.08,'HDR survives final JPEG round trip');
      check(Math.abs(getLinear(finished,5,5)-1)<.03,'white border remains SDR white');
      check(getLinear(finished,17,17)<getLinear(finished,32,28),'translucent overlay attenuates HDR');
      check(finished.width===64 && finished.height===56,'framed base and gain dimensions agree');
      const right=c.renderPhotoFrame(renderer,decoded,{template:'classic',textPosition:'right'}, {},'srgb',true);
      check(right.width===56 && right.height===64,'right-text rotation preserves dimensions');
      check(getLinear(right,28,32)>4,'right-text rotation preserves >1 float data');
      const p3Source=await sourceFor(j.packGainMap(p3,gain,{min:0,max:2,capacity:2}));
      check(p3Source.status==='hdr' && p3Source.colorSpace==='display-p3','P3 HDR source classified');
      const p3Image=await c.loadBitmap(p3Source.previewBlob);
      const p3Frame=await c.encodeHdrJpeg(renderer,p3Image,{template:'classic'}, {},p3Source,.95);
      const p3Result=await s.preparePhotoSource(new File([p3Frame],'p3.jpg',{type:'image/jpeg'}));
      check(p3Result.status==='hdr' && p3Result.colorSpace==='display-p3','P3 ICC survives HDR export');
      const p3Finished=await c.reconstructSource(p3Result);
      check(Math.abs(getLinear(p3Finished,32,28)-4.046875)<.08,'P3 highlights survive actual float-canvas compositing, not only ICC metadata');
      check(Math.abs(getLinear(p3Finished,5,5)-1)<.03,'P3 white border remains SDR white');
      const p3RightBlob=await c.encodeHdrJpeg(renderer,p3Image,{template:'classic',textPosition:'right'}, {},p3Source,.95);
      const p3Right=await c.reconstructSource(await s.preparePhotoSource(new File([p3RightBlob],'p3-right.jpg',{type:'image/jpeg'})));
      check(getLinear(p3Right,28,32)>4,'P3 right-text rotation preserves highlight detail');
      const adapted=await sourceFor(j.packGainMap(base,gain,{min:0,max:2,capacityMin:1,capacity:3}));
      const adaptedFrame=await c.encodeHdrJpeg(renderer,image,{template:'classic'}, {},adapted,.95);
      const adaptedResult=await s.preparePhotoSource(new File([adaptedFrame],'adapted.jpg',{type:'image/jpeg'}));
      check(adaptedResult.metadata.capacityMin===1 && adaptedResult.metadata.capacityMax===3,'export retains both display headroom thresholds');
      c.releaseCanvas(p3Finished);c.releaseCanvas(p3Right);
      const redP3=await sourceFor(j.packGainMap(await jpeg('color(display-p3 0.8 0.04 0.04)','display-p3'),gain,{min:0,max:2,capacity:2}));
      const redImage=await c.loadBitmap(redP3.previewBlob);
      const redOriginal=await c.reconstructSource(redP3);
      const redOutput=await c.reconstructSource(await sourceFor(new Uint8Array(await (await c.encodeHdrJpeg(renderer,redImage,{template:'classic'},{},redP3,1)).arrayBuffer())));
      const linearRgb=(cv,x,y)=>Array.from(cv.getContext('2d').getImageData(x,y,1,1,{pixelFormat:'rgba-float16',colorSpace:'srgb'}).data).slice(0,3).map(m.srgbToLinear);
      const before=linearRgb(redOriginal,16,12), after=linearRgb(redOutput,32,28);
      check(before[1]<0 && after[1]<0 && after.every((v,i)=>Math.abs(v-before[i])<.06),'saturated P3 HDR keeps color outside the sRGB gamut');
      c.releaseCanvas(redOriginal);c.releaseCanvas(redOutput);
      const meta=m.parseGainMapXmp(info.xml.replace('hdrgm:','other:').replaceAll('hdrgm:','other:').replace('xmlns:hdrgm','xmlns:other'));
      check(meta.max[0]===2,'XMP namespace prefixes are not hard-coded');
      let failed=false;try{m.parseGainMapXmp(info.xml.replace('hdrgm:Gamma="1"','hdrgm:Gamma="0"'));}catch{failed=true;}
      check(failed,'invalid gamma rejected');
      failed=false;try{m.resolveExportMode('hdr',plain);}catch{failed=true;}
      check(failed,'SDR cannot be relabeled HDR');
      const unknown={status:'unknown',reason:'unsupported'};
      failed=false;try{m.resolveExportMode('auto',unknown);}catch{failed=true;}
      check(failed && m.resolveExportMode('sdr',unknown)==='sdr','unknown source requires explicit SDR consent');
      const invalid=fixture.slice(0,fixture.length-3);
      check((await sourceFor(invalid)).status==='unknown','truncated HDR is not silently exported as SDR');
      const orientationValues={1:[1,2,3,4,5,6],2:[2,1,4,3,6,5],3:[6,5,4,3,2,1],4:[5,6,3,4,1,2],5:[1,3,5,2,4,6],6:[5,3,1,6,4,2],7:[6,4,2,5,3,1],8:[2,4,6,1,3,5]};
      for(let orientation=1;orientation<=8;orientation++) {
        const cv=c.makeCanvas(2,3,'srgb',true);const pixels=new Float16Array(24);
        for(let i=0;i<6;i++){pixels[i*4]=i+1;pixels[i*4+3]=1;}
        cv.getContext('2d').putImageData(new ImageData(pixels,2,3,{pixelFormat:'rgba-float16'}),0,0);
        const oriented=c.orientCanvas(cv,orientation,'srgb');
        const values=Array.from(oriented.getContext('2d').getImageData(0,0,oriented.width,oriented.height,{pixelFormat:'rgba-float16'}).data).filter((_,i)=>i%4===0);
        check(JSON.stringify(values)===JSON.stringify(orientationValues[orientation]),`EXIF orientation ${orientation} preserves HDR pixel positions`);c.releaseCanvas(oriented);
      }
      const colorBase=await jpeg('rgb(128,128,128)');const colorGain=await jpeg('rgb(255,128,0)');
      const colorSource=await sourceFor(j.packGainMap(colorBase,colorGain,{min:0,max:2,capacity:2}));
      const colorImage=await c.reconstructSource(colorSource);
      const colors=colorImage.getContext('2d').getImageData(16,12,1,1,{pixelFormat:'rgba-float16'}).data;
      check(colors[0]>colors[1] && colors[1]>colors[2],'RGB gain map keeps independent channel gains');c.releaseCanvas(colorImage);
      const float16=globalThis.Float16Array;globalThis.Float16Array=undefined;
      failed=false;try{c.makeCanvas(1,1,'srgb',true);}catch{failed=true;}finally{globalThis.Float16Array=float16;}
      check(failed,'unsupported float runtime fails explicitly');
      for(const cv of [decoded,finished,right])c.releaseCanvas(cv);
      const b64=(bytes)=>btoa(String.fromCharCode(...bytes));
      const largeFixture=j.packGainMap(await jpeg('white','display-p3',1600,900),gain,{min:0,max:2,capacity:2});
      return {count,checks,fixtures:{hdr:b64(fixture),largeHdr:b64(largeFixture),sdr:b64(base)}};
    }''', modules)
    fixtures = result.pop('fixtures')
    if os.environ.get('HDR_APP_URL'):
        page.add_init_script("window.showSaveFilePicker = undefined; window.showDirectoryPicker = undefined;")
        page.goto(os.environ['HDR_APP_URL'])
        page.locator('input[aria-label="导入照片"]').set_input_files([
            {'name': 'hdr-photo.jpg', 'mimeType': 'image/jpeg', 'buffer': base64.b64decode(fixtures['hdr'])},
            {'name': 'sdr-photo.jpg', 'mimeType': 'image/jpeg', 'buffer': base64.b64decode(fixtures['sdr'])},
        ])
        page.locator('.lb-film-frame').nth(1).wait_for()
        page.locator('.lb-export-options summary').click()
        control = page.locator('#lb-export-range')
        assert control.input_value() == 'auto'
        assert control.locator('option').count() == 3
        assert '原图：HDR' in page.locator('#lb-hdr-help').inner_text()
        ui_checks = ['UI defaults to per-photo auto with exactly three output modes']
        def output_kind(download):
            data = list(Path(download.path()).read_bytes())
            return page.evaluate("""async ({source,data}) => {
                const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
                try {return (await import(url)).inspectJpeg(new Uint8Array(data)).status;}
                finally {URL.revokeObjectURL(url);}
            }""", {'source': modules['jpeg'], 'data': data})
        with page.expect_download() as item:
            page.locator('button.lb-export').click()
        assert output_kind(item.value) == 'hdr'
        ui_checks.append('real app single auto export produces gain-map JPEG')
        control.select_option('sdr')
        with page.expect_download() as item:
            page.locator('button.lb-export').click()
        assert output_kind(item.value) == 'sdr'
        ui_checks.append('real app explicit SDR export removes the gain map')
        page.locator('.lb-film-select').nth(1).click()
        control.select_option('auto')
        with page.expect_download() as item:
            page.locator('button.lb-export').click()
        assert output_kind(item.value) == 'sdr'
        ui_checks.append('switching to SDR photo updates auto export')
        control.select_option('hdr')
        page.locator('button.lb-export').click()
        page.wait_for_function("document.querySelector('.lb-export-feedback').textContent.includes('导出失败')")
        assert '原图没有' in page.locator('.lb-export-feedback').inner_text()
        ui_checks.append('real app rejects fabricated HDR for SDR photo')
        control.select_option('auto')
        downloads = []
        page.on('download', lambda download: downloads.append(download))
        page.get_by_role('button', name='导出全部照片').click()
        page.wait_for_function("document.querySelector('.lb-export-feedback').textContent.includes('已生成并请求下载 2 / 2')")
        assert len(downloads) == 2
        assert sorted(output_kind(item) for item in downloads) == ['hdr', 'sdr']
        ui_checks.append('real app mixed batch uses each source rather than selected photo')
        result['app_checks'] = ui_checks
        # Exercise the HDR display branch without claiming a headless browser is an HDR monitor.
        page.add_init_script('''(() => {
          const original=window.matchMedia.bind(window);
          const query=new EventTarget();query.matches=true;query.media='(dynamic-range: high)';
          query.addListener=listener=>query.addEventListener('change',listener);
          query.removeListener=listener=>query.removeEventListener('change',listener);
          window.matchMedia=value=>value===query.media?query:original(value);
          window.__hdrDisplay=query;
        })();''')
        page.reload()
        page.locator('input[aria-label="导入照片"]').set_input_files([
            {'name': 'hdr-photo.jpg', 'mimeType': 'image/jpeg', 'buffer': base64.b64decode(fixtures['largeHdr'])},
            {'name': 'sdr-photo.jpg', 'mimeType': 'image/jpeg', 'buffer': base64.b64decode(fixtures['sdr'])},
        ])
        page.locator('.lb-hdr-photo-preview').wait_for()
        preview = page.locator('.lb-hdr-photo-preview')
        preview_kind = page.evaluate('''async source => {
          const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
          const bytes=await (await fetch(document.querySelector('.lb-hdr-photo-preview').src)).arrayBuffer();
          try{return (await import(url)).inspectJpeg(new Uint8Array(bytes)).status;}
          finally{URL.revokeObjectURL(url);}
        }''', modules['jpeg'])
        assert preview_kind == 'hdr'
        assert preview.evaluate('(image)=>image.complete && Math.max(image.naturalWidth,image.naturalHeight)===1400')
        ui_checks.append('HDR-capable display path uses a decoded native gain-map JPEG preview bounded to 1400px')
        page.locator('.lb-export-options summary').click()
        control.select_option('sdr')
        assert preview.count() == 0
        assert 'SDR 预览' in page.locator('.lb-workspace-heading').inner_text()
        control.select_option('auto')
        preview.wait_for()
        ui_checks.append('explicit SDR output switches the preview to SDR')
        page.locator('.lb-film-select').nth(1).click()
        assert preview.count() == 0
        page.locator('.lb-film-select').nth(0).click()
        preview.wait_for()
        page.evaluate("window.__hdrDisplay.matches=false;window.__hdrDisplay.dispatchEvent(new Event('change'))")
        page.wait_for_function("!document.querySelector('.lb-hdr-photo-preview')")
        assert '未启用 HDR' in page.locator('.lb-workspace-heading').inner_text()
        ui_checks.append('photo and display switching removes stale HDR previews and labels SDR fallback')
        page.add_init_script('window.Float16Array=undefined;')
        page.reload()
        page.locator('input[aria-label="导入照片"]').set_input_files(
            {'name': 'hdr-photo.jpg', 'mimeType': 'image/jpeg', 'buffer': base64.b64decode(fixtures['hdr'])})
        page.wait_for_function("document.querySelector('.lb-workspace-heading').textContent.includes('HDR 预览不可用')")
        assert preview.count() == 0
        assert page.locator('.lb-photo-canvas').evaluate('(canvas)=>getComputedStyle(canvas).opacity') == '1'
        ui_checks.append('unsupported float runtime keeps a visible SDR fallback and explains preview failure')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    browser.close()
