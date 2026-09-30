// 将根目录首页编译为 PDF；不依赖本机用户名、工作目录或绝对素材路径。
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try { ({chromium} = require('playwright')); }
catch { console.error('缺少导出依赖。请先运行 npm install，然后运行 npx playwright install chromium。'); process.exit(1); }
const browser = await chromium.launch({headless:true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // 正文和素材都应离线可用；禁止导出时悄悄加载网络资源。
  await page.route(/^https?:/, r => r.abort());
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  await page.waitForFunction(() => window.deckReady === true, {timeout:30000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every(i=>i.complete && i.naturalWidth>0), {timeout:30000});
  await page.emulateMedia({media:'print'});
  const checks = await page.evaluate(() => [...document.querySelectorAll('.slide')].map(s => {
    const bounds=s.getBoundingClientRect(), footer=s.querySelector('footer').getBoundingClientRect();
    const elements=[...s.querySelectorAll('.body p,.body .eq,.body table,.body img,.body math,.body article,.body .object,.body figure,.body .answer-line,.body .evidence-note,.capture-detail,header')].filter(e=>!e.closest('.capture-detail-window'));
    return {key:s.dataset.key, overflow:elements.filter(e=>{
      const r=e.getBoundingClientRect();
      return r.bottom>footer.top+2 || r.right>bounds.right+1 || r.left<bounds.left-1;
    }).map(e=>e.textContent.slice(0,60))};
  }));
  const bad = checks.filter(c=>c.overflow.length);
  if (errors.length || bad.length) throw Error('页面检查未通过：'+JSON.stringify({errors,bad}));
  const output = path.join(root,'COMP5621_HW1_Group_Presentation.pdf');
  await page.pdf({path:output,preferCSSPageSize:true,printBackground:true});
  console.log(`已导出 ${checks.length} 页：${path.basename(output)}`);
} finally { await browser.close(); }
