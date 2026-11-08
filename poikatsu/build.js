// Durip の index.html から、ポイ活専用ページ（poikatsu/index.html）を作る
const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('not found: ' + a); s = s.split(a).join(b); };
rep('window.POI=/[?&]app=poi/.test(location.search);', 'window.POI=true;');
rep("(window.POI?'&app=poi':'')", "''");
rep("'poikatsu.webmanifest'", "'manifest.webmanifest'");
rep("'poi-180.png'", "'icon-180.png'");
rep("'poi-192.png'", "'icon-192.png'");
rep("'poikatsu/data.json?t='", "'data.json?t='");
rep('<meta name="apple-mobile-web-app-title" content="Durip">', '<meta name="apple-mobile-web-app-title" content="ポイ活">');
rep('<meta name="application-name" content="Durip">', '<meta name="application-name" content="ポイ活">');
rep('<title>Durip</title>', '<title>ポイ活</title>');
rep('<meta name="theme-color" content="#0b1a3a">', '<meta name="theme-color" content="#e05a3a">');
fs.writeFileSync('poikatsu/index.html', s);
