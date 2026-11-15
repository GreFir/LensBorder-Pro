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
modules = {name: (root / 'src/utils/hdr' / f'{name}.js').read_text() for name in ('jpeg', 'math', 'source', 'canvas')}
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
      return {count,checks,fixtures:{hdr:b64(fixture),sdr:b64(base)}};
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
        page.on('download', downloads.append)
        page.get_by_role('button', name='导出全部照片').click()
        page.wait_for_function("document.querySelector('.lb-export-feedback').textContent.includes('已生成并请求下载 2 / 2')")
        assert len(downloads) == 2
        assert sorted(output_kind(item) for item in downloads) == ['hdr', 'sdr']
        ui_checks.append('real app mixed batch uses each source rather than selected photo')
        result['app_checks'] = ui_checks
    print(json.dumps(result, ensure_ascii=False, indent=2))
    browser.close()
