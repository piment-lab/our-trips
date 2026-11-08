// こちゃログ（ポイントサイト比較）の公開データから、クレカ・口座案件の還元額を毎日記録する
// 1日1回だけ取得（相手サイトに負担をかけないよう間隔をあける）
const fs = require('fs');
const BASE = 'https://kochalog.com/tools/point-site-hikaku';
const UA = 'Mozilla/5.0 (personal poikatsu tracker; once a day)';
const H = { 'User-Agent': UA, 'Accept': 'application/json,text/plain,*/*', 'Referer': BASE + '/' };
const get = async (u, txt, h) => { const r = await fetch(u, { headers: h || H, redirect: 'follow' }); if (!r.ok) throw new Error(r.status + ' ' + u); return txt ? r.text() : r.json(); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
// こちゃログに推移ページがある案件
const CAT = {
  card: ['rakuten-card','epos-card','smbc-card-nl','smbc-gold-nl','mufj-card','jcb-card-w','jcb-card-s','recruit-card','paypay-card','aeon-card','tokyu-card','p-one-card','au-pay-card','mercard','famima-card','dcard','dcard-gold','smbc-biz-owners'],
  bank: ['smbc-olive','mizuho-bank','mufj-bank','rakuten-bank','sbi-shinsei-bank','risona-bank'],
  invest: ['sbi-sec','rakuten-sec','monex-sec','mufj-esmart-sec','coincheck','bitflyer','binance-japan','light-fx','minna-no-fx','dmm-fx','mattoco-plus','ag-crowdfunding']
};
// 追加で探す口座開設・カード案件（全サイト横断検索）
const EXTRA = {
  bank: ['住信SBIネット銀行','PayPay銀行','auじぶん銀行','ソニー銀行','GMOあおぞらネット銀行','みんなの銀行','イオン銀行','東京スター銀行','UI銀行','スルガ銀行','北九州銀行','セブン銀行','ゆうちょ'],
  invest: ['松井証券','GMOクリック証券','SBIネオトレード証券','PayPay証券','moomoo証券','DMM株','岡三証券','大和コネクト証券','tsumiki証券','セゾンポケット','SBI VCトレード','GMOコイン','bitbank','BITPOINT','OKJ','Zaif','外為どっとコム','ヒロセ通商','外為オンライン','SBI FXトレード','松井証券 FX','JFX','セントラル短資FX','IG証券','OANDA','GMO外貨','楽天FX','セゾン投信'],
  card: ['ライフカード','セゾンカード','セゾンパール','出光カード','JAカード','三井住友カード プラチナプリファード','アメリカン・エキスプレス','ANAカード','JALカード','ビックカメラSuicaカード','ルミネカード','Tカード プラス','ヤフーカード','ミライノカード','Oliveフレキシブルペイ','楽天ゴールドカード','楽天プレミアムカード','dカード PLATINUM','au PAY ゴールドカード','三井ショッピングパークカード','コスモ・ザ・カード','エポスゴールド','イオンゴールド','Visa LINE Payクレジットカード','ファミマTカード','楽天ANAマイレージクラブカード']
};
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
const esc = q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function allSites(q, unit) {
  const re = new RegExp('(^|[^\\p{L}\\p{N}])' + esc(q), 'u');
  const r = await get('https://api.kochalog.com/api/search/?q=' + encodeURIComponent(q) + '&limit=0&unitType=' + (unit || 'fixed'));
  const best = {};
  (r.offers || []).forEach(o => { if (!(o.price > 0) || !re.test(o.title || '')) return; const k = o.siteName; if (!best[k] || o.price > best[k].p) best[k] = { s: k, p: Math.round(o.price), u: o.url || o.topUrl || '', t: o.title }; });
  return Object.values(best).sort((a, b) => b.p - a.p);
}
// 案件ページから「獲得条件」を探して短く取り出す
const CONDK = ['【獲得条件】', 'ポイント獲得条件', '獲得条件', '成果条件', 'ポイント付与条件', '付与条件', '達成条件', '成果対象', '獲得の条件'];
async function cond(u) {
  if (!u) return '';
  try {
    const html = await get(u, 1, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'ja' });
    const txt = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|div|dd|dt|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;|&#\d+;/g, '').replace(/[ \t　]+/g, ' ').replace(/\n\s*/g, '\n');
    for (const k of CONDK) {
      let from = 0, at;
      while ((at = txt.indexOf(k, from)) >= 0) {
        from = at + k.length;
        let c = txt.slice(from).replace(/^[\s:：】」\]]+/, '');
        c = c.split(/\n(?=[^\n]{0,14}(注意|対象外|予定|確定|却下|ポイント数|獲得までの|よくある|関連|おすすめ|広告の詳細|レビュー|口コミ|ポイント獲得の目安|お問い合わせ))/)[0];
        c = c.replace(/\n+/g, ' / ').replace(/\s+/g, ' ').trim();
        if (c.length < 8 || /^(\/ )?(広告の詳細|レビュー)/.test(c) || /^は/.test(c)) continue;
        return c.slice(0, 150);
      }
    }
    return '';
  } catch (e) { return ''; }
}
(async () => {
  const sum = await get('https://api.kochalog.com/data/compare-summary.json');
  const up = await get('https://api.kochalog.com/data/last-updated.json');
  let own = {}; try { own = JSON.parse(fs.readFileSync('poikatsu/hist.json', 'utf8')); } catch (e) {}
  const bySlug = {}; sum.forEach(x => bySlug[x.slug] = x);
  const items = [], seen = {};
  for (const cat of Object.keys(CAT)) for (const slug of CAT[cat]) {
    const s = bySlug[slug]; if (!s) continue;
    const it = { slug, cat, title: s.title, now: s.maxPrice || 0, site: s.maxSite || '', change: s.change || 'same', url: '', page: BASE + '/compare/' + slug + '/', hist: [] };
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
    await wait(1000);
    try { it.sites = await allSites(s.title, s.unitType); } catch (e) { it.sites = []; }
    items.push(it); seen[s.title] = 1; await wait(1000);
  }
  for (const cat of Object.keys(EXTRA)) for (const q of EXTRA[cat]) {
    if (seen[q]) continue;
    const slug = 'x-' + q.replace(/\s+/g, '-');
    const it = { slug, cat, title: q, extra: true, change: 'same', page: BASE + '/search/?q=' + encodeURIComponent(q), hist: [] };
    try { it.sites = await allSites(q, 'fixed'); } catch (e) { it.sites = []; }
    const top = it.sites[0]; it.now = top ? top.p : 0; it.site = top ? top.s : ''; it.url = top ? top.u : '';
    items.push(it); await wait(1000);
  }
  // 自前の推移（全サイトの最高額）を記録。追加案件はこれで傾向を出す
  items.forEach(it => {
    const top = (it.sites && it.sites[0]) ? it.sites[0].p : it.now;
    const h = own[it.slug] = own[it.slug] || {};
    if (top) h[today] = top;
    const ks = Object.keys(h).sort(); ks.slice(0, Math.max(0, ks.length - 150)).forEach(k => delete h[k]);
    if (it.extra) it.hist = Object.keys(h).sort().map(d => [d, h[d], '']);
    const prev = Object.keys(h).sort().filter(d => d < today).pop();
    if (it.extra && prev) it.change = top > h[prev] ? 'up' : top < h[prev] ? 'down' : 'same';
  });
  // 上位2サイトの獲得条件
  for (const it of items) for (const x of (it.sites || []).slice(0, 2)) { x.c = await cond(x.u); await wait(600); }
  fs.writeFileSync('poikatsu/hist.json', JSON.stringify(own));
  fs.writeFileSync('poikatsu/data.json', JSON.stringify({ updatedAt: up.updatedAt, fetchedAt: new Date().toISOString(), items: items.filter(it => it.now > 0 || (it.sites || []).length || !it.extra) }));
})().catch(e => { console.error(e); process.exit(1); });
