// kochalog ポイントサイト比較ツールの通信を調べる（調査用）
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ locale: 'ja-JP' });
  const log = [];
  p.on('response', async r => {
    const u = r.url(), t = r.request().resourceType();
    if (!['xhr', 'fetch', 'script', 'document'].includes(t)) return;
    let body = '';
    try { body = (await r.text()).slice(0, 3000); } catch (e) {}
    log.push({ u, t, s: r.status(), ct: r.headers()['content-type'] || '', body: t === 'script' ? body.slice(0, 300) : body });
  });
  await p.goto('https://kochalog.com/tools/point-site-hikaku/', { waitUntil: 'networkidle', timeout: 60000 });
  const html = await p.content();
  const inputs = await p.$$eval('input', a => a.map(i => ({ type: i.type, id: i.id, name: i.name, ph: i.placeholder, cls: i.className })));
  let after = '';
  try {
    const box = await p.$('input[type=search], input[type=text]');
    if (box) { await box.fill('楽天カード'); await box.press('Enter'); await p.waitForTimeout(6000); after = (await p.innerText('body')).slice(0, 6000); }
  } catch (e) { after = 'ERR ' + e.message; }
  fs.writeFileSync('poikatsu/debug.json', JSON.stringify({ inputs, html: html.slice(0, 20000), after, log }, null, 1));
  await b.close();
})();
