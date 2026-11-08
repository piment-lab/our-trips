// こちゃログ（ポイントサイト比較）の公開データから、クレカ・口座案件の還元額を毎日記録する
// 1日1回・約30件だけ取得（相手サイトに負担をかけないよう間隔をあける）
const fs = require('fs');
const BASE = 'https://kochalog.com/tools/point-site-hikaku';
const H = { 'User-Agent': 'Mozilla/5.0 (personal poikatsu tracker; once a day)', 'Accept': 'application/json,text/plain,*/*', 'Referer': BASE + '/' };
const get = async (u, txt) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(r.status + ' ' + u); return txt ? r.text() : r.json(); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const CAT = {
  card: ['rakuten-card','epos-card','smbc-card-nl','smbc-gold-nl','mufj-card','jcb-card-w','jcb-card-s','recruit-card','paypay-card','aeon-card','tokyu-card','p-one-card','au-pay-card','mercard','famima-card','dcard','dcard-gold','smbc-biz-owners'],
  bank: ['smbc-olive','mizuho-bank','mufj-bank','rakuten-bank','sbi-shinsei-bank','risona-bank'],
  invest: ['sbi-sec','rakuten-sec','monex-sec','mufj-esmart-sec','coincheck','bitflyer','binance-japan','light-fx','minna-no-fx','dmm-fx','mattoco-plus','ag-crowdfunding']
};
// RSCテキストから "key": に続く JSON を取り出す
function pick(t, key) {
  const i = t.indexOf('"' + key + '":'); if (i < 0) return null;
  let j = t.indexOf('{', i), d = 0, s = false, e = false;
  for (let k = j; k < t.length; k++) {
    const c = t[k];
    if (s) { if (e) e = false; else if (c === '\\') e = true; else if (c === '"') s = false; continue; }
    if (c === '"') s = true; else if (c === '{') d++; else if (c === '}') { d--; if (!d) { try { return JSON.parse(t.slice(j, k + 1)); } catch (x) { return null; } } }
  }
  return null;
}
(async () => {
  const sum = await get('https://api.kochalog.com/data/compare-summary.json');
  const up = await get('https://api.kochalog.com/data/last-updated.json');
  const bySlug = {}; sum.forEach(x => bySlug[x.slug] = x);
  const items = [];
  for (const cat of Object.keys(CAT)) for (const slug of CAT[cat]) {
    const s = bySlug[slug]; if (!s) continue;
    const it = { slug, cat, title: s.title, now: s.maxPrice || 0, site: s.maxSite || '', change: s.change || 'same', unit: s.unitType, url: '', page: BASE + '/compare/' + slug + '/', hist: [] };
    try {
      const t = await get(BASE + '/compare/' + slug + '/index.txt?_rsc=1wrzr', 1);
      const tg = pick(t, 'target'), snap = pick(t, 'initialSnapshot');
      const urls = (tg && tg.sites) || {}, best = {};
      ((snap && snap.series) || []).forEach(se => {
        if (se.label === s.maxSite && urls[se.siteId]) it.url = urls[se.siteId];
        (se.data || []).forEach(p => { if (p.price > 0 && (!best[p.date] || p.price > best[p.date][0])) best[p.date] = [p.price, se.label]; });
      });
      it.hist = Object.keys(best).sort().slice(-150).map(d => [d, best[d][0], best[d][1]]);
    } catch (e) { it.err = e.message; }
    items.push(it); await wait(1200);
  }
  fs.writeFileSync('poikatsu/data.json', JSON.stringify({ updatedAt: up.updatedAt, fetchedAt: new Date().toISOString(), items }));
  try { fs.unlinkSync('poikatsu/debug.json'); fs.unlinkSync('poikatsu/summary.json'); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
