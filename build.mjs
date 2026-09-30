// 同一个入口负责合并前检查和 PDF 导出；正文仍由四位成员的 HTML 维护。
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
const require=createRequire(import.meta.url);
const root=path.dirname(fileURLToPath(import.meta.url));
const checkOnly=process.argv.includes('--check');
let chromium;
try {({chromium}=require('playwright'));}
catch {console.error('请先运行 npm ci 和 npx playwright install chromium。');process.exit(1);}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
let server;
const expectedQuestions=['1a','1b','1c','2a','2b','2c','3a','3b','3c','3d','3e','4a','4b','4c'];
const assert=(ok,message)=>{if(!ok)throw Error(message);};

// 从子路径提供页面，模拟 GitHub Pages，而不是只测试 localhost 根路径。
async function serve(){
 const types={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.pdf':'application/pdf'};
 server=http.createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),prefix='/comp5621-26-slides/';
   if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
   const file=path.resolve(root,pathname.slice(prefix.length)||'index.html');
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return `http://127.0.0.1:${server.address().port}/comp5621-26-slides/`;
}

async function validate(url,label){
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>errors.push('资源加载失败：'+r.url()));
 page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()}：${r.url()}`);});
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(['http:','https:'].includes(u.protocol)&&u.hostname!=='127.0.0.1'){
   errors.push('页面依赖外部资源：'+u.href);return route.abort();
  }return route.continue();
 });
 try{
  await page.goto(url,{waitUntil:'load',timeout:30000});
  try{await page.waitForFunction(()=>window.deckReady===true,null,{timeout:20000});}
  catch{throw Error('演示页面未能完成加载：'+(errors.join('\n')||'请检查四位成员的 HTML 和底部加载脚本。'));}
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete),null,{timeout:20000});
  const structure=await page.evaluate(()=>{
   const slides=[...document.querySelectorAll('.slide')];
   return {
    keys:slides.map(s=>s.dataset.key),
    questions:slides.slice(1).map(s=>s.querySelector('.original-text')?.dataset.originalQuestion),
    badPages:slides.filter(s=>!s.querySelector('.body-content')?.textContent.trim()||!s.querySelector('footer')||!s.dataset.owner).map(s=>s.dataset.key),
    missingQuestions:slides.slice(1).filter(s=>!s.querySelector('.source-question')?.textContent.trim()||!s.querySelector('.source-major-heading')?.textContent.trim()).map(s=>s.dataset.key),
    brokenImages:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),
    fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),
    paths:[...document.querySelectorAll('[src]')].map(e=>e.getAttribute('src'))
   };
  });
  assert(structure.keys.length>1,'没有可用的演示页面。');
  assert(new Set(structure.keys).size===structure.keys.length,'页面 data-key 重复。');
  assert(!structure.badPages.length,'正文、页脚或主讲人缺失：'+structure.badPages.join(', '));
  assert(!structure.missingQuestions.length,'原题结构缺失：'+structure.missingQuestions.join(', '));
  assert(expectedQuestions.every(q=>structure.questions.includes(q)),'题目覆盖不完整，需保留 14 个小问；不限制拆页数。');
  assert(!structure.brokenImages.length,'图片损坏或不存在：'+structure.brokenImages.join(', '));
  assert(structure.fonts.length>=2&&structure.fonts.every(f=>f.status==='loaded'),'本地字体未能完整加载。');
  assert(structure.paths.every(p=>p&&!/^(?:\/|[a-z]+:)/i.test(p)),'页面资源必须使用相对路径。');
  await page.emulateMedia({media:'print'});
  const bad=await page.evaluate(()=>[...document.querySelectorAll('.slide')].map(s=>{
   const bounds=s.getBoundingClientRect(),footer=s.querySelector('footer').getBoundingClientRect();
   const elements=[...s.querySelectorAll('.body p,.body h2,.body .eq,.body table,.body img,.body math,.body article,.body .object,.body figure,.body .answer-line,.body .evidence-note,.capture-detail,header')].filter(e=>!e.closest('.capture-detail-window'));
   return {key:s.dataset.key,overflow:elements.filter(e=>{
    const r=e.getBoundingClientRect();return r.bottom>footer.top+2||r.right>bounds.right+1||r.left<bounds.left-1;
   }).map(e=>e.textContent.slice(0,60)||e.tagName)};
  }).filter(c=>c.overflow.length));
  assert(!bad.length,'页面内容超出边界：'+JSON.stringify(bad));
  // 编译到内存，检查失败时不覆盖根目录已有 PDF。
  const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
  assert(pdf.subarray(0,5).toString()==='%PDF-','PDF 编译失败。');
  const pdfPages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
  assert(pdfPages===structure.keys.length,`PDF 页数 ${pdfPages} 与 HTML 页数 ${structure.keys.length} 不一致。`);
  await page.emulateMedia({media:'screen'});await page.click('#presentation');
  const navigate=async(n)=>{
   await page.evaluate(n=>{location.hash=`slide-${n}`;},n);
   await page.waitForFunction(n=>document.querySelector('.current-slide')?.id===`slide-${n}`,n);
  };
  for(let i=1;i<=structure.keys.length;i++){
   await navigate(i);
   assert(await page.locator('#position').innerText()===`${i} / ${structure.keys.length}`,'页码或跳转异常。');
   assert(await page.locator('.current-slide').isVisible(),'当前页不可见。');
   if(i<structure.keys.length){
    await page.keyboard.press('ArrowRight');assert(await page.locator('.current-slide').getAttribute('id')===`slide-${i+1}`,'方向键翻页异常。');
    await page.keyboard.press('ArrowLeft');assert(await page.locator('.current-slide').getAttribute('id')===`slide-${i}`,'方向键返回异常。');
   }
  }
  await navigate(1);
  for(const q of expectedQuestions){
   await page.locator('.current-slide .major-tick').filter({hasText:q[0]}).click();
   await page.locator('.current-slide .minor-tick').filter({hasText:`(${q[1]})`}).click();
   assert(await page.locator('.current-slide .original-text').getAttribute('data-original-question')===q,'侧栏跳转到错误的小问：'+q);
   assert(await page.locator('.current-slide .timeline-group.current').count()===1,'侧栏当前大题异常。');
  }
  assert(!errors.length,'浏览器或资源错误：'+errors.join('\n'));
  console.log(`${label}：${structure.keys.length} 页，结构、资源、字体、边界、PDF、翻页与侧栏通过。`);
  return pdf;
 }finally{await page.close();}
}
try{
 const pdf=await validate(pathToFileURL(path.join(root,'index.html')).href,'离线浏览');
 await validate(await serve(),'网页子路径');
 if(!checkOnly){await fs.writeFile(path.join(root,'COMP5621_HW1_Group_Presentation.pdf'),pdf);console.log('已导出：COMP5621_HW1_Group_Presentation.pdf');}
}finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 await browser.close();
}
