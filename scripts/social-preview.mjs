/**
 * Renders the repository's social preview image (1280x640), the picture
 * GitHub shows when a link to the repository is shared.
 *
 *   npm run screenshots          (first: the phone images it uses)
 *   node scripts/social-preview.mjs
 *
 * Built from the application's own fonts, colours and screenshots; upload
 * docs/social-preview.png in the repository's Settings, General, Social preview.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const dataUrl = (file, type) => `data:${type};base64,${readFileSync(join(ROOT, file)).toString("base64")}`;
const font = (file) => dataUrl(`src/styles/fonts/${file}`, "font/woff2");

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @font-face { font-family: "Chakra Petch"; font-weight: 700; src: url(${font("chakra-petch-700-latin.woff2")}) format("woff2"); }
  @font-face { font-family: "Montserrat"; font-weight: 400 800; src: url(${font("montserrat-variable-latin.woff2")}) format("woff2"); }
  @font-face { font-family: "JetBrains Mono"; font-weight: 400 700; src: url(${font("jetbrains-mono-variable-latin.woff2")}) format("woff2"); }
  @font-face { font-family: "IBM Plex Sans Arabic"; font-weight: 600; src: url(${font("ibm-plex-sans-arabic-600-arabic.woff2")}) format("woff2"); }
  @font-face { font-family: "Noto Sans Tifinagh"; src: url(${font("noto-sans-tifinagh-400-tifinagh.woff2")}) format("woff2"); }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 640px; background: #050A14; color: #fff; font-family: "Montserrat", sans-serif;
         display: flex; overflow: hidden; border-bottom: 6px solid #00BFFF; }
  .text { flex: 1; padding: 64px 0 56px 72px; display: flex; flex-direction: column; }
  .mark { height: 44px; width: auto; align-self: flex-start; }
  h1 { font-family: "Chakra Petch", sans-serif; font-size: 68px; line-height: 1.05; letter-spacing: -0.02em; margin-top: 36px; }
  .lead { font-size: 26px; line-height: 1.4; color: #CBD5E1; margin-top: 22px; max-width: 560px; }
  ul { list-style: none; padding: 0; margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px; max-width: 600px; }
  li { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #00BFFF;
       border: 2px solid #31425F; background: #16233B; border-radius: 6px; padding: 8px 12px; }
  .langs { margin-top: auto; font-size: 20px; color: #94A3B8; display: flex; gap: 18px; align-items: baseline; }
  .langs .zgh { font-family: "Noto Sans Tifinagh"; } .langs .ar { font-family: "IBM Plex Sans Arabic"; }
  .by { font-family: "JetBrains Mono", monospace; font-size: 15px; color: #64748B; margin-top: 14px; }
  .phones { width: 520px; position: relative; }
  .phone { position: absolute; width: 250px; border-radius: 22px; border: 3px solid #31425F; box-shadow: 0 18px 44px rgba(0,0,0,.5); }
  .p1 { left: 10px; top: 54px; } .p2 { left: 250px; top: 110px; }
</style></head>
<body>
  <div class="text">
    <img class="mark" src="${dataUrl("public/brand/mark.png", "image/png")}" alt="">
    <h1>Pointage Carrière</h1>
    <p class="lead">Offline attendance for crushing and sand-washing sites. One tap per employee, one Excel file for payroll.</p>
    <ul><li>Works offline</li><li>Monthly &amp; daily pay</li><li>Advances</li><li>Excel export</li><li>Open source</li></ul>
    <p class="langs"><span class="zgh">ⵜⴰⵎⴰⵣⵉⵖⵜ</span><span class="ar">العربية</span><span>Français</span><span>English</span><span>Español</span></p>
    <p class="by">MeskikCode · Built in Marrakech · github.com/MeskikCode/quarry-pointage-lite</p>
  </div>
  <div class="phones">
    <img class="phone p1" src="${dataUrl("docs/screenshots/phone-fr.png", "image/png")}" alt="">
    <img class="phone p2" src="${dataUrl("docs/screenshots/phone-month.png", "image/png")}" alt="">
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(ROOT, "docs", "social-preview.png") });
await browser.close();
console.log("social-preview  docs/social-preview.png written");
