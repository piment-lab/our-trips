// こちゃログ（ポイントサイト比較）の公開データから、クレカ・口座案件の最高還元を毎日記録する
const fs = require('fs');
const H = { 'User-Agent': 'Mozilla/5.0 (personal poikatsu tracker; once a day)', 'Accept': 'application/json,text/plain,*/*', 'Referer': 'https://kochalog.com/tools/point-site-hikaku/' };
const get = async (u, txt) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(r.status + ' ' + u); return txt ? r.text() : r.json(); };
(async () => {
  const sum = await get('https://api.kochalog.com/data/compare-summary.json');
  const up = await get('https://api.kochalog.com/data/last-updated.json');
  const dbg = { sumLen: sum.length, sumKeys: Object.keys(sum[0] || {}), titles: sum.map(x => x.slug + ':' + x.title + ':' + x.maxPrice) };
  try { dbg.cmp = (await get('https://kochalog.com/tools/point-site-hikaku/compare/rakuten-card/index.txt?_rsc=1wrzr', 1)).slice(0, 12000); } catch (e) { dbg.cmp = 'ERR ' + e.message; }
  try { const js = await get('https://kochalog.com/tools/point-site-hikaku/_next/static/chunks/app/search/page-8652f879f2f7d49b.js', 1); const i = js.indexOf('history'); dbg.js = js.slice(Math.max(0, i - 1500), i + 800); } catch (e) { dbg.js = 'ERR ' + e.message; }
  try { const js = await get('https://kochalog.com/tools/point-site-hikaku/_next/static/chunks/440-829f20cd7dc55d6d.js', 1); const i = js.indexOf('history'); dbg.js2 = i < 0 ? 'none' : js.slice(Math.max(0, i - 1500), i + 800); } catch (e) { dbg.js2 = 'ERR ' + e.message; }
  fs.writeFileSync('poikatsu/debug.json', JSON.stringify(dbg, null, 1));
  fs.writeFileSync('poikatsu/summary.json', JSON.stringify({ updatedAt: up.updatedAt, items: sum }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
