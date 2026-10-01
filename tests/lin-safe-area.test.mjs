import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const [indexHTML, linHTML] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('lin-fengyan/pages.html', root), 'utf8'),
]);

test('Lin Fengyan content uses a scoped 8% by 7% safe area', () => {
  assert.match(indexHTML, /--lin-safe-x:8%;--lin-safe-y:7%/);
  assert.match(
    indexHTML,
    /\.slide\[data-owner="Lin Fengyan"\]:not\(\.title-slide\) \.page\{padding:76px 154px 76px 42px\}/,
  );
});

test('editing guides are optional and never appear in presentation or print', () => {
  assert.match(indexHTML, /id="guides"[^>]*aria-pressed="false"/);
  assert.match(indexHTML, /body\.show-guides \.slide\[data-owner="Lin Fengyan"\]:not\(\.title-slide\):after/);
  assert.match(indexHTML, /body\.presenting \.slide:after\{display:none!important\}/);
  assert.match(indexHTML, /@media print\{[^}]*\.slide:after\{display:none!important\}/s);
});

test('the five crowded slides are reorganized into eight focused slides', () => {
  const templates = [...linHTML.matchAll(/<template\s+data-key="([^"]+)"[^>]*data-owner="Lin Fengyan"/g)];
  assert.deepEqual(
    templates.map(match => match[1]),
    [
      '1a-circuit',
      '1a-packet',
      '1b-model',
      '1b-admission',
      '1b-capacity',
      '1c-model',
      '1c-pipeline',
      '1c-time',
    ],
  );
});

test('every Lin slide keeps its content inside a body-content wrapper', () => {
  const templates = linHTML.match(/<template\b[\s\S]*?<\/template>/g) ?? [];
  assert.equal(templates.length, 8);
  for (const template of templates) {
    assert.match(template, /<div class="body-content">/);
  }
});

test('the dense packet timing table uses fixed readable columns', () => {
  assert.match(
    indexHTML,
    /\.slide\[data-key="1c-time"\] \.timing\{font-size:20px;table-layout:fixed\}/,
  );
  assert.match(
    indexHTML,
    /\.slide\[data-key="1c-time"\] \.timing (?:th|td),\.slide\[data-key="1c-time"\] \.timing (?:td|th)\{white-space:nowrap;padding:10px\}/,
  );
});

test('page 3 uses the requested bufferless-model drawback wording', () => {
  assert.match(
    linHTML,
    /Its drawback is that simultaneous bursts can overload the link and cause packet loss in this bufferless model; unlike circuit switching, per-user bandwidth and service are not guaranteed/,
  );
});

test('page 7 uses the supplied store-and-forward screenshot', () => {
  assert.match(
    linHTML,
    /<img class="store-forward-path" src="asset\/store-and-forward-path\.png" alt="Store-and-forward path from A through R1 and R2 to B">/,
  );
  assert.match(
    indexHTML,
    /\.slide\[data-key="1c-model"\] \.store-forward-path\{width:min\(100%,1260px\);height:auto;object-fit:contain;display:block;margin:0 auto\}/,
  );
});
