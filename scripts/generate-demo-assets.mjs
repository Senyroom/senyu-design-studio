// Original, reproducible demo illustrations. Released under the repository MIT license.
// No reference-site images, production media or personal QR codes are copied here.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'seed-assets');
await fs.mkdir(out, { recursive: true });
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const face = `<path d="M-85-35q0-100 88-100q91 0 90 100v60q-5 84-89 88q-82-4-89-88z" fill="#ffd8b1" stroke="#34304d" stroke-width="6"/><path d="M-85-12q-40-125 57-140q96-31 132 73l-22 48q-18-24-24-57q-48 55-122 39z" fill="#34304d"/><path d="M-55-10h32m48 0h32" stroke="#34304d" stroke-width="7" stroke-linecap="round"/><circle cx="-39" cy="10" r="5" fill="#34304d"/><circle cx="42" cy="10" r="5" fill="#34304d"/><path d="M-20 43q23 20 46-1" fill="none" stroke="#b66b5f" stroke-width="6" stroke-linecap="round"/><circle cx="-66" cy="31" r="12" fill="#ffa790" opacity=".7"/><circle cx="68" cy="31" r="12" fill="#ffa790" opacity=".7"/>`;
const hero = svg(
  1100,
  1050,
  `<defs><linearGradient id="coat" x2="1" y2="1"><stop stop-color="#f0ebff"/><stop offset="1" stop-color="#c9b6ef"/></linearGradient></defs><ellipse cx="550" cy="956" rx="360" ry="45" fill="#5333ac" opacity=".11"/><circle cx="558" cy="505" r="360" fill="#f0ebff"/><circle cx="880" cy="269" r="74" fill="#e7f4dd"/><path d="M195 263l22 50l53 9l-41 34l10 54l-46-28l-46 26l11-52l-39-35l53-7z" fill="#f4c85c"/><g transform="translate(565 405)">${face}</g><path d="M378 559q68-73 132-64l55 46l61-46q93 10 140 92l62 252H308z" fill="url(#coat)" stroke="#655880" stroke-width="7"/><path d="M508 506l57 73l65-73m-65 73v86" fill="none" stroke="#8c77a9" stroke-width="6"/><path d="M384 653l-91 90l117 53m346-143l82 90l-114 54" fill="none" stroke="#655880" stroke-width="48" stroke-linecap="round"/><path d="M377 786l-47 161h191l44-118l43 118h187l-47-161" fill="#34304d"/><rect x="307" y="646" width="511" height="260" rx="26" fill="#faf8ff" stroke="#756d8b" stroke-width="7"/><rect x="325" y="669" width="475" height="211" rx="15" fill="#e0d5fa"/><text x="563" y="785" font-family="sans-serif" font-size="65" font-weight="700" fill="#69509f" text-anchor="middle">&lt; / &gt;</text><path d="M263 910h597q-2 34-37 34H299q-36 0-36-34z" fill="#b8a5d8" stroke="#756d8b" stroke-width="6"/><g transform="translate(824 470) rotate(13)"><rect width="145" height="100" rx="20" fill="#fff" stroke="#e2dcef" stroke-width="4"/><text x="72" y="64" text-anchor="middle" font-family="sans-serif" font-size="42" fill="#5e48a0">AI</text></g><g transform="translate(126 546) rotate(-10)"><rect width="160" height="120" rx="22" fill="#e2efda"/><text x="80" y="77" text-anchor="middle" font-family="sans-serif" font-size="45" fill="#6a8059">✦</text></g>`,
);
await fs.writeFile(path.join(out, 'demo-creator.svg'), hero);
await sharp(Buffer.from(hero)).png().toFile(path.join(out, 'male-scientist.png'));
const avatar = svg(
  400,
  400,
  `<circle cx="200" cy="200" r="200" fill="#ede6fa"/><path d="M45 405q12-143 155-143q144 0 155 143" fill="#bca5e4"/><g transform="translate(200 211) scale(1.03)">${face}</g>`,
);
await sharp(Buffer.from(avatar)).png().toFile(path.join(out, 'male-avatar.png'));
const front = svg(
  800,
  1125,
  `<rect width="800" height="1125" fill="#ede6fb"/><circle cx="400" cy="350" r="195" fill="#fff"/><image href="data:image/png;base64,${(await fs.readFile(path.join(out, 'male-avatar.png'))).toString('base64')}" x="215" y="165" width="370" height="370"/><text x="400" y="675" text-anchor="middle" font-family="sans-serif" font-size="62" font-weight="700" fill="#45345e">SENYU STUDIO</text><text x="400" y="762" text-anchor="middle" font-family="sans-serif" font-size="35" fill="#796493">DESIGNER · BUILDER</text><path d="M190 845h420" stroke="#bca5db" stroke-width="3"/><text x="400" y="949" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#796493">YOUR CREATIVE SPACE</text>`,
);
await fs.writeFile(path.join(out, 'male-creative-pass-front.svg'), front);
const back = svg(
  800,
  1125,
  `<rect width="800" height="1125" fill="#fff"/><rect x="140" y="270" width="520" height="520" rx="32" fill="#f0f7f3" stroke="#a0c6b2" stroke-width="4" stroke-dasharray="15 12"/><text x="400" y="505" text-anchor="middle" font-family="sans-serif" font-size="75" font-weight="700" fill="#3c9368">YOUR QR</text><text x="400" y="581" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#729582">Upload your own image</text><text x="400" y="916" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#999">DEMO PLACEHOLDER · NOT A QR CODE</text>`,
);
await fs.writeFile(path.join(out, 'creative-pass-back.svg'), back);
await fs.writeFile(
  path.join(out, 'creative-strap.svg'),
  svg(
    256,
    1024,
    `<rect width="256" height="1024" fill="#d7c9f1"/><g fill="#5e498a" font-family="sans-serif" font-size="27" text-anchor="middle"><text x="128" y="180" transform="rotate(90 128 180)">SENYU STUDIO</text><text x="128" y="560" transform="rotate(90 128 560)">DESIGN &amp; BUILD</text><text x="128" y="900" transform="rotate(90 128 900)">SENYU STUDIO</text></g>`,
  ),
);
const rows = [
  { labels: '1234567890-=↵', x: 272, y: 513, w: 76, h: 66 },
  { labels: 'QWERTYUIOP[]', x: 308, y: 583, w: 77, h: 66 },
  { labels: 'ASDFGHJKL;:', x: 309, y: 654, w: 78, h: 67 },
  { labels: 'ZXCVBNM,./', x: 350, y: 725, w: 79, h: 61 },
  { labels: ' ', x: 299, y: 786, w: 970, h: 76 },
];
const keys = rows
  .flatMap((r) =>
    Array.from(
      r.labels,
      (label, i) =>
        `<g><rect x="${r.x + i * 83}" y="${r.y + 6}" width="${r.w}" height="${r.h - 5}" rx="12" fill="#817091"/><rect x="${r.x + i * 83}" y="${r.y}" width="${r.w}" height="${r.h - 11}" rx="12" fill="#eee8f4" stroke="#cfc3db" stroke-width="2"/><text x="${r.x + i * 83 + r.w / 2}" y="${r.y + 36}" text-anchor="middle" font-family="sans-serif" font-size="25" font-weight="600" fill="#655174">${label === '&' ? '&amp;' : label}</text></g>`,
    ),
  )
  .join('');
const machine = svg(
  1536,
  1024,
  `<defs><linearGradient id="body" x2="0" y2="1"><stop stop-color="#eee5fa"/><stop offset="1" stop-color="#bda4d5"/></linearGradient></defs><ellipse cx="768" cy="927" rx="628" ry="52" fill="#392752" opacity=".13"/><path d="M247 386q6-49 62-49h918q55 0 61 49l82 431q20 100-70 100H235q-88 0-68-100z" fill="url(#body)" stroke="#8c789e" stroke-width="8"/><rect x="270" y="338" width="995" height="100" rx="24" fill="#5c5068"/><rect x="283" y="352" width="969" height="55" rx="18" fill="#81738e"/><rect x="211" y="299" width="1114" height="48" rx="20" fill="#d0bbdf" stroke="#8c789e" stroke-width="5"/><circle cx="191" cy="371" r="48" fill="#d6c3e4" stroke="#8c789e" stroke-width="7"/><circle cx="1346" cy="371" r="48" fill="#d6c3e4" stroke="#8c789e" stroke-width="7"/><rect x="308" y="444" width="919" height="44" rx="12" fill="#e3d5ee"/><text x="768" y="476" text-anchor="middle" font-family="sans-serif" font-size="24" letter-spacing="6" fill="#81708e">SENYU · CREATE SOMETHING</text>${keys}<path d="M235 886h1060" stroke="#a08bb3" stroke-width="9" stroke-linecap="round"/>`,
);
await fs.writeFile(path.join(out, 'demo-typewriter.svg'), machine);
await sharp(Buffer.from(machine)).png().toFile(path.join(out, 'typewriter.png'));
for (const name of ['wechat', 'xiaohongshu', 'douyin']) {
  const bytes = await fs.readFile(path.join(out, `official-${name}.svg`));
  await sharp(bytes)
    .resize(128, 128)
    .png()
    .toFile(path.join(out, `social-${name}.png`));
}
console.log('已生成原创示例人物、头像、打字机、名片与挂绳；未包含个人二维码。');
