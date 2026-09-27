// Собирает листовку A6 (две стороны) из config.json:
// out/listovka.pdf — файл для типографии (105×148 мм + вылеты по 2 мм),
// out/listovka-front.png и out/listovka-back.png — превью.
// Запуск: node make-flyer.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const QRCode = require('qrcode');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(path.join(globalRoot, 'playwright'));
  }
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Станции канатной дороги «Эльбрус» (официальный сайт курорта resort-elbrus.ru).
const STATIONS = [
  { name: 'Гарабаши', alt: 3847 },
  { name: 'Мир', alt: 3500 },
  { name: 'Старый Кругозор', alt: 3000 },
  { name: 'Поляна Азау', alt: 2350 },
];

function qrUrl(cfg) {
  const sep = cfg.botUrl.includes('?') ? '&' : '?';
  return cfg.qrStart ? `${cfg.botUrl}${sep}start=${cfg.qrStart}` : cfg.botUrl;
}

function ladder() {
  const min = 2350, max = 3847, heightMm = 32;
  return STATIONS.map((s) => {
    const bottom = ((s.alt - min) / (max - min)) * heightMm;
    const alt = s.alt.toLocaleString('ru-RU').replace(/ /g, ' ');
    return `<div class="st" style="bottom:${bottom.toFixed(2)}mm"><i></i><b>${alt} м</b><span>${esc(s.name)}</span></div>`;
  }).join('');
}

const check = '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="6" fill="#0E6B66"/><path d="M3.3 6.2l1.8 1.8 3.6-3.9" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function html(cfg, qrSvg) {
  const trips = cfg.trips.map((t) => `
      <div class="trip">
        <div>
          <div class="tag">${esc(t.tag)}</div>
          <div class="title">${esc(t.title)}</div>
          <div class="when">${esc(t.when)}</div>
        </div>
        <div class="price">${esc(t.price)}${t.priceNote ? `<small>${esc(t.priceNote)}</small>` : ''}</div>
      </div>`).join('');
  const trust = cfg.trust.map((t) => `<span>${check}${esc(t)}</span>`).join('');
  const sampleMark = cfg.sample ? '<div class="sample">ОБРАЗЕЦ</div>' : '';

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<link rel="stylesheet" href="../node_modules/@fontsource/golos-text/400.css">
<link rel="stylesheet" href="../node_modules/@fontsource/golos-text/500.css">
<link rel="stylesheet" href="../node_modules/@fontsource/golos-text/600.css">
<link rel="stylesheet" href="../node_modules/@fontsource/golos-text/700.css">
<link rel="stylesheet" href="../node_modules/@fontsource/forum/400.css">
<style>
  @page { size: 109mm 152mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Golos Text', 'DejaVu Sans', sans-serif; color: #13201E; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 109mm; height: 152mm; position: relative; overflow: hidden; background: #fff; break-after: page; }
  .page:last-child { break-after: auto; }
  .safe { position: absolute; left: 7mm; right: 7mm; top: 7mm; bottom: 7mm; }

  /* Лицевая сторона */
  .band { position: absolute; left: 0; right: 0; top: 0; height: 57mm; background: #0E6B66; }
  .band-in { position: absolute; left: 7mm; right: 7mm; top: 7mm; bottom: 4.5mm; display: flex; flex-direction: column; }
  .eyebrow { font-size: 6.8pt; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #BFE3DF; }
  h1 { font-family: 'Forum', 'DejaVu Serif', serif; font-weight: 400; font-size: 25pt; line-height: 1.02; color: #fff; margin: 2.6mm 0 2mm; }
  .subline { font-size: 8.6pt; color: #E3F0EE; }
  .depart { margin-top: auto; align-self: flex-start; font-size: 8pt; font-weight: 600; color: #fff;
            background: rgba(255,255,255,.16); border-radius: 99px; padding: 1.1mm 3mm; }
  .trips { position: absolute; left: 7mm; right: 7mm; top: 60.5mm; }
  .label { font-size: 6.6pt; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #0E6B66; margin-bottom: .6mm; }
  .trip { display: grid; grid-template-columns: 1fr auto; gap: 3mm; align-items: center; padding: 2mm 0; border-bottom: .25mm solid #DDE5E3; }
  .tag { font-size: 6.2pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #0E6B66; }
  .title { font-size: 8.8pt; font-weight: 600; line-height: 1.2; margin-top: .4mm; }
  .when { font-size: 7.4pt; color: #4A5A57; margin-top: .4mm; }
  .price { font-size: 9pt; font-weight: 700; text-align: right; white-space: nowrap; }
  .price small { display: block; font-size: 6.6pt; font-weight: 500; color: #4A5A57; }
  .trust { margin-top: 3mm; display: flex; flex-wrap: wrap; gap: 1.4mm 3.2mm; font-size: 7.2pt; color: #13201E; }
  .trust span { display: inline-flex; align-items: center; gap: 1.2mm; }
  .trust svg { width: 3mm; height: 3mm; flex: none; }
  .phone-box { position: absolute; left: 7mm; right: 7mm; bottom: 7mm; border-top: .3mm solid #0E6B66; padding-top: 2mm; }
  .phone-label { font-size: 6.6pt; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #4A5A57; }
  .phone { font-size: 19pt; font-weight: 700; letter-spacing: .01em; line-height: 1.15; }
  .hours { font-size: 7.6pt; color: #4A5A57; }

  /* Оборот */
  .back h2 { font-family: 'Forum', 'DejaVu Serif', serif; font-weight: 400; font-size: 17pt; line-height: 1.05; margin: 0; color: #0E6B66; }
  .back .lead { font-size: 7.8pt; color: #4A5A57; margin-top: 1.4mm; line-height: 1.35; }
  .ladder { position: relative; height: 32mm; margin: 5mm 0 0 1.5mm; border-left: .5mm solid #0E6B66; }
  .st { position: absolute; left: 0; transform: translateY(50%); display: flex; align-items: baseline; gap: 2.4mm; }
  .st i { position: absolute; left: -1.55mm; top: 50%; width: 2.6mm; height: 2.6mm; margin-top: -1.3mm; border-radius: 50%; background: #0E6B66; border: .5mm solid #fff; }
  .st b { margin-left: 3.6mm; font-size: 9.6pt; font-weight: 700; font-variant-numeric: tabular-nums; }
  .st span { font-size: 8pt; color: #4A5A57; }
  .notes { margin: 6mm 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 1.6mm; font-size: 7.8pt; line-height: 1.35; }
  .notes li { padding-left: 3.2mm; position: relative; }
  .notes li::before { content: ''; position: absolute; left: 0; top: 1.25mm; width: 1.4mm; height: 1.4mm; background: #0E6B66; border-radius: .3mm; }
  .qr-box { position: absolute; left: 7mm; right: 7mm; bottom: 7mm; display: grid; grid-template-columns: 34mm 1fr; gap: 4mm; align-items: center;
            border: .3mm solid #DDE5E3; border-radius: 3mm; padding: 3mm; background: #fff; }
  .qr { position: relative; width: 34mm; height: 34mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .sample { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-28deg); background: #C62828; color: #fff;
            font-size: 11pt; font-weight: 700; letter-spacing: .12em; padding: .8mm 3mm; border-radius: 1mm; white-space: nowrap; }
  .qr-text b { display: block; font-size: 9pt; line-height: 1.25; }
  .qr-text p { margin: 1.4mm 0 0; font-size: 7.4pt; color: #4A5A57; line-height: 1.35; }
  .qr-text .call { margin-top: 2mm; font-size: 8.4pt; font-weight: 700; color: #13201E; }
</style></head>
<body>
  <section class="page front">
    <div class="band">
      <div class="band-in">
        <div class="eyebrow">${esc(cfg.eyebrow)}</div>
        <h1>${esc(cfg.headline)}</h1>
        <div class="subline">${esc(cfg.subline)}</div>
        <div class="depart">${esc(cfg.departure)} · ${esc(cfg.meetingPoint)}</div>
      </div>
    </div>
    <div class="trips">
      <div class="label">Поездки недели</div>
      ${trips}
      <div class="trust">${trust}</div>
    </div>
    <div class="phone-box">
      <div class="phone-label">Запись по телефону</div>
      <div class="phone">${esc(cfg.phone)}</div>
      <div class="hours">${esc(cfg.phoneHours)}</div>
    </div>
  </section>

  <section class="page back">
    <div class="safe">
      <h2>Памятка: подъём на Эльбрус</h2>
      <div class="lead">${esc(cfg.elbrusLead)}</div>
      <div class="ladder">${ladder()}</div>
      <ul class="notes">${cfg.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>
    <div class="qr-box">
      <div class="qr">${qrSvg}${sampleMark}</div>
      <div class="qr-text">
        <b>Наведите камеру телефона: откроется бот в MAX</b>
        <p>Расписание на неделю, фото мест с описанием, запись в два нажатия.</p>
        <div class="call">Или звоните: ${esc(cfg.phone)}</div>
      </div>
    </div>
  </section>
</body></html>`;
}

(async () => {
  const dir = __dirname;
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const outDir = path.join(dir, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const url = qrUrl(cfg);
  const qrSvg = await QRCode.toString(url, {
    type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#13201E', light: '#FFFFFF' },
  });
  const htmlPath = path.join(outDir, 'listovka.html');
  fs.writeFileSync(htmlPath, html(cfg, qrSvg));

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 3 });
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(outDir, 'listovka.pdf'), preferCSSPageSize: true, printBackground: true });
  const sides = await page.$$('.page');
  await sides[0].screenshot({ path: path.join(outDir, 'listovka-front.png') });
  await sides[1].screenshot({ path: path.join(outDir, 'listovka-back.png') });
  await browser.close();
  console.log('QR ведёт на:', url);
  console.log('Готово:', path.join(outDir, 'listovka.pdf'));
})();
