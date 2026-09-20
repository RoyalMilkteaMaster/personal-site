import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { projects } from '../lib/projects.ts';

// Node cannot import .tsx directly, so the shell is bundled once into the work
// directory (kept out of tsc/vite) and rendered as real markup from there.
const require_ = createRequire(import.meta.url);
const esbuild = require_('esbuild');
const root = fileURLToPath(new URL('..', import.meta.url));
// Ticket 47 順手修：esbuild 產物改寫到 node_modules/.cache（要留在專案內才解析得到套件），不再重建 OneDrive 的 work/。
const outfile = `${root}node_modules/.cache/starlit-ticket-02-build/shell.mjs`;

type PluginBuild = {
  onResolve(options: { filter: RegExp }, callback: () => unknown): void;
  onLoad(
    options: { filter: RegExp; namespace: string },
    callback: () => unknown,
  ): void;
};

await esbuild.build({
  entryPoints: [`${root}components/starlit-shell.tsx`],
  outfile,
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  tsconfig: `${root}tsconfig.json`,
  plugins: [
    {
      name: 'stub-css',
      setup(build: PluginBuild) {
        build.onResolve({ filter: /\.css$/ }, () => ({
          path: 'css',
          namespace: 'stub',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: '',
          loader: 'js',
        }));
      },
    },
  ],
});

const shell = await import(pathToFileURL(outfile).href);
const { STARLIT_SECTIONS, STARLIT_SOCIAL } = shell;
/** Ticket 41 — the tempo constants live here and the shell only re-exports them. */
const emberFire = await import('../lib/ember-fire.ts');
/** Ticket 45 — 方案 C 的純函式與著色器原始碼。 */
const emberFireGl = await import('../lib/ember-fire-gl.ts');
const { SITE_COPY } = await import('../lib/site-copy.ts');
const { localizedProjects } = await import('../lib/projects.ts');

/** react-dom escapes `&` in attributes; compare against the escaped form. */
const esc = (value: string) => value.replace(/&/g, '&amp;');

const render = (props: Record<string, unknown>, children?: ReactNode) =>
  renderToStaticMarkup(
    createElement(
      shell.default,
      {
        introComplete: false,
        active: '0',
        onActiveChange: () => {},
        onReplay: () => {},
        ...props,
      },
      children,
    ),
  );

// Ticket 05（使用者 2026-09-19 實作中修訂「直接改成把 linkedin 拿掉好了」）：
// 剩下三個社群目標，就是 spec 現在固定的那三個，順序照舊，沒有轉址器或追蹤參數，
// 也沒有補上替代入口。
assert.deepEqual(
  STARLIT_SOCIAL.map((s: { id: string; href: string }) => [s.id, s.href]),
  [
    ['github', 'https://github.com/RoyalMilkteaMaster'],
    ['instagram', 'https://www.instagram.com/royal_milktea_master/'],
    ['email', 'mailto:leslie0907@gmail.com'],
  ],
);
// …而且 Facebook 和 LinkedIn 都不得留在任何一個共用的社群位置（網址、id、圖示鍵、
// 文案鍵）。找的是會出現在畫面上的東西；註解裡寫「本票把 LinkedIn 拿掉」是紀錄，
// 不是殘留。
{
  const social = fs.readFileSync(`${root}components/starlit-shell.tsx`, 'utf8');
  const copySource = fs.readFileSync(`${root}lib/site-copy.ts`, 'utf8');
  for (const [name, text] of [
    ['starlit-shell.tsx', social],
    ['site-copy.ts', copySource],
  ] as [string, string][])
    assert.equal(
      /facebook\.com|facebookHandle|['"]facebook['"]|\bfacebook:/i.test(text),
      false,
      `Ticket 48：${name} 不得再留著 Facebook 的網址、id、圖示或文案`,
    );
  for (const [name, text] of [
    ['starlit-shell.tsx', social],
    ['site-copy.ts', copySource],
  ] as [string, string][])
    assert.equal(
      /linkedin\.com|linkedinHandle|['"]linkedin['"]|\blinkedin:/i.test(text),
      false,
      `Ticket 05：${name} 不得再留著 LinkedIn 的網址、id、圖示或文案`,
    );
}

// Opening: brand is there, chapter buttons are not, the copy slot renders.
const opening = render({ introComplete: false }, '將星空斟入玉觴，');
assert.match(opening, /皇家奶茶大師 · 重播開場/);
assert.equal(opening.includes('role="tab"'), false);
assert.equal(opening.includes('starlit-tab'), false);
for (const s of STARLIT_SECTIONS)
  assert.equal(opening.includes(`>${s.label}<`), false);
assert.match(opening, /將星空斟入玉觴，/);
assert.equal(opening.includes('starlit-footer'), false);

// Completed: three chapter buttons, 關於我 selected by default.
const done = render({ introComplete: true, active: '0' });
const tabs = [...done.matchAll(/role="tab"/g)];
assert.equal(tabs.length, 3);
// Ticket 28-v2: the tab is the slash-prefixed name on its own — no 01/02/03.
for (const s of STARLIT_SECTIONS) {
  assert.match(done, new RegExp(`class="starlit-tab">${s.label}</button>`));
  assert.match(s.label, /^\//, `${s.label} 要有斜線前綴`);
}
assert.equal(done.includes('starlit-tab"><span>'), false, '分頁裡不再有編號');
const activeTab = done.match(/<button[^>]*data-active[^>]*>[^]*?<\/button>/);
assert.ok(activeTab, 'one tab must carry data-active');
assert.match(activeTab[0], /關於我/);
// Ticket 29-A — /關於我 opens as a name card instead of a kicker + headline:
// the big name, the other writing form of it, then one line of positioning.
// The old `ABOUT ME` kicker, the 「把好奇，／變成可能。」headline and the lead
// paragraph are gone, and the chapter still has exactly one h1.
assert.equal(done.includes('ABOUT ME'), false, 'about kicker 已移除');
assert.equal(done.includes('把好奇'), false, '舊 h1 已移除');
assert.equal(done.includes('變成可能'), false, '舊 h1 已移除');
assert.match(done, /<h1 class="starlit-about-name">皇家奶茶大師<\/h1>/);
assert.match(done, /class="starlit-about-name-sub">ROYAL MILKTEA MASTER</);
assert.match(done, /class="starlit-about-tagline">熱愛 AI 與遊戲的夢想家</);
assert.equal([...done.matchAll(/<h1[\s>]/g)].length, 1, '章節只有一個 h1');
// The approved moon replaces the rectangular plate. Verify the rendered local
// asset exists and stays within a 256 KiB delivery budget. Decoded dimensions
// and transparent corners are checked by starlit-moon-portrait.test.cjs.
const portrait = done.match(/<div class="starlit-about-portrait"><img src="(\/[^"]+)"[^>]*width="(\d+)" height="(\d+)"/);
assert.ok(portrait, '合照仍位於名片區，並預留載入尺寸');
const portraitBytes = fs.readFileSync(join(root, 'public', portrait[1]));
assert.ok(portraitBytes.length <= 256 * 1024, '首屏合照不可回退成未壓縮的大圖');
assert.equal(portrait[2], portrait[3], '滿月畫布保持正方形');
assert.match(done, /alt="林品宏與一隻黑白貓的合照"/);
assert.equal(done.includes('切齊頁面邊緣'), false, 'alt 不再描述出血');
assert.match(done, /loading="eager"/);
assert.match(done, /decoding="async"/);
assert.equal(
  [...done.matchAll(/<img[\s>]/g)].length,
  1,
  '/關於我 只有這一張圖',
);
// app/globals.css 對裸 `header` 下了 `position:absolute;top:0;z-index:5`，所以
// 標題區不能是 <header>：實測 1440×900 時它會浮出內容欄、壓在人物與品牌上。
assert.match(done, /<div class="starlit-about-head starlit-reveal"/);
assert.equal(
  done.includes('<header class="starlit-about-head"'),
  false,
  '標題區不得用裸 header（會被 globals.css 絕對定位）',
);
// 「歷程 JOURNEY」整塊換成「教育 EDUCATION」：三所學校由舊到新，而且沒有任何
// 年份被編造出來——使用者沒有提供年份。
assert.equal(done.includes('JOURNEY'), false, '歷程區塊已移除');
assert.equal(done.includes('跨域經驗'), false, '舊 timeline 已移除');
assert.match(done, /<h2>教育 <small>EDUCATION<\/small><\/h2>/);
assert.deepEqual(
  [...done.matchAll(/<li>([^<]*)<\/li>/g)]
    .map((m) => m[1])
    .filter((text) => SITE_COPY.zh.about.schools.includes(text)),
  SITE_COPY.zh.about.schools,
  '教育三校，順序由舊到新',
);
// Ticket 31.5：使用者裁示教育每筆只有校名一行，不放年份、不放英文校名，
// 且**不得自行編造就讀年份**。`(19|20)\d{2}` 只擋得住四位數的西元年，
// 「93 級」「2026-」這種寫法照樣過得去，所以直接禁任何數字。
for (const school of SITE_COPY.zh.about.schools)
  assert.equal(/\d/.test(school), false, `${school} 不得帶數字（年份）`);
assert.match(done, /國立成功大學 光電科學與工程學系/);
// Ticket 30-A.5：得獎資料更新。兩筆各自獨立，年份仍在左；第二筆的兩個成績是
// **兩個 <p>**，不是一行用 `·` 串起來的字串。期望的標記逐字寫死在這裡
// （延續 Review A MINOR-1：不得從 SITE_COPY 取值）。
assert.equal([...done.matchAll(/class="starlit-award"/g)].length, 2);
assert.match(
  done,
  /class="starlit-award"><span>2026<\/span><div><h3>AWS 雲湧智生黑客松<\/h3><p>智慧交易冠軍<\/p><\/div><\/div>/,
);
assert.match(
  done,
  /class="starlit-award"><span>2026<\/span><div><h3>SITCON 台灣未來祭<\/h3><p>AI 創意科技優勝<\/p><p>AI 綜合賽道 第四<\/p><\/div><\/div>/,
);
// Ticket 30-D.2：`SITCON` 是官方寫法，而且是**字面值**全大寫，不是靠
// `text-transform` 在畫面上造出來的。所以 DOM 文字本身必須是大寫，而且
// 樣式表不得再用 text-transform 去動它——否則複製、朗讀與搜尋拿到的字會和
// 畫面上的不一樣。
assert.equal(done.includes('Sitcon'), false, '得獎標題不得再出現小寫的 Sitcon');
assert.equal(
  done.includes('AI 創意科技優勝 · '),
  false,
  '第二筆的兩個成績不得併成一行',
);
// 30-A.1：✧ 隨著列間線一起拿掉（票面授權 Developer 依減線原則判斷）。
assert.equal(done.includes('✧'), false, '得獎列不再有 ✧');
// 技能是兩欄逐行清單，不是膠囊：`.starlit-skills` 只留給 /我的作品。
assert.match(done, /<h2>技能 <small>SKILLS<\/small><\/h2>/);
assert.equal(done.includes('starlit-skills'), false, '關於我不再有膠囊');
assert.equal(
  [...done.matchAll(/class="starlit-skill-column"/g)].length,
  2,
  '技能兩欄',
);
// Ticket 30-A.4：項目多的那一塊自己說了算，樣式表據此給它雙寬軌 + 兩欄文字。
assert.equal(
  [...done.matchAll(/class="starlit-skill-column" data-wide="true"/g)].length,
  1,
  '只有 13 項的那一塊是寬欄',
);
assert.match(
  done,
  /class="starlit-skill-column" data-wide="true"><h3>程式語言與應用<\/h3>/,
  '寬欄是「程式語言與應用」',
);
assert.equal(
  /class="starlit-skill-column" data-wide="true"><h3>專業</.test(done),
  false,
  '「專業」（7 項）不是寬欄',
);
// Ticket 30-C：捲動顯現只掛在 /關於我 的四塊上，而且是 class + data key，
// 動畫本身在 CSS，一次性由 IntersectionObserver 控制。
assert.deepEqual(
  [...done.matchAll(/data-reveal-key="([a-z]+)"/g)].map((m) => m[1]),
  ['head', 'skills', 'education', 'recognition', 'now'],
  '捲動顯現的五塊與順序（Ticket 33-B 加了「近況與目標」）',
);
assert.equal(
  [...done.matchAll(/starlit-reveal/g)].length,
  5,
  '/關於我 剛好五個 .starlit-reveal（Ticket 33-B）',
);
// Review A MINOR-1：期望值**寫死在這個檔案裡**，不從 SITE_COPY 迭代。
// 以前這裡是 `for (const group of SITE_COPY.zh.about.skillGroups)`，等於拿被驗
// 的資料驗自己；改壞一項或刪一項都不會紅。
const ZH_SKILLS: [string, string[]][] = [
  [
    '專業',
    [
      '全端開發',
      'AI Agents 開發',
      'Multi-Agents 協作系統',
      'Python 自動化開發',
      '資料分析與視覺化',
      '遊戲企劃',
      '劇本創作',
    ],
  ],
  [
    '程式語言與應用',
    [
      'Python',
      'JavaScript',
      'HTML／CSS',
      'Git',
      'MySQL',
      'NumPy',
      'pandas',
      'YOLO',
      'CLI Bridge',
      'Blender',
      'ComfyUI',
      'SMPL-X',
      'VPoser',
    ],
  ],
];
for (const [heading, items] of ZH_SKILLS) {
  const column = done.match(
    new RegExp(
      `<h3>${heading}</h3><ul class="starlit-plain-list" role="list">([^]*?)</ul>`,
    ),
  );
  assert.ok(column, `找不到技能欄 ${heading}`);
  assert.deepEqual(
    [...column[1].matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]),
    items,
    `${heading} 的項目與票面逐字不符`,
  );
}
// Review A NIT-1：三個 list-style:none 的 <ul> 都要有 role="list"，否則
// Safari + VoiceOver 會把它們降級成一般群組、不再播報「清單，共 N 項」。
assert.equal(
  [...done.matchAll(/<ul class="starlit-plain-list[^"]*" role="list">/g)].length,
  3,
  '三個清單都要 role="list"',
);
assert.equal(
  [...done.matchAll(/<ul[\s>]/g)].length,
  3,
  '/關於我 只有這三個 <ul>',
);
// 2026-09-17 追加決定 1：區塊順序是 技能 → 教育 → 得獎；Ticket 33-B 在最後加
// 「近況與目標」。小標可含 `&`（渲染成 `&amp;`），比對前還原。
assert.deepEqual(
  [...done.matchAll(/<h2>(?:([^< ]+) <small>([^<]+)<\/small>)<\/h2>/g)].map(
    (m) => `${m[1]} ${m[2].replace(/&amp;/g, '&')}`,
  ),
  ['技能 SKILLS', '教育 EDUCATION', '得獎 RECOGNITION', '近況與目標 NOW & GOALS'],
  '區塊順序：技能 → 教育 → 得獎 → 近況與目標',
);
// Ticket 02（Spec R4）：佔位那一行換成使用者的四項近況——就是 site-copy 的
// nowLines，逐行一個 <p>、照順序、不多不少，區塊本身沒有長出別的東西。
{
  const now = done.match(
    /<section class="starlit-block starlit-reveal starlit-now" data-reveal-key="now"><h2>近況與目標 <small>NOW &amp; GOALS<\/small><\/h2>([^]*?)<\/section>/,
  );
  assert.ok(now, '近況與目標區塊還在原位');
  assert.deepEqual(
    [...now[1].matchAll(/<p>([^<]*)<\/p>/g)].map((m) => m[1]),
    SITE_COPY.zh.about.nowLines.map((line) => line.replace(/&/g, '&amp;')),
    '近況與目標：四項近況逐行輸出',
  );
  assert.equal(
    now[1].replace(/<p>[^<]*<\/p>/g, ''),
    '',
    '近況與目標：除了那四行沒有別的內容',
  );
}

// Works chapter keeps lib/projects as the only source of work entries.
const works = render({ introComplete: true, active: '1' });
assert.match(
  works.match(/<button[^>]*data-active[^>]*>[^]*?<\/button>/)![0],
  /我的作品/,
);
for (const p of projects) {
  assert.ok(works.includes(p.title), `missing project ${p.title}`);
  assert.ok(works.includes(p.summary), `missing summary of ${p.title}`);
  for (const l of p.links)
    assert.ok(works.includes(esc(l.url)), `missing ${l.url}`);
}

// Ticket 38：被跳過（整塊落在捲動視窗上方）的區塊算已顯現。
assert.deepEqual(
  [
    shell.passedAbove(-213, 0), // 診斷抓到的 skills：bottom -213，root 是 window
    shell.passedAbove(0, 0), // 剛好貼齊上緣：算過了
    shell.passedAbove(178, 0), // education 下緣還在視窗內：不算
    shell.passedAbove(-5, 88), // 桌面：root 是 .starlit-content，上緣在 88
    shell.passedAbove(100, 88), // 桌面：還在容器內
  ],
  [true, true, false, true, false],
  'passedAbove(bottom, rootTop)：bottom <= rootTop 才算被跳過',
);
// 兩條路徑都在：IO 回呼看 boundingClientRect，scroll 監聽看 live 集合。
// （`shellSource` 在更下面才宣告，這裡自己讀一份。）
const revealSource = fs.readFileSync(`${root}components/starlit-shell.tsx`, 'utf8');
assert.match(
  revealSource,
  /passedAbove\(entry\.boundingClientRect\.bottom, rootTop\)/,
  'IO 回呼對已在上方的 entry 直接顯現',
);
// Review J F1：掛在 document 的捕獲階段，元素捲動不冒泡到 window 也照樣看得到。
assert.match(
  revealSource,
  /document\.addEventListener\('scroll', onScroll, \{ passive: true, capture: true \}\)/,
  'scroll 監聽掛 document 捕獲階段，補 IO 在 0→0 不回呼的洞',
);
assert.match(
  revealSource,
  /document\.removeEventListener\('scroll', onScroll, \{ capture: true \}\)/,
  'unmount 要用同樣的 capture 旗標移除',
);

// Ticket 30-C.5：捲動顯現不得外溢到別的章節或開場。
assert.equal(
  works.includes('starlit-reveal'),
  false,
  '/我的作品 沒有捲動顯現',
);
assert.equal(
  opening.includes('starlit-reveal'),
  false,
  '開場沒有捲動顯現',
);

// Contact chapter lists every social entry; the footer row is always present.
const contact = render({ introComplete: true, active: '2' });
// 2026-09-20 使用者修訂：標題第二行只有「奶茶」／"milk tea" 那個詞上奶茶色。
// 守的是「句子沒有被拆散、也沒有第二份標題字串」：h1 的文字仍然正好是
// title + titleEm，而唯一被包起來上色的就是 titleAccent 那個詞。
const assertTitleAccent = (language: 'zh' | 'en', markup: string) => {
  const { title, titleEm, titleAccent } = SITE_COPY[language].contact;
  const h1 = markup.match(/<h1>([^]*?)<\/h1>/);
  assert.ok(h1, `${language}：聯絡標題還在`);
  assert.equal(
    h1[1].replace(/<br\/>/g, '').replace(/<\/?em[^>]*>/g, ''),
    esc(title + titleEm),
    `${language}：標題文字仍是 title + titleEm 一份，沒有被拆散或重複`,
  );
  assert.deepEqual(
    [...h1[1].matchAll(/<em class="starlit-title-accent">([^<]*)<\/em>/g)].map((m) => m[1]),
    [esc(titleAccent)],
    `${language}：只有 titleAccent 那個詞被包起來上色`,
  );
  assert.equal(/<em(?! class="starlit-title-accent")/.test(h1[1]), false, `${language}：標題沒有其他整行上色的 <em>`);
};
assertTitleAccent('zh', contact);
assert.equal(
  contact.includes('starlit-reveal'),
  false,
  '/聯絡資訊 沒有捲動顯現',
);
for (const s of STARLIT_SOCIAL as { label: string; href: string }[]) {
  assert.ok(contact.includes(`href="${s.href}"`), `missing ${s.href}`);
  assert.ok(
    contact.includes(`aria-label="${s.label}"`),
    `missing footer icon for ${s.label}`,
  );
}
// External targets open in a new tab; mailto must not.
assert.match(
  contact,
  /href="https:\/\/www\.instagram\.com\/royal_milktea_master\/"[^>]*target="_blank"/,
);
assert.equal(
  /href="mailto:leslie0907@gmail\.com"[^>]*target="_blank"/.test(contact),
  false,
);
// Ticket 05：中文的聯絡頁與頁尾都不再畫出 LinkedIn —— 連結、名稱、可及性標籤、
// handle 一個都不留。這條看的是真的 render 出來的 markup，不是原始碼字串。
assert.equal(/linkedin/i.test(contact), false, 'Ticket 05：中文聯絡頁／頁尾沒有 LinkedIn');
assert.equal(contact.includes('林品宏'), false, 'Ticket 05：中文 LinkedIn handle 也一起走');

// The brand mark is a drawn cup, not a text glyph, and ships as a file for the
// preview tab icon.
assert.match(opening, /viewBox="0 0 24 24"/);
const brandFile = fs.readFileSync(`${root}public/starlit-brand.svg`, 'utf8');
assert.equal(brandFile.includes('<text'), false);
for (const d of shell.STARLIT_BRAND_PATHS as string[])
  assert.ok(brandFile.includes(d), 'tab icon out of sync with the brand mark');

// R09 — the same shell in English: chapters, works and contact, not just tabs.
const en = (props: Record<string, unknown>, children?: ReactNode) =>
  render({ language: 'en', ...props }, children);
const enAbout = en({ introComplete: true, active: '0' });
for (const s of SITE_COPY.en.sections) {
  assert.match(enAbout, new RegExp(`class="starlit-tab">${s.label}</button>`));
  assert.match(s.label, /^\//, `${s.label} 英文也要斜線前綴`);
}
assert.match(
  enAbout.match(/<button[^>]*data-active[^>]*>[^]*?<\/button>/)![0],
  /About me/,
);
// Ticket 29-A — the same three-line name card in English, with the two names
// swapped: the page language carries the name, the other form sits under it.
assert.ok(enAbout.includes(`<h1 class="starlit-about-name">Royal Milktea Master</h1>`));
assert.ok(enAbout.includes('>PIN HUNG LIN<'));
assert.ok(enAbout.includes(esc(SITE_COPY.en.about.tagline)));
assert.equal([...enAbout.matchAll(/<h1[\s>]/g)].length, 1, '英文也只有一個 h1');
// Review A MINOR-1：英文側同樣用寫死的期望值，不從 SITE_COPY 迭代。
const EN_SCHOOLS = [
  'Qingxi Municipal Junior High School',
  'National Wuling Senior High School',
  'National Cheng Kung University — Department of Photonics Science and Engineering',
];
assert.deepEqual(
  [...enAbout.matchAll(/<li>([^<]*)<\/li>/g)]
    .map((m) => m[1])
    .filter((text) => EN_SCHOOLS.includes(text)),
  EN_SCHOOLS,
  '英文教育三校，順序由舊到新',
);
// Ticket 31.5：英文側同樣不得帶年份。這一條量的是**渲染出來的教育清單**
// 而不是上面那個字面值陣列 —— 對著自己的常數斷言永遠會是綠的。
const enEduHtml = enAbout.match(
  /<ul class="starlit-plain-list starlit-education"[^>]*>([\s\S]*?)<\/ul>/,
)?.[1];
assert.ok(enEduHtml, '英文找不到教育清單');
assert.equal(
  /\d/.test(enEduHtml),
  false,
  `英文教育清單不得出現數字（年份）：${enEduHtml}`,
);
const EN_SKILLS: [string, string[]][] = [
  [
    'Expertise',
    [
      'Full-stack development',
      'AI agent development',
      'Multi-agent collaboration systems',
      'Python automation',
      'Data analysis and visualisation',
      'Game design',
      'Scriptwriting',
    ],
  ],
  [
    'Languages &amp; tools',
    [
      'Python',
      'JavaScript',
      'HTML / CSS',
      'Git',
      'MySQL',
      'NumPy',
      'pandas',
      'YOLO',
      'CLI Bridge',
      'Blender',
      'ComfyUI',
      'SMPL-X',
      'VPoser',
    ],
  ],
];
for (const [heading, items] of EN_SKILLS) {
  const column = enAbout.match(
    new RegExp(
      `<h3>${heading}</h3><ul class="starlit-plain-list" role="list">([^]*?)</ul>`,
    ),
  );
  assert.ok(column, `英文找不到技能欄 ${heading}`);
  assert.deepEqual(
    [...column[1].matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]),
    items,
    `${heading} 的英文項目逐字不符`,
  );
}
// 英文側的兩筆得獎也逐字釘住。
assert.match(
  enAbout,
  /class="starlit-award"><span>2026<\/span><div><h3>AWS 雲湧智生 Hackathon<\/h3><p>Smart Trading — First Place<\/p><\/div><\/div>/,
);
assert.match(
  enAbout,
  /class="starlit-award"><span>2026<\/span><div><h3>SITCON 台灣未來祭 Festival<\/h3><p>AI Creative Technology — Winner<\/p><p>AI Overall Track — 4th Place<\/p><\/div><\/div>/,
);
// 30-D.2 中英一致；30-D.8 第二筆的兩行統一成 Title Case。
assert.equal(enAbout.includes('Sitcon'), false, '英文版也不得再出現小寫的 Sitcon');
assert.equal(
  enAbout.includes('AI overall track'),
  false,
  '第二筆的第二行已統一成 Title Case',
);
// 英文版的個人照 alt 必須是英文，不能漏翻成中文。
assert.match(enAbout, /alt="Pin Hung Lin with a black-and-white cat"/);
// 英文版沒有 <small> 第二形式，所以區塊順序改看 h2 的純文字。
assert.deepEqual(
  [...enAbout.matchAll(/<h2>([^<]*?) <\/h2>/g)].map((m) =>
    m[1].replace(/&amp;/g, '&'),
  ),
  ['Skills', 'Education', 'Recognition', 'Now & Goals'],
  '英文區塊順序：Skills → Education → Recognition → Now & Goals（Ticket 33-B）',
);
// Ticket 02（Spec R4／R5）：英文同樣是四項，逐行對上英文的 nowLines；沒有核准
// 英文書名／遊戲名的專名保留中文，所以這裡不檢查「英文區塊完全沒有中文」。
assert.deepEqual(
  [...(enAbout.match(/<h2>Now &amp; Goals <\/h2>([^]*?)<\/section>/) ?? ['', ''])[1].matchAll(/<p>([^<]*)<\/p>/g)].map((m) => m[1]),
  SITE_COPY.en.about.nowLines.map((line) => line.replace(/&/g, '&amp;')),
  '英文近況四行',
);
assert.equal(enAbout.includes('國立成功大學'), false, 'about is translated');
assert.equal(enAbout.includes('皇家奶茶大師'), false, '英文不出現中文主名');

const enWorks = en({ introComplete: true, active: '1' });
for (const p of localizedProjects('en')) {
  assert.ok(enWorks.includes(p.title), `missing ${p.title}`);
  assert.ok(enWorks.includes(p.summary), `missing summary of ${p.title}`);
  for (const l of p.links) assert.ok(enWorks.includes(esc(l.url)));
}
assert.ok(enWorks.includes(SITE_COPY.en.works.detail), '關閉的卡片帶「About this work」sr 提示');

// Ticket 40.5 — 標題區只剩 <h1> 的兩行，中英文同字；小標與 lead 句都拿掉了。
// Ticket 40 Review F2（在 Ticket 41 一併修）：兩行之間要有 <br />，否則
// textContent／accessible name 會連成「Royal Milktea Master'sProject Base」。
// Ticket 46：中英文分開。Ticket 02 把中文第二行換成「程式作品集」、英文換成
// Coding Projects——標題字面在 site-copy，這裡守的是版型（兩行、<br />、<em>），
// 所以直接用那份文案組出樣式，改文案不會再要求同步改這個正規式。
const h1Pattern = (language: 'zh' | 'en') => {
  const { title, titleEm } = SITE_COPY[language].works;
  const quoted = (value: string) =>
    value
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/'/g, "(?:&#x27;|&#39;|')");
  return new RegExp(`<h1>${quoted(title)}<br/><em>${quoted(titleEm)}</em></h1>`);
};
const WORKS_H1 = { zh: h1Pattern('zh'), en: h1Pattern('en') } as const;
for (const [tag, markup] of [['zh', works], ['en', enWorks]] as const) {
  assert.match(markup, WORKS_H1[tag], `${tag}：作品頁 h1 兩行、<br />、第二行 <em> 金色（Ticket 46 中英分開）`);
  const panel = markup.slice(markup.search(/<h1>(皇家奶茶大師的|Royal Milktea)/));
  assert.equal(
    /starlit-kicker|starlit-lead/.test(panel.slice(0, panel.indexOf('starlit-ember-grid'))),
    false,
    `${tag}：作品頁標題區沒有 kicker 小標、也沒有 lead 句`,
  );
  assert.equal(
    /SELECTED &amp; ONGOING|探索我的 GitHub|Explore my GitHub|starlit-text-link/.test(markup),
    false,
    `${tag}：Ticket 40.4/40.5——SELECTED & ONGOING 與底部的 GitHub 文字連結都不在了`,
  );
}

// Ticket 39 — ember cards, pinned on the rendered markup.
{
  // Ticket 41 之後靜止的卡片結尾就是膜這個 button，然後卡片、grid 關閉——
  // Ticket 40.4 之後 grid 後面不再接底部的 GitHub 文字連結，grid 就是作品頁的
  // 最後一塊。
  // Ticket 44-B 在膜之後多了一個空的 `.starlit-ember-spot`（鼠標所在那張卡內部
  // 的淡聚光，必須是真元素：`::before` 是流光框、`::after` 是鼠標邊框聚光，而它
  // 要壓在膜之上、火的 canvas 之下）。未開啟時不掛載外火。
  const grid = works.match(
    /<div class="starlit-ember-grid">[^]*?<\/button><div class="starlit-ember-spot" aria-hidden="true"><\/div><\/div><\/div>/,
  );
  assert.ok(grid, '作品頁是 ember grid');
  assert.ok(
    works.indexOf('starlit-ember-grid') < works.length &&
      !/<\/div><a /.test(works.slice(works.indexOf('starlit-ember-grid'))),
    'grid 之後沒有再接任何 <a>（底部文字連結已移除）',
  );
  // 順序：卡（tint 變數）→ 底下的燒開面 → 上面的膜（button）。Ticket 41 之後
  // 卡片就到膜為止，火是燒的時候才掛上來的 canvas。
  const cards = [...works.matchAll(/<div class="starlit-ember" data-lit="(true|false)" data-closing="(true|false)" data-burning="(true|false)" data-ring="false" data-tint="([a-z]+)" style="--ember-tint:(#[0-9a-f]{6});[^"]*"><div id="starlit-work-([a-z-]+)" class="starlit-ember-open"/g)];
  assert.equal(cards.length, 5, '五張 ember 卡');
  assert.deepEqual(cards.map((m) => m[1]), projects.map(() => 'false'), '初始全部未燒開');
  assert.deepEqual(cards.map((m) => m[2]), projects.map(() => 'false'), '初始沒有在收回的');
  assert.deepEqual(cards.map((m) => m[3]), projects.map(() => 'false'), '初始沒有在燒的');
  assert.deepEqual(cards.map((m) => m[4]), ['gold', 'blue', 'purple', 'pink', 'indigo'], '五件作品依 id 對應核准色票');
  assert.deepEqual(cards.map((m) => m[5]), ['#e0c49d', '#8fb8ff', '#c0a7e5', '#f3a4d8', '#7f7cf5'], '專屬色的本色寫進 --ember-tint');
  assert.deepEqual(
    [...works.matchAll(/<button type="button" class="starlit-work starlit-ember-face" aria-expanded="(true|false)"/g)].map((m) => m[1]),
    projects.map(() => 'false'),
    '初始 aria-expanded 全 false',
  );
  // 色池：沒指定的專案依位置領色，指定的優先。
  assert.deepEqual(
    [shell.emberTint('nope', 0).name, shell.emberTint('nope', 2).name, shell.emberTint('nope', 7).name, shell.emberTint('cb', 0).name, shell.emberTint('milktea', 5).name],
    ['gold', 'blue', 'purple', 'blue', 'purple'],
    'emberTint：指定優先，否則 index % 色池',
  );
  // Ticket 41 — v3 的 SVG 火焰濾鏡整個拿掉了（火改成 canvas）。
  assert.equal(works.includes('starlit-flame'), false, 'v3 的 feTurbulence 火焰濾鏡不得再存在');
  assert.equal(grid[0].includes('feDisplacementMap'), false, '卡片火層不再使用位移濾鏡（背景可有自己的濾鏡）');
  assert.equal(works.includes('starlit-ember-fire'), false, 'v3 的 CSS 火圈不得再存在');
  assert.equal(works.includes('starlit-ember-sparks'), false, 'v3 的 12 顆 CSS 火星不得再存在');
  assert.equal(works.includes('starlit-ember-canvas'), false, '靜止時零成本：沒有在燒就沒有 canvas');
  // （id 本身還寫在 --ember-clip 上，那是膜的 CSS 要用的；元素本人不在。）
  assert.equal(works.includes('class="starlit-ember-clip"'), false, '靜止時也沒有 clipPath 元素');
  assert.equal(works.includes('<clipPath'), false, '靜止時 DOM 裡沒有任何 clipPath');
  // 關閉面只有：圖示、名稱、sr 提示——沒有簡介、沒有膠囊、沒有連結，
  // 也沒有 Ticket 40.3 拿掉的「01 / 類別」標籤。
  const faces = [...works.matchAll(/<button type="button" class="starlit-work starlit-ember-face"[^>]*>([^]*?)<\/button>/g)].map((m) => m[1]);
  assert.equal(faces.length, 5);
  for (const face of faces) {
    assert.match(face, /^<svg [^>]*class="starlit-ember-icon"/, '關閉面第一個是正式 inline SVG 圖示');
    assert.match(face, /^<svg [^>]*width="68" height="68"/, '圖示放大到 68（v3：像參考站的比例）');
    assert.match(face, /<span class="starlit-ember-name">[^<]+<\/span><span class="starlit-sr">/, '圖示後只有名稱，接著就是 sr 提示');
    assert.equal(/starlit-skills|<a |starlit-spark-summary/.test(face), false, '關閉面沒有膠囊、連結、簡介');
    // Ticket 40.3：膜上不得再有「01 / 類別」標籤（Ticket 28/39 的「01 02 03」
    // 釘子隨之作廢，這裡改釘「不存在」）。
    assert.equal(/starlit-kicker/.test(face), false, '膜上沒有 kicker 標籤');
    assert.equal(/\b0\d \//.test(face), false, `膜上沒有「0n /」編號：${face.slice(0, 200)}`);
  }
  assert.equal(works.includes('starlit-kicker'), false, 'Ticket 40.3/40.5：整個作品頁都沒有 starlit-kicker 了');
  for (const project of projects) {
    const icon = shell.emberIcon(project.id);
    assert.equal(icon.displayName, `ProjectIcon(${project.id === 'xuerong-clawd' ? 'xuerong' : project.id})`, '每個 id 使用 03 的正式圖標');
    assert.equal(shell.emberTint(project.id, 99).name, shell.EMBER_TINTS[project.id], '正式色票不依卡片索引');
  }
  // Ticket 40.1 — 燒開面最上方是「縮小的同一顆 專屬圖標 圖示 + 專案名稱」。
  const heads = [...works.matchAll(/<div class="starlit-ember-head"><svg ([^>]*)>[^]*?<\/svg><span class="starlit-ember-head-name">([^<]+)<\/span><\/div><p>/g)];
  assert.equal(heads.length, 5, '五張卡的燒開面都有頭列（圖示 + 名稱），頭列之後才是簡介');
  const attr = (tag: string, name: string) =>
    (tag.match(new RegExp(`${name}="([^"]*)"`)) ?? [, ''])[1] as string;
  for (const h of heads) {
    const size = Number(attr(h[1], 'width'));
    assert.ok(size >= 22 && size <= 26, `頭列圖示是縮小版 22–26px，實得 ${size}`);
    assert.equal(attr(h[1], 'height'), String(size), '頭列圖示是正方的');
  }
  assert.deepEqual(
    heads.map((h) => attr(h[1], 'class')),
    projects.map(() => 'starlit-ember-head-icon'),
    '頭列用的是膜上同一顆 專屬圖標（自己的 class，不搶 .starlit-ember-icon）',
  );
  assert.deepEqual(heads.map((m) => m[2]), projects.map((p) => p.title), '頭列的名稱就是專案名');
  // 燒開面：同一張卡裡、初始 hidden，含頭列、簡介、圖示連結。
  const opens = [...works.matchAll(/<div id="starlit-work-([a-z-]+)" class="starlit-ember-open" role="region" aria-label="[^"]+" data-open="false"><div class="starlit-ember-head">/g)];
  assert.deepEqual(opens.map((m) => m[1]), cards.map((m) => m[6]), '每張卡在同一格裡有自己的燒開面，初始 data-open=false（不用 hidden：燒開面留在版面上撐高度）');
  // Ticket 40.1：role=region 與 aria-label 留著，連結仍在 button 外（下面另有一條）。
  assert.equal(
    (works.match(/class="starlit-ember-open" role="region" aria-label="[^"]+"/g) ?? []).length,
    5,
    '燒開面仍是 role=region 且帶 aria-label',
  );
  // Ticket 41.1：膜（button）之後就沒有火了——火（canvas + clipPath）只有在
  // data-burning 的時候才會接在它後面。Ticket 44-B 在膜與卡片關閉之間插進一個
  // 空的 `.starlit-ember-spot`（純裝飾、aria-hidden、沒有子節點）。
  // 未開啟卡片沒有 canvas／clipPath 或持續外火。
  assert.equal(
    ((grid?.[0] ?? '').match(
      /<\/button><div class="starlit-ember-spot" aria-hidden="true"><\/div><\/div>/g,
    ) ?? []).length,
    5,
    '每張靜止的卡：膜之後只接聚光裝飾層就關閉卡片，沒有任何殘留的火層',
  );
  // Ticket 41.2：每張卡帶著自己 clipPath 的 id，膜靠它開洞。
  assert.deepEqual(
    [...works.matchAll(/--ember-clip:url\(#([a-z0-9-]+)\)/g)].map((m) => m[1]),
    projects.map((p) => `starlit-ember-clip-${p.id}`),
    '每張卡把自己的 clipPath id 寫進 --ember-clip（膜的 clip-path 讀它）',
  );
  // Ticket 41.6：節奏的三個常數就是票面的數字，而且是同一份（lib/ember-fire.ts）。
  assert.equal(shell.EMBER_BURN_MS, 3000, '燒穿 3.0s');
  assert.equal(shell.EMBER_FADE_MS, 800, '餘燼與火舌再 0.8s 淡出');
  assert.equal(shell.EMBER_FIRE_MS, 3800, 'canvas 掛載窗 = 3.0 + 0.8');
  assert.equal(shell.EMBER_CLOSE_MS, 1400, '收回 1.4s');
  assert.equal(shell.EMBER_BURN_MS, emberFire.EMBER_BURN_MS, '常數只有一份，shell 只是轉出去');
  assert.equal(shell.EMBER_CLOSE_MS, emberFire.EMBER_CLOSE_MS, '收回的常數也是同一份');
  // Ticket 41.7：火的顏色一定是從卡片自己的 --ember-tint* 讀出來的，不是色池常數。
  {
    const source = fs.readFileSync(`${root}components/starlit-shell.tsx`, 'utf8');
    const fire = source.slice(
      source.indexOf('function StarlitEmberFire'),
      source.indexOf('* Ticket 38 — a reveal block'),
    );
    assert.ok(fire.length > 2000, '找得到火的元件');
    for (const name of ['--ember-tint-hot', '--ember-tint-light', '--ember-tint-deep', '--ember-tint']) {
      assert.ok(fire.includes(`'${name}'`), `火的顏色要讀卡片的 ${name}`);
    }
    assert.ok(
      /getComputedStyle\(card\)/.test(fire),
      '四個明度是燒起來的時候從卡片 getComputedStyle 讀一次',
    );
    assert.equal(
      /EMBER_TINT_POOL|EMBER_TINTS\b/.test(fire),
      false,
      '火的元件不得直接摸色池（顏色只能來自卡片的 CSS 變數）',
    );
    // 落到 fallback 的那幾個十六進位字串是唯一允許出現的顏色，且必須是 fallback。
    for (const literal of fire.match(/#[0-9a-f]{6}/gi) ?? []) {
      assert.ok(
        new RegExp(`'--ember-tint[a-z-]*',\\s*'${literal}'`).test(fire),
        `${literal} 只能當 getComputedStyle 讀不到時的退路`,
      );
    }
    // Review round 2 — 焦邊與餘燼帶最後畫、火先畫（F1），而且兩層用相反的縮放
    // （焦邊不得被平滑糊掉）。這三件事是「看起來像燒過的紙」的全部理由。
    assert.ok(
      fire.indexOf('drawImage(flameBuffer') < fire.indexOf('drawImage(bandBuffer'),
      'F1：火先畫、焦邊與餘燼後畫，焦邊不得被自己的火蓋掉',
    );
    assert.match(fire, /imageSmoothingEnabled = false;\s*\n\s*ctx\.drawImage\(bandBuffer/, 'F1：焦邊那一層不平滑（燒焦的邊是硬邊）');
    assert.match(fire, /imageSmoothingEnabled = true;\s*\n\s*ctx\.drawImage\(flameBuffer/, '火那一層才平滑');
    // Review F2：收回從「現在的前緣」開始，不是從「整片都燒掉」。
    assert.ok(fire.includes('burnProgress.current'), 'F2：收回要讀燒到哪裡的進度');
    assert.match(fire, /startNorm\s*=\s*mode === 'close'/, 'F2：起點由模式決定');
    // Review F5：餘燼點是固定的一組，不是每幀重抽。
    assert.ok(fire.includes('makeEmberDots(rng, field)'), 'F5：餘燼點在燒起來的時候決定一次');
    assert.equal(/band\[Math\.floor\(rng\(\)/.test(fire), false, 'F5：不得每幀重抽餘燼點的位置');
    // Review F7：元件自己也要做能力偵測。
    assert.ok(fire.includes("CSS.supports('clip-path', 'url(\"#x\")')"), 'F7：不支援 clip-path: url() 就不掛這一層');
    // 41.1 掛載條件。這一條釘的是原始碼而不是輸出，因為元件在伺服器端一律回
    // null（沒有 window 就沒有 canvas），所以 renderToStaticMarkup 的結果無論
    // 掛載條件寫什麼都一樣——行為那一半在 harness（靜止時 0 個 canvas）。
    assert.ok(
      /\{burning \? \(\s*<StarlitEmberFire/.test(source),
      '41.1：火只在 data-burning 的那張卡上掛載',
    );
    // 41.7 的旋鈕預設是關的（專屬色政策沒有被改掉）。
    assert.ok(fire.includes('warmRamp(cardRamp, EMBER_FIRE_CORE_WARMTH)'), '火的 ramp 經過那個預設 0 的旋鈕');
    assert.equal(emberFire.EMBER_FIRE_CORE_WARMTH, 0.35, '暖核心旋鈕 0.35：使用者選了琥珀核心，外焰／焦邊／流光框仍是專屬色');

    // ---------------------------------------------------------------------
    // Ticket 45 — 方案 C：火改由片段著色器畫，v4 留著當退路。
    // ---------------------------------------------------------------------
    // 45.1 兩條路都在，而且 GL 那條排在前面（同一個 commit 裡先跑，交棒才會同步）。
    assert.ok(fire.includes('const lease = leaseEmberGl(canvas);'), '45.1：GL 這一條要去租一個 context');
    assert.ok(fire.includes("const ctx = canvas.getContext('2d');"), '45.3：v4 的 2D 火整個留著');
    assert.ok(
      fire.indexOf('leaseEmberGl(canvas)') < fire.indexOf("canvas.getContext('2d')"),
      '45.3：GL 的 effect 要宣告在 2D 之前（React 依宣告順序跑 layout effect）',
    );
    assert.ok(fire.includes('if (!glFailed.current) return;'), '45.3：GL 成功時 2D 那一條不得動同一張 canvas');
    assert.ok(
      fire.indexOf('glFailed.current = true;') < fire.indexOf('glFailed.current = false;'),
      '45.3：先假設拿不到 context，真的畫起來了才放行',
    );
    // 45.2 洞、節奏、餘燼、火星都還是 v4 的同一份：GL 只接手「畫火」。
    assert.ok(fire.includes('function emberFirePlan('), '45.2：兩條路共用同一份準備（洞、節奏、餘燼、亂數）');
    assert.equal(
      (fire.match(/emberFirePlan\(card, mode, seed, burnProgress\.current\)/g) ?? []).length,
      2,
      '45.2：GL 與 2D 都從同一個 plan 出發（各一次）',
    );
    assert.equal(
      (fire.match(/burnContours\(field, threshold, EMBER_PATH_STEP\)/g) ?? []).length,
      2,
      '45.2：洞仍然是 marching squares → clip-path，兩條路各一份，著色器不碰它',
    );
    // 45.1 加色混合：只能是 blendSetup()，不得退回一般 alpha 混合。
    assert.ok(fire.includes('gl.blendFunc(blend.src, blend.dst);'), '45.1：混合參數由 blendSetup() 決定');
    assert.equal(/gl\.blendFunc\(\s*gl\.SRC_ALPHA/.test(fire), false, '45.1：不得寫死一般 alpha 混合');
    assert.equal(emberFireGl.blendSetup().src, emberFireGl.GL_ONE, '45.1：來源係數 gl.ONE（預乘＝加色）');
    assert.equal(
      emberFireGl.blendSetup().dst,
      emberFireGl.GL_ONE_MINUS_SRC_ALPHA,
      '45.1：目的係數 gl.ONE_MINUS_SRC_ALPHA',
    );
    // 45.1 全解析度 × DPR，上限由 lib 決定（不得在元件裡另外寫一組數字）。
    // Ticket 47：量的盒子從「卡片」換成「卡片 ＋ 舔邊火的邊界」，所以上限現在是
    // 套在加大後的 canvas 上 —— 這一條就是 45.5 的寬度上限沒有被繞過去的釘子。
    assert.ok(
      fire.includes('clampGlSize(glWidth, glHeight, window.devicePixelRatio || 1)'),
      '45.1／47：解析度走 clampGlSize，而且是套在加大後的 canvas 上',
    );
    // Ticket 47 Review F1 之後這兩個是 `let`（ResizeObserver 會重算），釘子跟著改；
    // 值本身沒有變。Ticket 48 把舔邊火關掉，但 canvas 的盒子留著沒動。
    assert.ok(
      fire.includes('let glWidth = width + edgeMargin * 2;') &&
        fire.includes('let glHeight = height + edgeMargin * 2;'),
      '47：canvas 四邊各往外 EDGE_FLAME_MARGIN_PX',
    );
    assert.equal(emberFireGl.EMBER_GL_MAX_DPR, 2, '45.5：DPR 上限 2');
    assert.equal(emberFireGl.EMBER_GL_MAX_PIXEL_WIDTH, 900, '45.5：寬度上限 900px');
    // 45.1 距離場是 uniform texture，16 位元跨兩個通道，所以濾波交給著色器自己做
    //（硬體會把高位與低位分開內插，每個高位進位處都會斷掉）。
    assert.ok(fire.includes('packBurnField(field)'), '45.1：燒掉時間場打包成貼圖');
    assert.ok(
      /TEXTURE_MAG_FILTER, gl\.NEAREST/.test(fire),
      '45.1：距離場用 NEAREST，內插由著色器的 burnPrecise 自己做',
    );
    assert.ok(
      emberFireGl.EMBER_GL_FRAGMENT_SHADER.includes('float burnPrecise('),
      '45.1：著色器自己做雙線性（否則 2px 格子會直接畫出來）',
    );
    // 45.3 退路：context lost → 換一張 canvas 走 v4。
    assert.ok(fire.includes("canvas.addEventListener('webglcontextlost', onLost);"), '45.3：要聽 context lost');
    assert.ok(fire.includes('setGlBroken(true);'), '45.3：context lost 之後改走 2D');
    assert.ok(
      /key=\{`ember-fire-\$\{glBroken \? '2d' : 'gl'\}-\$\{mode\}`\}/.test(fire),
      '45.3：換路與換模式都要換 canvas 元素（還過 context 的 canvas 再也拿不到 context）',
    );
    assert.ok(fire.includes("canvas.dataset.fire = 'gl';"), '45.3：畫得成 GL 才寫 data-fire="gl"');
    assert.ok(fire.includes("canvas.dataset.fire = '2d';"), '45.3：走 2D 就寫 data-fire="2d"');
    // 45.5 context 預算與釋放。
    assert.equal(emberFireGl.EMBER_GL_MAX_CONTEXTS, 3, '45.5：同時最多 3 個 fire context');
    assert.ok(
      source.includes('if (emberGlBudget.live >= emberGlBudget.max) return null;'),
      '45.5：滿了就退回 2D，不跟 3D 舞台搶',
    );
    assert.ok(
      source.includes('if (extension) extension.loseContext();'),
      '45.5：釋放時真的呼叫 WEBGL_lose_context',
    );
    // Review F1 — 著色器編不起來的那一條，必須換一張新的 canvas 再交給 v4：
    // 一張已經給出過 WebGL context 的 canvas，`getContext('2d')` 從此永遠回 null，
    // 所以留在原地交棒等於「挖了洞卻一點火都沒有」。
    assert.ok(
      /if \(!flameProgram \|\| !pointProgram\) \{[\s\S]{0,1800}?setGlBroken\(true\);[\s\S]{0,20}?return;/.test(
        fire,
      ),
      'F1：著色器編不起來要 setGlBroken(true)，讓 v4 拿到一張乾淨的 canvas',
    );
    assert.equal(
      (fire.match(/setGlBroken\(true\);/g) ?? []).length,
      2,
      'F1：兩條走不下去的路（編譯失敗、context lost）都要換 canvas',
    );
    // Review 3(b) — 量測用的機關預設是關的。
    assert.ok(
      source.includes('const emberGlCapturing = () =>'),
      '3(b)：要有一個旗標決定「現在有沒有人在量」',
    );
    assert.ok(
      source.includes('emberGlContextAttributes(emberGlCapturing())'),
      '3(b)：context 屬性由旗標決定，不得寫死',
    );
    assert.equal(
      /preserveDrawingBuffer:\s*true/.test(source),
      false,
      '3(b)：元件裡不得寫死 preserveDrawingBuffer: true',
    );
    assert.equal(
      emberFireGl.emberGlContextAttributes().preserveDrawingBuffer,
      false,
      '3(b)：正式版的預設就是不保留 drawing buffer',
    );
    assert.ok(
      fire.includes('const capturing = emberGlCapturing();') &&
        fire.includes('const probeTexture = capturing ? gl.createTexture() : null;'),
      '3(b)：量測用的離屏 FBO 也掛在同一個旗標下',
    );
    assert.ok(fire.includes('lease.release();'), '45.5：卸載（＝燒完）時把 context 還回去');
    assert.ok(
      source.includes('__starlitEmberGl'),
      '45.5：context 數量要看得見（否則「靜止時零 context」無法驗證）',
    );
    // 45.4 著色器裡不得出現任何寫死的顏色。
    assert.equal(
      /vec3\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*\)/.test(emberFireGl.EMBER_GL_FRAGMENT_SHADER),
      false,
      '45.4：著色器的顏色只能從 uniform 來（uniform 是卡片自己的 --ember-tint*）',
    );
    assert.ok(emberFireGl.EMBER_GL_FRAGMENT_SHADER.includes('float fbm('), '45.1：火舌是 FBM');
  }
  // 框只用專屬色，不是七彩：::before 的 conic 只引用 --ember-tint 系列。
  {
    // `css` 在更下面才宣告，這裡自己讀一份。
    // 註解會提到被拿掉的東西（「`.starlit-text-link` 隨底部連結一起走了」），
    // 所以先把註解去掉，剩下的才是真正還生效的規則。
    const emberCss = fs
      .readFileSync(`${root}components/starlit-shell.css`, 'utf8')
      .replace(/\/\*[^]*?\*\//g, '');
    const rule = (sel: string) => (emberCss.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')) ?? [, ''])[1];
    for (const sel of ['.starlit-ember::before']) {
      const body = rule(sel);
      assert.ok(/conic-gradient\(/.test(body), `${sel} 有 conic-gradient`);
      assert.equal(/--ember-(gold|purple|blue|pink|indigo|yellow|fire)\b/.test(body), false, `${sel} 不得直接用色池的固定色（要用卡片自己的 --ember-tint*）`);
      // Ticket 01：同色系暗／亮／暗／亮；最後 deep 是首尾接合，不是第五段。
      assert.deepEqual(
        [...body.matchAll(/var\(--ember-tint-([a-z]+)\)/g)].map((match) => match[1]),
        ['deep', 'light', 'deep', 'light', 'deep'],
        `${sel} 只用作品專屬色的暗亮交替，首尾以暗色接合`,
      );
    }
    // Ticket 41：v3 的火整組從 CSS 消失，不留死碼。
    for (const gone of [
      '.starlit-ember-fire',
      '.starlit-ember-sparks',
      '--hole',
      'starlit-burn',
      'starlit-spark',
      'starlit-flame',
      'starlit-fire-turn',
      'starlit-fire-die',
    ]) {
      assert.equal(emberCss.includes(gone), false, `v3 的 ${gone} 不得留在 CSS`);
    }
    // 膜的洞現在是 clip-path，不是 mask。
    assert.equal(
      /mask-image/.test(rule('.starlit-work.starlit-ember-face')),
      false,
      '膜不再用 mask 開洞',
    );
    assert.match(
      rule(".starlit-ember[data-burning='true'] .starlit-work.starlit-ember-face"),
      /clip-path:\s*var\(--ember-clip\)/,
      '燒的時候膜戴上 canvas 每幀改寫的 clip path',
    );
    assert.match(
      rule('.starlit-ember-canvas'),
      /position:\s*absolute[^]*inset:\s*0[^]*pointer-events:\s*none/,
      'canvas 絕對定位蓋滿卡片且不吃滑鼠（41.1）',
    );
    // Ticket 45 — GL 的 canvas 是同一層：盒子、z 序、pointer 全部沿用上面那一條，
    // 這一條只准放「2D 沒有的那一點點」。不得自己另外定位，否則退回 2D 時火會位移。
    {
      const glRule = rule('.starlit-ember-gl');
      assert.ok(glRule.length > 0, '45：要有 .starlit-ember-gl 的規則');
      for (const forbidden of ['position:', 'inset:', 'z-index:', 'pointer-events:', 'mix-blend-mode:']) {
        assert.equal(
          glRule.includes(forbidden),
          false,
          `45：.starlit-ember-gl 不得自己寫 ${forbidden}（兩種火必須佔同一層）`,
        );
      }
      assert.ok(
        emberCss.indexOf('.starlit-ember-gl {') > emberCss.indexOf('.starlit-ember-canvas {'),
        '45：.starlit-ember-gl 排在 .starlit-ember-canvas 之後（它只是加一點東西）',
      );
    }
    // Ticket 41.8：reduced-motion 下不畫火，也不裁膜。
    const reduced = emberCss.slice(emberCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(reduced, /\.starlit-ember-canvas\s*\{\s*display:\s*none/, 'reduced-motion 不顯示 canvas');
    assert.match(reduced, /clip-path:\s*none/, 'reduced-motion 下膜不被裁');
    // Review F7（round 2）：舊的 WebKit 拼法要寫，而且要有一條「兩種都不吃」的退路。
    assert.match(
      rule(".starlit-ember[data-burning='true'] .starlit-work.starlit-ember-face"),
      /-webkit-clip-path:\s*var\(--ember-clip\)/,
      'F7：clip-path 要同時寫 -webkit- 前綴（Safari 13 以前只吃這個）',
    );
    {
      const at = emberCss.indexOf('@supports not ((clip-path:');
      assert.ok(at > 0, 'F7：要有一條 clip-path: url() 都不支援時的 @supports 退路');
      const block = emberCss.slice(at, at + 400);
      assert.match(block, /-webkit-clip-path/, 'F7：退路要同時考慮前綴的拼法');
      assert.match(block, /\.starlit-ember-canvas\s*\{\s*display:\s*none/, 'F7：不支援就不畫火');
      assert.match(block, /opacity:\s*0/, 'F7：不支援就直接把膜收掉（卡片仍然開得起來）');
      // 這一段必須排在 .starlit-ember-canvas 自己的規則「之後」：排在前面的話，
      // 任何「照選擇器找規則」的讀法（包含上面那一條）都會先撞到 display: none。
      assert.ok(
        at > emberCss.indexOf('.starlit-ember-canvas {'),
        'F7：@supports 退路要寫在 .starlit-ember-canvas 的本體規則之後',
      );
    }
    // Ticket 40.2：燒開面的連結列一左一右（只有一個時 space-between 就把它留在
    // 左邊）。真正的位置在 harness 量，這一條釘住「規則沒有被改回去」。
    assert.match(
      rule('.starlit-ember-open .starlit-work-links'),
      /justify-content:\s*space-between/,
      '燒開面連結列是 justify-content: space-between',
    );
    // Ticket 40.3：膜上的「01 / 類別」標籤連同它的規則一起移除。
    assert.equal(
      /\.starlit-ember-face\s+\.starlit-kicker\s*\{/.test(emberCss),
      false,
      '膜上 kicker 的 CSS 規則也要一起清掉（不留死碼）',
    );
    // Ticket 40.4：底部文字連結沒了，`.starlit-text-link` 也不該留著。
    assert.equal(/\.starlit-text-link/.test(emberCss), false, '.starlit-text-link 已無人使用，不得留在 CSS');
  }
  assert.equal(works.includes('starlit-spark-drawer'), false, '沒有整排下方的抽屜了');
  assert.equal(works.includes('role="list"'), false, '不用 role=list 包混合子元素');
  assert.equal(/<details|<summary/.test(works), false, '不再用 <details>');
  assert.equal((works.match(/starlit-skills/g) ?? []).length, 0, 'v2 作品卡不顯示技術膠囊（Ticket 39.11 解除 Ticket 28 的 3 組膠囊 pin）');
  // 連結不得在 button 裡：每個 <a href 前面最近的開頭一定是 starlit-ember-open，而不是 <button。
  for (const m of works.matchAll(/<a href=/g)) {
    const at = m.index ?? 0;
    const openStart = works.lastIndexOf('class="starlit-ember-open"', at);
    const buttonStart = works.lastIndexOf('<button', at);
    assert.ok(openStart > buttonStart, '連結在燒開面裡，不在膜（button）裡');
  }
  // 連結是純圖示按鈕：有 aria-label 與 title，GitHub / YouTube 不再附外連箭頭。
  assert.ok(/<a href="https:\/\/github\.com\/[^"]+" target="_blank" rel="noreferrer" data-kind="github" aria-label="GitHub" title="GitHub"><svg viewBox="0 0 16 16"[^]*?<\/svg><\/a>/.test(works), 'GitHub 連結 = 圖示 + aria-label，無箭頭');
  assert.ok(/data-kind="youtube" aria-label="[^"]+" title="[^"]+"><svg viewBox="0 0 24 24"[^]*?<\/svg><\/a>/.test(works), 'YouTube 連結 = 圖示 + aria-label，無箭頭');
  assert.equal(works.includes(SITE_COPY.zh.works.detail), true, '關閉的卡帶「了解作品」sr 提示');
  assert.equal(works.includes(SITE_COPY.zh.works.collapse), false, '初始沒有「收起」');
  // Ticket 39 裁示：可以同時開多張、再點一次收回——純函式釘住。
  const s = (...ids: string[]) => new Set(ids);
  const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) => [...a].sort().join(',') === [...b].sort().join(',');
  assert.ok(same(shell.emberToggle(s(), 'a'), s('a')), '關 → 開');
  assert.ok(same(shell.emberToggle(s('a'), 'b'), s('a', 'b')), '開第二張，第一張不熄（不限一次一張）');
  assert.ok(same(shell.emberToggle(s('a', 'b'), 'a'), s('b')), '再點一次收回自己，別張不動');
  assert.ok(same(shell.emberToggle(s('a', 'b', 'c'), 'b'), s('a', 'c')), '三張全開時收中間那張');
  // 圖示由 URL 決定，資料未改：GitHub 與 YouTube 各自帶 data-kind。
  assert.ok(/data-kind="github" aria-label="[^"]+" title="[^"]+"><svg viewBox="0 0 16 16"/.test(works), 'GitHub 連結帶 GitHub 圖示');
  assert.ok(/data-kind="youtube" aria-label="[^"]+" title="[^"]+"><svg viewBox="0 0 24 24"/.test(works), 'YouTube 連結帶 YouTube 圖示');
  assert.deepEqual(
    [shell.linkKind('https://github.com/x/y'), shell.linkKind('https://www.youtube.com/watch?v=1'), shell.linkKind('https://youtu.be/1'), shell.linkKind('https://example.com'), shell.linkKind('not a url')],
    ['github', 'youtube', 'youtube', 'link', 'link'],
    'linkKind 只認 host',
  );
}

const enContact = en({ introComplete: true, active: '2' });
assertTitleAccent('en', enContact);
assert.ok(enContact.includes(esc(SITE_COPY.en.contact.lead)));
for (const s of STARLIT_SOCIAL as { href: string }[])
  assert.ok(enContact.includes(`href="${s.href}"`), `missing ${s.href}`);
// Ticket 05：英文那一邊同樣不留 LinkedIn —— 入口、標籤與英文 handle 都不在了。
assert.equal(/linkedin/i.test(enContact), false, 'Ticket 05：英文聯絡頁／頁尾沒有 LinkedIn');
assert.equal(enContact.includes('Pin Hung Lin'), false, 'Ticket 05：英文 LinkedIn handle 也一起走');

// Only proper names with no official English form stay Chinese: the two event
// names, and（Ticket 02 / Spec R5）近況裡的遊戲與小說名——沒有核准的英文名就
// 保留中文，不自行命名。
const allowed = ['雲湧智生', '台灣未來祭', '星結奇緣', '偽典'];
for (const markup of [enAbout, enWorks, enContact]) {
  let rest = markup;
  for (const name of allowed) rest = rest.split(name).join('');
  const leftover = rest.match(/[一-鿿]+/g);
  assert.equal(leftover, null, `untranslated: ${leftover?.join(' ')}`);
}
// Chinese stays the default for callers that do not ask for a language.
assert.match(render({ introComplete: true, active: '0' }), /關於我/);
// Switching language keeps the chapter the visitor is on.
for (const active of ['0', '1', '2']) {
  const zh = render({ introComplete: true, active });
  const enSame = en({ introComplete: true, active });
  // Ticket 28-v2: the tabs carry no number any more, so the chapter is read
  // off the position of the selected tab instead.
  const activeIndex = (markup: string) =>
    [...markup.matchAll(/<button[^>]*class="starlit-tab"[^>]*>/g)].findIndex(
      (m) => m[0].includes('data-active'),
    );
  assert.equal(String(activeIndex(zh)), active);
  assert.equal(activeIndex(enSame), activeIndex(zh), 'same chapter stays');
}
// The top-right control area renders what the page puts there, and nothing
// when a caller has no controls (04 adds the sound button beside it).
const withControls = en({ introComplete: false, controls: 'SOUND-SLOT' });
assert.match(withControls, /starlit-controls/);
assert.match(withControls, /SOUND-SLOT/);
assert.equal(en({ introComplete: false }).includes('starlit-controls'), false);
console.log('starlit-shell: ok');
console.log('bilingual chapters / works / contact / controls slot: ok');

// ---------------------------------------------------------------------------
// The opening reading surface (ticket 08): one full-viewport scene, six beats
// reached by native scrolling, words only once the camera has settled.
// ---------------------------------------------------------------------------
const {
  StarlitReader,
  READING_BEATS,
  REVEAL_MS,
  REVEAL_TICK_MS,
  ENDING_SOCIAL,
  readingStepAt,
  revealAt,
  beatScrollTop,
  revealTokens,
  revealShare,
  beatCopy,
  keywordFromReveal,
  KEYWORD_LEAD,
  readingLines,
  splitKeyword,
  keywordSlot,
  wheelStep,
  wheelPixels,
  WHEEL_STEP,
  WHEEL_GAP_MS,
  WHEEL_GESTURE_MAX_MS,
  WHEEL_LINE,
  NO_WHEEL,
  readingKeyStep,
  readingKeydown,
  touchStep,
  TOUCH_STEP,
  easeIn,
  canLeaveBeat,
  leaveTarget,
} = shell;
const { introCopy, BRAND_NAME } = await import(
  '../lib/fantasy/starlit-intro.mjs'
);

// ---------------------------------------------------------------------------
// Scroll decides the beat and nothing else (user request, 2026-09-15, after
// https://elvismao.com/zh-Hant/): one screen of scroll per beat. How much of a
// beat is painted is a matter of time, not of scroll position — see `revealAt`
// below — so the visitor scrolls once and then reads with their hands still.
// ---------------------------------------------------------------------------
assert.equal(READING_BEATS, 6);
const at = (top: number, view = 800) => readingStepAt(top, view);

// A beat rests on its own screen boundary and owns the half screen either side
// of it, so the beat being read is the one nearest to where the scroller is.
assert.equal(at(0), 0);
assert.equal(at(399), 0, 'still the first scene just short of halfway');
assert.equal(at(400), 1, 'past halfway it is the next scene');
assert.equal(at(800), 1, 'and it rests exactly on its own screen boundary');
assert.equal(at(1199), 1);
assert.equal(at(1200), 2);

// Edges: never before the first beat, never past the last, and an unmeasured
// viewport is the first beat.
assert.equal(at(-500), 0);
assert.equal(at(99999), 5);
assert.equal(readingStepAt(400, 0), 0);

// Asking for a beat and scrolling to it by hand are the same pixel, and that
// pixel is half a screen from the nearest boundary, so no rounding of the real
// `scrollTop` can ever report the beat next door.
assert.equal(beatScrollTop(1, 800), 800);
for (let i = 0; i < READING_BEATS; i++) {
  assert.equal(at(beatScrollTop(i, 800)), i, `asking for beat ${i} lands on it`);
  assert.equal(at(beatScrollTop(i, 800) + 1), i, 'a pixel late is still the beat');
  assert.equal(at(beatScrollTop(i, 800) - 1), i, 'a pixel early too');
}
assert.equal(beatScrollTop(9, 800), beatScrollTop(5, 800), 'never past the end');
assert.equal(beatScrollTop(-3, 800), beatScrollTop(0, 800));
// The closing beat has to be reachable: six screens of scroll in a scroller one
// screen tall bottom out at exactly the last beat's resting place, so there is
// no tail to add and none to keep in step with this.
const css = fs.readFileSync(`${root}components/starlit-shell.css`, 'utf8');
assert.equal(
  css.includes('starlit-scroll-tail'),
  false,
  'the closing beat rests at the very bottom, so no extra length is needed',
);
assert.match(
  css,
  /\.starlit-scroll-step \{\s*height: 100%;/,
  'one screen of the scroller per beat, measured in the scroller itself',
);
// The declarations only: this file explains in a comment why snapping is out.
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
assert.equal(
  /scroll-snap/.test(rules),
  false,
  'mandatory snapping pins the reader to the beat it is on: a wheel notch is a '
    + 'fraction of the screen between two snap points and gets pulled back',
);
assert.equal(
  at((READING_BEATS - 1) * 800),
  5,
  'the very bottom of the scroller is the closing beat',
);

// ---------------------------------------------------------------------------
// The wheel: one gesture, one beat, in either direction (2026-09-16). A beat is
// a whole screen of scroll, so left to the plain scroller an ordinary mouse
// needed seven to ten notches to change anything at all, and a fast one crossed
// beats it never showed.
// ---------------------------------------------------------------------------
const notch = (
  delta: number,
  now: number,
  was = NO_WHEEL,
  step = 0,
) => wheelStep(delta, now, was, step);

// Below the threshold the reader stays put and keeps the part-gesture.
const small = notch(WHEEL_STEP - 1, 1000);
assert.equal(small.to, null, 'a tremor is not a beat');
assert.equal(small.carry, WHEEL_STEP - 1, 'but it is remembered');
// The rest of the same push crosses, and the leftover is dropped so the next
// beat costs another push.
const crossed = notch(2, 1010, small, 0);
assert.equal(crossed.to, 1);
assert.equal(crossed.carry, 0);
assert.equal(crossed.until, 1010 + WHEEL_GAP_MS);
assert.equal(crossed.cap, 1010 + WHEEL_GESTURE_MAX_MS);

/**
 * Plays a timestamped run of wheel events and returns the beats it asked for.
 *
 * The beat comes back out of the scroller, never from a variable the loop keeps
 * in step by hand: the handler writes `scrollTop` and reads it again, and the
 * `step` prop only catches up a render later. Tracking it by hand here assumed
 * the very thing that is not true in the component, which is why the old
 * version of this helper could not see the lagging-step bug at all.
 */
const wheelRun = (times: number[], delta: number, from = 0) => {
  const view = 800;
  let held = NO_WHEEL;
  let scrollTop = beatScrollTop(from, view);
  const beats: number[] = [];
  for (const t of times) {
    const m = wheelStep(delta, t, held, readingStepAt(scrollTop, view));
    held = { carry: m.carry, until: m.until, cap: m.cap };
    if (m.to !== null) {
      beats.push(m.to);
      scrollTop = beatScrollTop(m.to, view);
    }
  }
  return beats;
};

// Two deliberate pushes before any render: both used to count from the beat
// before the first one, so the second wrote the scrollTop it was already on and
// the screen never moved (`evidence/wheel-lag-red.json`: 0 → 720 → 720). The
// handler has to read the scroller, which is the only thing `goTo` updates
// synchronously — pinned on the source, because the pure function cannot see it.
const shellSource = fs.readFileSync(`${root}components/starlit-shell.tsx`, 'utf8');
const wheelEffect = shellSource.slice(
  shellSource.indexOf('const onWheel = (event: WheelEvent)'),
  shellSource.indexOf("el.addEventListener('wheel'"),
);
assert.match(
  wheelEffect,
  /readingStepAt\(el\.scrollTop, el\.clientHeight\)/,
  'the wheel must take its beat from the scroller, not from the lagging prop',
);
assert.equal(
  /on\.current/.test(shellSource),
  false,
  'the lagging copy of the beat is gone, not just unused',
);

// The window is an idle gap, not a fixed expiry. A trackpad tail that keeps
// firing every 100ms for 900ms is one gesture, however long it runs: with a
// fixed 450ms expiry this took a second beat at 500ms, mid-gesture, which is
// the skipping this whole rule exists to stop.
const tail = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900];
assert.deepEqual(wheelRun(tail, 400), [1], 'a 900ms momentum tail is one beat');
// Even a very fine tail (one event every 16ms for a second and a half).
const fine = Array.from({ length: 94 }, (_, i) => i * 16);
assert.deepEqual(wheelRun(fine, 120), [1, 2], 'a 1.5s tail is capped, not endless');
// The cap is what keeps it from locking: an unbroken stream still advances,
// once per cap, so a held wheel is never stuck on one beat.
const stream = Array.from({ length: 200 }, (_, i) => i * 50);
const beats = wheelRun(stream, 400);
assert.ok(beats.length >= 5, 'an unbroken stream must not lock the reader');
assert.deepEqual(beats, [1, 2, 3, 4, 5], 'and it walks the beats in order');
// Quiet for the gap, and the next push is a new gesture straight away.
assert.deepEqual(
  wheelRun([0, 100, 200, 200 + WHEEL_GAP_MS], 400),
  [1, 2],
  'a deliberate push after the wheel goes quiet is not swallowed',
);
// Backwards is the same rule, and a deliberate reverse is never swallowed for
// longer than the gap.
assert.equal(notch(-WHEEL_STEP, 5000, NO_WHEEL, 3).to, 2);
assert.deepEqual(
  wheelRun([0, 1000], -400, 3),
  [2, 1],
  'reversing after the gesture ends goes back a beat at a time',
);
// Never off either end, and hitting the end does not cost the visitor a push.
assert.equal(notch(-WHEEL_STEP, 5000, NO_WHEEL, 0).to, null);
assert.equal(notch(-WHEEL_STEP, 5000, NO_WHEEL, 0).until, 0);
assert.equal(notch(WHEEL_STEP, 5000, NO_WHEEL, READING_BEATS - 1).to, null);
// One beat per crossing, never the whole of a big delta.
assert.equal(notch(WHEEL_STEP * 40, 5000, NO_WHEEL, 0).to, 1);
// Lines and pages are read in the same pixels as everything else. One notch of
// a wheel that reports lines is three of them, which has to be a beat.
assert.equal(wheelPixels(100, 0, 720), 100);
assert.equal(wheelPixels(3, 1, 720), 3 * WHEEL_LINE);
assert.ok(3 * WHEEL_LINE >= WHEEL_STEP, 'one line-mode notch is one beat');
assert.equal(wheelPixels(1, 2, 720), 720);

// The reading keys ask for a beat too: mandatory snapping is gone, but the ~40px
// an arrow key scrolls was never worth a beat either (eighteen presses a beat).
assert.equal(readingKeyStep('ArrowDown', 0), 1);
assert.equal(readingKeyStep('PageDown', 0), 1);
assert.equal(readingKeyStep(' ', 2), 3);
assert.equal(readingKeyStep('ArrowUp', 3), 2);
assert.equal(readingKeyStep('PageUp', 3), 2);
assert.equal(readingKeyStep('Home', 4), 0);
// `readingKeyStep` stays dumb — End still *asks* for the last beat. What it
// gets is decided in one place, by `leaveTarget` below, which clamps it to
// ground already read. (Reviewer B: this line used to be the whole story, so
// the suite had the End jump written in as an expected value.)
assert.equal(readingKeyStep('End', 0), READING_BEATS - 1);
assert.equal(readingKeyStep('ArrowUp', 0), null, 'nowhere to go back to');
assert.equal(readingKeyStep('ArrowDown', READING_BEATS - 1), null);
assert.equal(readingKeyStep('Home', 0), null, 'already there');
for (const key of ['Tab', 'Escape', 'Enter', 'a', 'F5'])
  assert.equal(readingKeyStep(key, 2), null, `${key} belongs to the browser`);

// ---------------------------------------------------------------------------
// 鍵盤入口必須能接續（Coordinator 主預覽回報，2026-09-16）。原本閱讀鍵掛在
// reader 元素自己的 onKeyDown 上，而從 BODY 按空白鍵進介紹之後焦點還在 BODY，
// 所以之後的方向鍵全部失效。現在和滾輪、開場鍵一樣掛在 document 上。
// ---------------------------------------------------------------------------
const pressed = (
  key: string,
  step: number,
  extra: Record<string, unknown> = {},
) => {
  let prevented = false;
  let went: number | null = null;
  const took = readingKeydown(
    {
      key,
      preventDefault: () => {
        prevented = true;
      },
      ...extra,
    },
    step,
    (to: number) => {
      went = to;
    },
  );
  return { took, prevented, went };
};

assert.deepEqual(pressed('ArrowDown', 1), { took: true, prevented: true, went: 2 });
assert.deepEqual(pressed('ArrowUp', 2), { took: true, prevented: true, went: 1 });
assert.equal(pressed('End', 0).went, READING_BEATS - 1);
// 不是閱讀鍵的，原封不動還給瀏覽器。
for (const key of ['Tab', 'Escape', 'Enter', 'a', 'F5'])
  assert.deepEqual(pressed(key, 2), { took: false, prevented: false, went: null });
// 瀏覽器快捷鍵不被攔。
assert.equal(pressed('ArrowDown', 1, { ctrlKey: true }).took, false);
assert.equal(pressed('ArrowDown', 1, { metaKey: true }).took, false);
// 已經被 reader 元素自己的開場處理吃掉的，不再處理第二次。
assert.equal(pressed('ArrowDown', 1, { defaultPrevented: true }).took, false);
// 按住不放只算一次。放著不管時，自動重複會在每一段門檻一打開的瞬間被服務，
// 開場自己一段一段走完（Reviewer B 的「重要」Finding，findings-rev2-red.txt F2：
// 按住十秒直接走到結尾）。`readyAt` 攔不到，因為每個 repeat 都帶新的時間戳。
assert.equal(
  pressed('ArrowDown', 1, { repeat: true }).took,
  false,
  '按住方向鍵不會自己一段一段推進',
);
assert.equal(
  pressed('ArrowDown', 1, { repeat: false }).went,
  2,
  '真正的按下仍然有效',
);
// 焦點在按鈕／連結上時，Enter 與空白鍵是那顆按鈕的（activation 語意保留）……
const onButton = { closest: (sel: string) => (sel.includes('button') ? {} : null) };
assert.equal(pressed(' ', 1, { target: onButton }).took, false, '空白鍵還給按鈕');
assert.equal(pressed('Enter', 1, { target: onButton }).took, false, 'Enter 還給按鈕');
// ……但方向鍵不是任何按鈕的啟動鍵，焦點在哪裡都要能繼續讀。
assert.equal(
  pressed('ArrowDown', 1, { target: onButton }).went,
  2,
  '點過按鈕之後方向鍵仍然可用',
);
assert.equal(pressed(' ', 1, { target: null }).went, 2, '空白鍵在別處仍是推進');

// 這是紅燈的來源：閱讀鍵不能只掛在 reader 元素上，否則焦點不在它身上就全失效。
assert.equal(
  /onKeyDown=\{\s*atStart \? \(event\) => openingKeydown\(event, begin\) : undefined/.test(
    shellSource,
  ),
  true,
  'reader 元素只留開場的鍵盤入口，閱讀鍵不掛在它身上',
);
assert.equal(
  /onReadingKey/.test(shellSource),
  false,
  '元素專屬的閱讀鍵處理已經移除，不是留著沒用',
);
assert.match(
  shellSource.slice(shellSource.indexOf('const onKey = (event: KeyboardEvent)')),
  /const at = readingStepAt\(el\.scrollTop, el\.clientHeight\);\s*if \(at === 0\) openingKeydown\(event, begin\);\s*else readingKeydown\(event, at, \(to\) => goTo\(to, event\.timeStamp\)\);/,
  'document 上的鍵盤處理同時管開場與閱讀，段落取自捲軸所以不會過期',
);

// ---------------------------------------------------------------------------
// 閱讀門檻（Spec A01 / ticket 09）：整段播完才接受向下推進；顯字中向下不加速、
// 不跳段、不累積，向上仍可返回，開場不必等任何動畫。
// ---------------------------------------------------------------------------
assert.equal(canLeaveBeat(1, 0), false, '字才剛開始，不能往下');
assert.equal(canLeaveBeat(1, 0.99), false, '差一點也還是不能往下');
assert.equal(canLeaveBeat(1, 1), true, '整段播完才放行');
assert.equal(canLeaveBeat(3, 0.5), false);
// 開場是品牌標題，沒有逐句揭字：點擊／按鍵／滾輪隨時能進介紹，不等貓娘演完。
assert.equal(canLeaveBeat(0, 0), true, '開場永遠可以進介紹');
// Ticket 20: returning to a read beat must satisfy this visit's gate.
assert.equal(leaveTarget(1, 2, null, 100, Infinity), 1);
// Ticket 34-B：追求段 5000 → 4000ms，使用者要三詞輪轉快一點。值寫死，改了要同步。
assert.equal(shell.PURSUIT_REVEAL_MS, 4000, '追求段的顯字時長是 4000ms（Ticket 34-B）');
assert.equal(shell.revealAt(2000, shell.PURSUIT_REVEAL_MS), 0.5);
assert.equal(shell.revealAt(3999, shell.PURSUIT_REVEAL_MS) < 1, true);

// 門檻本身。回傳「實際會落到哪一段」，等於 from 就是不動。
// 往回與原地：照要求給。
assert.equal(leaveTarget(2, 1, null, 100, Infinity), 1, '往回不受限');
assert.equal(leaveTarget(2, 0, null, 100, Infinity), 0, '往回跨幾段都可以');
assert.equal(leaveTarget(2, 2, null, 100, Infinity), 2, '原地不算推進');
// 往下要「這一段已經讀完」。
assert.equal(leaveTarget(2, 3, null, 100, Infinity), 2, '還在顯字，不能往下');
assert.equal(leaveTarget(2, 3, 2, 100, 50), 3, '讀完了，而且是讀完之後才推的');
// 捲軸比 render 早一步：捲軸已經在一個還沒量過的段上，那一段當然還沒讀完。
assert.equal(leaveTarget(2, 3, 1, 100, 50), 2, '量到的是上一段，不放行');
// 推進當下的時間才算數，不是處理器什麼時候跑到。主執行緒卡住時，顯字中做出的
// 推進會在門檻打開之後才送達（probe-burst.json 實測單一事件晚 0.8–3.3 秒）。
assert.equal(leaveTarget(2, 3, 2, 40, 50), 2, '顯字中做出的推進，晚到也不算');
assert.equal(leaveTarget(2, 3, 2, 50, 50), 3, '門檻打開的那一刻起算');

// 一次只進一段未讀的：End 要到最後一段，也只會拿到下一段。這是 Reviewer A 與 B
// 共同的「重要」Finding——按一次 End 曾經直接從第 1 段落到第 5 段，中間三段的
// 顯字與技藝／自由／極限翻字從未發生（findings-rev2-red.txt F1）。
assert.equal(
  leaveTarget(1, READING_BEATS - 1, 1, 100, 50),
  2,
  'End 被夾到下一段，不跨過沒讀過的段',
);
assert.equal(leaveTarget(1, 4, 1, 100, 50), 2, 'PageDown 之類的多段請求同理');
// Previously read ground no longer bypasses the per-visit gate or skips beats.
assert.equal(leaveTarget(1, 5, 1, 100, 50), 2, 'End advances one beat');
assert.equal(leaveTarget(1, 5, null, 100, Infinity), 1, 'revisit remains gated');

// 四個入口都把事件自己的 timeStamp 傳進來。
for (const entry of [
  /goTo\(moved\.to, event\.timeStamp\)/,
  /readingKeydown\(event, at, \(to\) => goTo\(to, event\.timeStamp\)\)/,
  /goTo\(at \+ 1, event\.timeStamp\)/,
])
  assert.match(shellSource, entry, `推進入口要帶事件時間：${entry}`);
assert.match(
  shellSource,
  /if \(leavable\.current !== step\) readyAt\.current = performance\.now\(\);/,
  '門檻打開的時刻只記一次，之後的推進拿自己的時間跟它比',
);
// 存段號的理由：捲軸比 render 早一步。只留布林的話，推進之後、re-render 之前還
// 留著上一段「已讀完」的答案，連按兩次就會跳兩段（實測 keyboard-flow-red2.txt）。
assert.match(
  shellSource,
  /leavable\.current = step;/,
  '可離開的是「哪一段」，不是一個會過期的是非題',
);
assert.equal(
  /canLeave\.current/.test(shellSource),
  false,
  '會過期的布林已經移除，不是留著沒用',
);
assert.match(
  shellSource,
  /const rest = beatScrollTop\(step, el\.clientHeight\);\s*if \(!open && el\.scrollTop > rest\) \{\s*el\.scrollTop = rest;/,
  '就算有捲動從別處進來，onScroll 也要把捲軸拉回停點；只往回拉，向上仍可返回',
);

// 門檻真正立得住的地方：reader 不再是原生可捲的元素。主執行緒卡住時 Chrome 會
// 放棄等待 blocking 的 wheel listener 自己捲，JS 攔不住（probe-burst.json：十下
// 連滾全部 preventDefault，仍被捲到 1687）。沒有原生捲動就沒有這條路。
assert.match(
  fs.readFileSync(`${root}components/starlit-shell.css`, 'utf8'),
  /\.starlit-reader \{[^}]*overflow: hidden;/,
  'reader 不可原生捲動，位置只由 goTo 寫入',
);

// 因此觸控也要自己讀：手機沒有別的路進開場。一次滑動一段，剩下的不累積，兩個
// 方向同一條規則。
assert.ok(TOUCH_STEP > 0);
assert.deepEqual(touchStep(TOUCH_STEP - 1, 1), { to: null, carry: TOUCH_STEP - 1 });
assert.deepEqual(touchStep(TOUCH_STEP, 1), { to: 2, carry: 0 }, '往上滑，往下讀');
assert.deepEqual(touchStep(TOUCH_STEP * 9, 1), { to: 2, carry: 0 }, '一次滑動就是一段');
assert.deepEqual(touchStep(-TOUCH_STEP, 2), { to: 1, carry: 0 }, '往下滑，回上一段');
assert.deepEqual(touchStep(-TOUCH_STEP, 0), { to: null, carry: 0 }, '開場前面沒有了');
assert.deepEqual(touchStep(TOUCH_STEP, READING_BEATS - 1), { to: null, carry: 0 });
// 被擋下的那一次滾輪不會留下待處理的推進：`wheelStep` 交出 `to` 的同時就把
// carry 歸零並開始新的靜默視窗，所以讀完不會一次連跳好幾段。
const blocked = wheelStep(WHEEL_STEP * 5, 1000, NO_WHEEL, 1);
assert.equal(blocked.carry, 0, '拒絕與否，這一推都已經用掉了，不累積');
assert.equal(blocked.to, 2, '純函式仍回報意圖；擋下來的是 goTo');

// ---------------------------------------------------------------------------
// The reveal is timed, not scrubbed: once the camera has arrived, the beat
// paints itself over about two seconds and stops. Stopping the scroll does not
// stop the words, and the words never move the scene on.
// ---------------------------------------------------------------------------
assert.equal(REVEAL_MS, 2400, 'Ticket 25：一般顯字比原兩秒稍慢 20%');
assert.ok(REVEAL_TICK_MS > 0 && REVEAL_TICK_MS <= 100, '一格夠細也夠省');
assert.equal(revealAt(0), 0, '鏡頭剛停穩時一個字都還沒出');
assert.equal(revealAt(REVEAL_MS / 2), 0.5, '中段出一半');
assert.equal(revealAt(REVEAL_MS), 1, '兩秒後整段出完');
assert.equal(revealAt(REVEAL_MS * 3), 1, '出完就停住，不會再動');
assert.equal(revealAt(-50), 0);
const pace: number[] = [0, 400, 800, 1200, 1600, 2000].map((ms) =>
  Number(revealAt(ms)),
);
assert.deepEqual(pace, [...pace].sort((a, b) => a - b), '只會往前，不會倒退');
assert.equal(new Set(pace).size, pace.length, '每一格都真的多出一些字');

// A reveal unit is one Han character or one whole latin word, so a line wraps
// exactly where it always would and no word is ever cut in half.
assert.deepEqual(revealTokens('我追求'), ['我', '追', '求']);
assert.deepEqual(revealTokens('a full-stack engineer'), [
  'a',
  ' ',
  'full-stack',
  ' ',
  'engineer',
]);
assert.deepEqual(revealTokens(''), []);

// The blocks of a beat fill in reading order: the first finishes before the
// second starts, and at full reveal every unit of every block is painted.
assert.deepEqual(revealShare([3, 2], 0), [0, 0]);
assert.deepEqual(revealShare([3, 2], 0.4), [1, 0], 'top to bottom');
assert.deepEqual(revealShare([3, 2], 0.8), [3, 1]);
assert.deepEqual(revealShare([3, 2], 1), [3, 2], 'nothing is left behind');
assert.deepEqual(revealShare([3, 2], 9), [3, 2], 'out of range still fills');
assert.deepEqual(revealShare([3, 2], -9), [0, 0]);
assert.deepEqual(revealShare([], 1), []);
// 第二塊要等第一塊滿了才動，不是兩塊一起淡入。
assert.deepEqual(revealShare([3, 2], 0.6)[1], 0, '第一句沒完，第二句一個字都沒有');

// 每一句自己走參考站 `.type` 的 ease-in：慢起快收，不是等速爬。實測來源為
// 參考站公開 CSS（reference-home.css）的 `transition: background-size 2s ease-in`。
assert.equal(easeIn(0), 0);
assert.equal(easeIn(1), 1);
assert.ok(easeIn(0.5) < 0.5, 'ease-in 前段慢');
assert.equal(easeIn(-1), 0);
assert.equal(easeIn(9), 1);
// 一句走到一半的時間，字只出不到一半；但整句時間到就是整句出完。
const oneLine = (reveal: number) => revealShare([20], reveal)[0];
assert.ok(oneLine(0.5) < 10, '半段時間出不到半句');
assert.equal(oneLine(1), 20, '時間到整句出完，沒有殘留');
const curve = [0, 0.2, 0.4, 0.6, 0.8, 1].map(oneLine);
assert.deepEqual(curve, [...curve].sort((a, b) => a - b), '只會往前');

assert.deepEqual(readingLines('我追求\n\n技藝\n自由\n極限\n'), [
  '我追求',
  '技藝',
  '自由',
  '極限',
]);

// 2026-09-15：開場是品牌，四行詩移到結尾右欄。
const BRAND = introCopy('zh').waiting;
const POEM = introCopy('zh').ending;
const BACK = introCopy('zh').back;
const FRONT = introCopy('zh').front;
const reader = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(StarlitReader, {
      step: 0,
      text: '',
      settled: false,
      onStepChange: () => {},
      onEnter: () => {},
      ...props,
    }),
  );
/** The words as they read, with the reveal's own markup taken back off. */
const plain = (markup: string) =>
  markup.replace(
    /<span class="starlit-ink" data-on="(?:true|false)">([^<]*)<\/span>/g,
    '$1',
  );
/** One beat at a chosen reveal; the reader itself starts every beat at 0. */
const beat = (
  index: number,
  text: string,
  reveal: number,
  language: 'zh' | 'en' = 'zh',
) =>
  renderToStaticMarkup(
    createElement(
      'div',
      null,
      beatCopy(
        index,
        readingLines(text),
        SITE_COPY[language],
        () => {},
        reveal,
        false,
      ),
    ),
  );
/** How many reveal units a beat has painted, and how many are still waiting. */
const painted = (markup: string) =>
  [...markup.matchAll(/class="starlit-ink" data-on="true"/g)].length;
const unpainted = (markup: string) =>
  [...markup.matchAll(/class="starlit-ink" data-on="false"/g)].length;

const waiting = reader({ step: 0, text: BRAND, settled: true });
// Six beats exist as scroll targets whatever the visitor is reading.
assert.equal([...waiting.matchAll(/class="starlit-beat"/g)].length, 6);
// Only the beat being read, and only once the camera arrived, shows words.
assert.equal([...waiting.matchAll(/data-visible="true"/g)].length, 1);
assert.match(waiting, /data-beat="0"[^>]*data-visible="true"/);
assert.equal(
  reader({ step: 0, text: BRAND, settled: false }).includes(
    'data-visible="true"',
  ),
  false,
  'nothing is shown while the camera is still moving',
);


// The opening beat is the brand, not the old four-line poem.
assert.match(waiting, /class="starlit-open-brand"[^>]*>Royal Milktea Master</);
assert.equal(BRAND, BRAND_NAME);
for (const gone of ['將星空斟入玉觴', '靈感釀成嚮往'])
  assert.equal(waiting.includes(gone), false, `${gone} 已從開場移除`);
// Exactly one brand word in the document, whichever side draws it. With the
// scene's 3D word connected the heading is hidden from sight but still read.
assert.equal(
  [...waiting.matchAll(/Royal Milktea Master/g)].length,
  1,
  '開場只出現一次品牌字，不會和 3D 重複',
);
assert.match(waiting, /starlit-open-brand[^>]*data-in-3d="false"/);
const brandIn3D = reader({
  step: 0,
  text: BRAND,
  settled: true,
  brandIn3D: true,
});
assert.match(brandIn3D, /starlit-open-brand[^>]*data-in-3d="true"/);
assert.ok(
  brandIn3D.includes('Royal Milktea Master'),
  '3D 接上之後品牌字仍留在文件裡可朗讀',
);
assert.equal(
  [...brandIn3D.matchAll(/Royal Milktea Master/g)].length,
  1,
  '接上 3D 也只有一份品牌字',
);

// 正面介紹：四行完整，四個關鍵字加大加粗，最後一個（夢想家）另有星光。
const front = plain(beat(1, FRONT, 1));
for (const line of FRONT.split('\n')) {
  for (const piece of line.split(/(皇家奶茶大師|AI全端工程師|創作者|夢想家)/))
    if (piece) assert.ok(front.includes(piece), `缺少 ${piece}`);
}
const keywords = [
  ...front.matchAll(/<b class="starlit-keyword" data-star="(true|false)">([^<]+)</g),
];
assert.deepEqual(
  keywords.map((m) => m[2]),
  ['皇家奶茶大師', '創作者', 'AI全端工程師', '夢想家'],
);
assert.deepEqual(
  keywords.map((m) => m[1]),
  ['false', 'false', 'false', 'true'],
  '只有夢想家帶星光，而且要等它整個字都出來才掠過一次',
);

// Ticket 26：自介分兩組。問候是自己的一行，接著「我是…」，再空一組距之後才是
// 三句自介；組距是第二組第一行的標記，文案裡沒有多插一段空白朗讀。
assert.match(front, /^<div><p class="starlit-greeting">你好<\/p>/);
assert.match(
  front,
  /class="starlit-beat-line"[^>]*>(?:(?!<\/p>).)*皇家奶茶大師/,
  '問候的下一行是「我是 皇家奶茶大師。」',
);
const groupStarts = [
  ...front.matchAll(/<p class="starlit-beat-line" data-group="start">/g),
];
assert.equal(groupStarts.length, 1, '只有一個組距，就在三句自介的第一行');
assert.ok(
  front.indexOf('data-group="start"') > front.indexOf('皇家奶茶大師'),
  '組距在名字之後、三句自介之前',
);
assert.ok(
  front.indexOf('data-group="start"') < front.indexOf('創作者'),
  '組距落在「一位 創作者，」這一行',
);
assert.equal(
  front.includes('<p class="starlit-beat-line"></p>'),
  false,
  '留白是組距，不是插一段空白朗讀',
);
// 組距與問候的字級都由 CSS 給，而且問候比自介正文大。
assert.match(css, /\.starlit-greeting \{[^}]*font-size:/);
assert.match(
  css,
  /\.starlit-beat\[data-beat='1'\] \.starlit-beat-line\[data-group='start'\] \{[^}]*margin-top:/,
);
// 英文同樣是問候開頭的兩組。
const frontEn = plain(beat(1, introCopy('en').front, 1, 'en'));
assert.match(frontEn, /^<div><p class="starlit-greeting">Hello<\/p>/);
assert.equal(
  [...frontEn.matchAll(/data-group="start"/g)].length,
  1,
  '英文也只有一個組距',
);
// 星光是等字揭露完才掠過去的：只揭露到一半時，夢想家還沒有星。
assert.equal(
  /data-star="true"/.test(plain(beat(1, FRONT, 0.5))),
  false,
  '字還沒揭露完就不會先閃星光',
);

// 揭露只是上色：同一段在任何進度下的字與結構完全一樣，只有 data-on 改變，
// 所以換行位置不動、字的位置不動，也不可能有字被永遠裁掉。
const flat = (markup: string) =>
  markup
    .replace(/data-on="true"/g, 'data-on="false"')
    .replace(/data-star="true"/g, 'data-star="false"')
    .replace(/data-shimmer="true"/g, 'data-shimmer="false"');
// 「我追求」那一段的三個大字是刻意在同一位置輪替的，不在這個逐字比對裡，
// 它有自己下面那組測試。
for (const [index, text] of [
  [1, FRONT],
  [3, introCopy('zh').invitation],
  [4, introCopy('zh').cup],
  [5, POEM],
] as [number, string][]) {
  const none = beat(index, text, 0);
  const all = beat(index, text, 1);
  assert.equal(
    flat(all),
    flat(none),
    `第 ${index} 段的字在揭露前後必須是同一份標記（位置不會飄）`,
  );
  assert.equal(unpainted(all), 0, `第 ${index} 段在最後必須整段上色，不能留字`);
  assert.ok(painted(all) > 0, `第 ${index} 段要有字`);
  assert.equal(painted(none), 0, `第 ${index} 段一開始不先出字`);
  // 揭露到哪就畫到哪：同一個 reveal 永遠畫出同樣多的字。
  const half = painted(beat(index, text, 0.5));
  assert.ok(half > 0 && half < painted(all), `第 ${index} 段要逐字推進`);
  assert.ok(
    painted(beat(index, text, 0.3)) < half,
    `第 ${index} 段的字量隨揭露單調增加`,
  );
  assert.equal(
    painted(beat(index, text, 0.5)),
    half,
    `第 ${index} 段只由 reveal 決定，本身沒有自己的狀態`,
  );
}
// A keyword is lifted out of its own line, never rebuilt from pieces.
assert.deepEqual(splitKeyword('一名 AI全端工程師，', 'AI全端工程師'), [
  '一名 ',
  'AI全端工程師',
  '，',
]);
assert.deepEqual(splitKeyword('一個正在實現理想的夢想家', '夢想家'), [
  '一個正在實現理想的',
  '夢想家',
  '',
]);
assert.deepEqual(
  splitKeyword('沒有對應關鍵字的一行', 'nowhere'),
  ['沒有對應關鍵字的一行', '', ''],
  '對不上的關鍵字不會吃掉整行',
);
assert.deepEqual(splitKeyword('一行', undefined), ['一行', '', '']);

// 我勇於追求: the lead is the heading, and all three words are in the markup and
// read in order even though only one is painted at a time.
const back = plain(beat(2, BACK, 1));
// 「我勇於追求」是小引句，三個詞才是大粗字（Ticket 26 的用字）。
assert.match(back, /class="starlit-pursue-lead">我勇於追求</);
assert.equal(
  back.includes('starlit-beat-head'),
  false,
  '我勇於追求不再用大標題級別',
);
const words = [
  ...back.matchAll(/<span data-on="(?:true|false)"[^>]*>([^<]+)/g),
];
assert.deepEqual(
  words.map((m) => m[1]),
  ['技藝', '自由', '極限'],
);

// 三個大字隨揭露推進，依序一次，停在最後一個：沒有無限輪播。
const onWord = (reveal: number) => {
  const shown = [
    ...plain(beat(2, BACK, reveal)).matchAll(
      /<span data-on="(true|false)"[^>]*>([^<]+)</g,
    ),
  ];
  assert.deepEqual(
    shown.map((m) => m[2]),
    ['技藝', '自由', '極限'],
    '三個詞永遠都在標記裡，順序不變',
  );
  return shown.findIndex((m) => m[1] === 'true');
};
// 引句先讀完，三個詞才開始；之後一段揭露換一個，最後停在極限不再動。
assert.equal(onWord(0), -1, '一開始一個大字都還沒出');
const wordRun = [0.2, 0.4, 0.6, 0.8, 1].map(onWord);
assert.deepEqual(
  wordRun,
  [...wordRun].sort((a, b) => a - b),
  '三個詞只會依序往前，不會跳回去重播',
);
assert.equal(onWord(1), 2, '停在極限');
// 三個詞各佔揭露的同一份，所以中間那個不會被一口氣跳過。引句長度不同的
// 中英文也拿到一樣的分配。
assert.equal(keywordFromReveal(0, 3), -1);
assert.equal(keywordFromReveal(KEYWORD_LEAD - 0.01, 3), -1, '引句先讀完');
assert.equal(keywordFromReveal(KEYWORD_LEAD, 3), 0);
assert.equal(keywordFromReveal(1, 3), 2, '停在最後一個');
assert.equal(keywordFromReveal(9, 3), 2, '超出範圍仍停在最後一個');
assert.equal(keywordFromReveal(0.5, 0), -1, '沒有詞就沒有輪替');
const window_ = (i: number) =>
  [...Array(1001).keys()]
    .map((n) => n / 1000)
    .filter((r) => keywordFromReveal(r, 3) === i).length / 1000;
assert.deepEqual(
  [0, 1, 2].map((i) => Math.round(window_(i) * 100)),
  [27, 27, 27],
  '三個詞的揭露區間一樣寬',
);
for (const lang of ['zh', 'en'] as const)
  assert.deepEqual(
    [0.1, 0.4, 0.62, 0.84, 1].map((r) => {
      const m = [
        ...plain(beat(2, introCopy(lang).back, r, lang)).matchAll(
          /<span data-on="(true|false)"[^>]*>([^<]+)</g,
        ),
      ];
      return m.findIndex((x) => x[1] === 'true');
    }),
    [-1, 0, 1, 2, 2],
    `${lang}：三個詞依序一次，中間那個不會被跳過`,
  );
assert.equal(onWord(0.999), onWord(0.999), '停住就停住');
assert.ok(onWord(0.6) < 2, '不會一下子就跑到最後');
for (const reveal of [0.2, 0.4, 0.6, 0.8, 1])
  assert.ok(
    [...plain(beat(2, BACK, reveal)).matchAll(/<span data-on="true"/g)].length <=
      1,
    'one keyword at a time, in one place',
  );
assert.deepEqual([0, 1, 2].map((i) => keywordSlot(i, -1, 3)), [1, 2, 3]);
assert.deepEqual([0, 1, 2].map((i) => keywordSlot(i, 0, 3)), [0, 1, 2]);
assert.deepEqual([0, 1, 2].map((i) => keywordSlot(i, 1, 3)), [-1, 0, 1]);
assert.deepEqual(
  [0, 1, 2].map((i) => keywordSlot(i, 2, 3)),
  [-2, -1, 0],
  '最後一輪：極限在位，另外兩個已經離場，沒有人回到下方等待',
);
assert.deepEqual(
  [0, 1, 2].map((i) => keywordSlot(i, 99, 3)),
  [-2, -1, 0],
  '超出範圍仍停在最後一個',
);

// The closing beat is the contact landing: About on the left, My work on the
// right, and the three direct links underneath.
const ending = plain(beat(5, POEM, 1));
// 左欄：品牌、職稱、兩個入口；右欄：完整四行詩。
assert.match(ending, /class="starlit-ending-name">Royal Milktea Master</);
assert.match(
  ending,
  new RegExp(`class="starlit-ending-role">${SITE_COPY.zh.preview.role}<`),
);
for (const line of POEM.split('\n'))
  assert.ok(
    ending.includes(`class="starlit-poem-line">${line}<`),
    `結尾少了詩句 ${line}`,
  );
// 兩個入口和三個直接聯絡方式是控制項不是文案：一到結尾就在，不必先把字捲完。
const endingAtRest = beat(5, POEM, 0);
for (const label of [SITE_COPY.zh.preview.entryWorks, SITE_COPY.zh.preview.entryAbout])
  assert.ok(endingAtRest.includes(label), `${label} 一到結尾就可以按`);
assert.ok(endingAtRest.includes('mailto:leslie0907@gmail.com'));
assert.equal(POEM.split('\n').length, 4, '四行詩就是四行');
assert.match(ending, /class="starlit-ending-poem" aria-label=/);
// 結尾不再出現「歡迎聯繫」，也不再有那一段告別文案。
for (const gone of ['歡迎聯繫', 'starlit-invite', '歡迎走近我的世界'])
  assert.equal(ending.includes(gone), false, `${gone} 已從結尾移除`);
const entries = [
  ...ending.matchAll(/<button[^>]*aria-label="([^"]+)"[^>]*>([^<]+)/g),
];
// Ticket 35：關於我在左（pose 0），我的專案在右（pose 1）——順序就是 DOM 順序。
assert.deepEqual(
  entries.map((m) => m[2]),
  [SITE_COPY.zh.preview.entryAbout, SITE_COPY.zh.preview.entryWorks],
  '結尾入口左關於我、右我的專案（Ticket 35）',
);
assert.deepEqual(
  entries.map((m) => m[1]),
  [SITE_COPY.zh.preview.about, SITE_COPY.zh.preview.works],
);
// 對調只能是換列，不能改 pose：關於我永遠飛向 0、我的專案永遠飛向 1。
assert.deepEqual(
  shell.ENDING_ENTRIES.map((e: { label: string; pose: number }) => [e.label, e.pose]),
  [['entryAbout', 0], ['entryWorks', 1]],
  '入口與 pose 的配對不變',
);
assert.deepEqual(ENDING_SOCIAL, ['email', 'github', 'instagram']);
// 入口對到的章節（Ticket 35 對調後）：左邊關於我是 pose 0，右邊我的專案是 pose 1。
assert.deepEqual(
  shell.ENDING_ENTRIES.map((e: { pose: number }) => e.pose),
  [0, 1],
);
assert.deepEqual(
  [...ending.matchAll(/<button[^>]*data-pose="(\d)"/g)].map((m) => m[1]),
  ['0', '1'],
  'DOM 順序就是左關於我、右我的專案（Ticket 35）',
);
const endingLinks = [...ending.matchAll(/<a[^>]*href="([^"]+)"/g)].map(
  (m) => m[1],
);
assert.deepEqual(endingLinks, [
  'mailto:leslie0907@gmail.com',
  'https://github.com/RoyalMilkteaMaster',
  'https://www.instagram.com/royal_milktea_master/',
]);
// Nothing from the reference site leaked into the closing links.
assert.equal(ending.includes('elvismao'), false);

// Ticket 23 removes the complete visual hint row; input remains in the reader.
for (const step of [0, 2, 5]) {
  const markup = reader({ step, text: '', settled: true });
  assert.equal(markup.includes('starlit-reading-hint'), false);
}
for (const gone of [
  'CLICK',
  '星願 · 序詩',
  '星願 · 皇家奶茶大師',
  'ROYAL MILKTEA / PERSONAL UNIVERSE',
  'starlit-ornament',
])
  assert.equal(waiting.includes(gone), false, `${gone} must be gone`);

// English reads the same surface, including the two entries.
const enEnding = plain(beat(5, introCopy('en').ending, 1, 'en'));
assert.ok(enEnding.includes(SITE_COPY.en.preview.role));
assert.ok(enEnding.includes(SITE_COPY.en.preview.entryWorks));
assert.ok(enEnding.includes(SITE_COPY.en.preview.entryAbout));
for (const line of introCopy('en').ending.split('\n'))
  assert.ok(enEnding.includes(line), `English closing poem line: ${line}`);
assert.equal(
  /[一-鿿]/.test(enEnding),
  false,
  'the English closing beat is fully translated',
);
const enFront = plain(beat(1, introCopy('en').front, 1, 'en'));
assert.deepEqual(
  [...enFront.matchAll(/<b class="starlit-keyword"[^>]*>([^<]+)</g)].map(
    (m) => m[1],
  ),
  [...SITE_COPY.en.preview.keywords],
);
// 逐字揭露之後，每一行原文都還能一字不差地讀回來（英文不會被切在字中間）。
const asRead = (markup: string) => markup.replace(/<[^>]*>/g, '');
for (const line of introCopy('en').front.split('\n'))
  assert.ok(asRead(enFront).includes(line), `English front: ${line}`);
for (const line of introCopy('en').ending.split('\n'))
  assert.ok(asRead(enEnding).includes(line), `English ending: ${line}`);
for (const [index, text] of [
  [1, FRONT],
  [2, BACK],
  [3, introCopy('zh').invitation],
  [4, introCopy('zh').cup],
  [5, POEM],
] as [number, string][])
  for (const line of readingLines(text))
    assert.ok(
      asRead(plain(beat(index, text, 1))).includes(line),
      `第 ${index} 段的「${line}」要能原封不動讀回來`,
    );
// 英文換行後也一樣：全部揭露完沒有半個字留著。
assert.equal(unpainted(beat(1, introCopy('en').front, 1, 'en')), 0);
assert.equal(unpainted(beat(5, introCopy('en').ending, 1, 'en')), 0);

// The opening shell itself is the full-viewport state the CSS keys off.
assert.match(opening, /data-intro-complete="false"/);
assert.match(done, /data-intro-complete="true"/);
// The closing beat reads beside the figure, not over it: the coordinator saw
// 「歡迎聯繫」 land on the mouth and the two lines cross the lit chest.
// 結尾用整個寬度分兩欄；中央對齊只留給沒有人物的品牌與奶茶三幕。
const readerFive = reader({ step: 5, text: POEM, settled: true });
const beatFive = readerFive.slice(readerFive.indexOf('data-beat="5"'));
assert.match(beatFive, /data-place="full"/);
const places = [...readerFive.matchAll(/data-place="([a-z-]+)"/g)].map((m) => m[1]);
assert.deepEqual(places, [
  'center',
  'right-bottom',
  'left',
  'center',
  'center',
  'full',
]);
// Ticket 23 supersedes the old left-only ending / 851px geometry assertions.
// Actual multi-size DOM bounds and screenshots cover layout; no duplicate CSS math.
assert.match(css, /\.starlit-keyword \{[^}]*font-weight: 900;/);
// 矮螢幕（375×667、375×720、360×640）另有一段更緊的行距字級，但關鍵詞仍要明顯
// 大於正文：使用者要的是「必要時收緊」，不是「全部變一樣小」。門檻 820px 是量
// 出來的：結尾人物上緣 302@667、350@720、456@844，英文結尾固定在 y≈405–419
// 結束，交叉點約在 820，844 以上維持較大的字。
const shortIndex = css.indexOf('@media (width < 800px) and (max-height: 820px)');
assert.notEqual(shortIndex, -1, '矮螢幕要有自己的排版區塊');
const shortScreen = css.slice(shortIndex);
const shortSize = (selector: string) =>
  Number(
    shortScreen
      .slice(shortScreen.indexOf(selector))
      .match(/font-size: clamp\((\d+)px/)![1],
  );
const shortKeyword = shortSize(".starlit-beat[data-beat='1'] .starlit-keyword");
const shortLine = shortSize(".starlit-beat[data-beat='1'] .starlit-beat-line");
assert.ok(
  shortKeyword >= shortLine * 1.3,
  `矮螢幕的關鍵詞 ${shortKeyword}px 必須明顯大於正文 ${shortLine}px`,
);
assert.match(
  css,
  /\.starlit-keyword \{[^}]*font-weight: 900;/,
  '關鍵詞的粗細不隨螢幕改變',
);

// 奶茶那一幕是純星空，沒有人物要閃，所以窄視窗那條「收字級讓開人物」的理由對它
// 不成立；使用者兩句都要求加大。窄視窗的兩個字級都要比寬視窗的下限還大，而且
// 強調句必須明顯大於引句。
const narrowIndex = css.indexOf('@media (width < 800px), (aspect-ratio < 1/1) {', css.indexOf('.starlit-ending {'));
assert.notEqual(narrowIndex, -1, '窄視窗要有自己的排版區塊');
const narrow = css.slice(narrowIndex);
const cupSize = (selector: string, from = narrow) =>
  from
    .slice(from.indexOf(selector))
    .match(/font-size: clamp\((\d+)px, ([\d.]+)vw, (\d+)px\)/)!
    .slice(1)
    .map(Number);
const [cupLeadMin, cupLeadVw, cupLeadMax] = cupSize(
  ".starlit-beat[data-beat='4'] .starlit-beat-line {",
);
const [cupEmMin, cupEmVw, cupEmMax] = cupSize(
  ".starlit-beat[data-beat='4'] .starlit-beat-line:last-child {",
);
const clampAt = (min: number, vw: number, max: number, w: number) =>
  Math.min(max, Math.max(min, (vw / 100) * w));
for (const w of [390, 856]) {
  const lead = clampAt(cupLeadMin, cupLeadVw, cupLeadMax, w);
  const em = clampAt(cupEmMin, cupEmVw, cupEmMax, w);
  assert.ok(lead >= 20, `${w}px 寬的引句 ${lead}px 太小`);
  assert.ok(em >= 32, `${w}px 寬的強調句 ${em}px 太小`);
  assert.ok(em >= lead * 1.4, `${w}px 寬的強調句要明顯大於引句`);
  // 手機放得下：強調句不能橫向出框（引句允許自然換行）。寬度由文案自己算，
  // 全形字各佔一個字寬，半形的（Ticket 27 句尾的 `~`）佔一半，不是把每個
  // 字元都當成一個全形字寬。
  const emphasis = introCopy('zh').cup.split('\n').at(-1)!;
  const widthInEm = [...emphasis].reduce(
    (total, char) => total + (char.codePointAt(0)! < 0x2e80 ? 0.5 : 1),
    0,
  );
  assert.ok(
    widthInEm * em <= w - 40 || w > 500,
    `${w}px 寬放不下「${emphasis}」（${em}px）`,
  );
}

// ---------------------------------------------------------------------------
// Ticket 27: the closing line of the milk-tea beat carries a soft sweep of
// light, the same one 夢想家 already carries. It arrives with the words, not
// before them, it belongs to that one line, and it never becomes something the
// visitor has to wait out.
// ---------------------------------------------------------------------------
const CUP = introCopy('zh').cup;
const cupHalf = beat(4, CUP, 0.5);
const cupDone = beat(4, CUP, 1);
assert.equal(
  (cupDone.match(/data-shimmer="true"/g) || []).length,
  1,
  '流光只屬於最後那一句',
);
assert.match(cupDone, /data-shimmer="true"[^>]*>[^<]*<span[^>]*>值/);
assert.equal(
  cupHalf.includes('data-shimmer="true"'),
  false,
  '字還沒讀完就不該先發光',
);
// On the edge, not halfway to it: at 0.99 the line is one token short (10 of
// 11), so a one-token-early flag (`>= len - 1`) turns true here and this
// assertion catches it. 0.97 is still two tokens short and cannot tell them
// apart, which is why it is not the value used.
assert.equal(
  beat(4, CUP, 0.99).includes('data-shimmer="true"'),
  false,
  '差最後一個字也還不發光',
);
for (const [index, text] of [
  [3, introCopy('zh').invitation],
  [5, POEM],
] as [number, string][])
  assert.equal(
    beat(index, text, 1).includes('data-shimmer'),
    false,
    `第 ${index} 段不帶流光`,
  );
// 金屬流光：光在筆畫裡，不是字外面罩一層霧。
const shimmerAt = css.indexOf(
  ".starlit-beat[data-beat='4'] .starlit-beat-line[data-shimmer='true'] {",
);
assert.notEqual(shimmerAt, -1, '收尾句要有自己的金屬流光規則');
const shimmer = css.slice(shimmerAt);
const shimmerRule = shimmer.slice(0, shimmer.indexOf('}'));
assert.match(shimmerRule, /linear-gradient\(\s*102deg/, '斜向的金色漸層');
assert.match(shimmerRule, /var\(--starlit-gold\)/, '底色仍是同一個金色');
assert.equal(
  css.includes("[data-shimmer='true']::after"),
  false,
  '不再用字外面的霧塊',
);
// 文字裁切與透明字綁在同一個 @supports 裡：不支援裁切的瀏覽器不能被設成透明，
// 否則整句會不見。
const supportsAt = css.indexOf(
  '@supports (background-clip: text) or (-webkit-background-clip: text)',
);
assert.notEqual(supportsAt, -1, '裁切要放在 @supports 裡');
const supportsBlock = css.slice(supportsAt, css.indexOf('@keyframes starlit-gold-sweep'));
for (const needed of [
  'background-clip: text;',
  'color: transparent;',
  /animation: starlit-gold-sweep [\d.]+s [^;]* 1 both;/,
])
  typeof needed === 'string'
    ? assert.ok(supportsBlock.includes(needed), `@supports 內要有 ${needed}`)
    : assert.match(supportsBlock, needed, '掃一次，不循環');
assert.equal(
  css.indexOf('color: transparent;', shimmerAt) > supportsAt,
  true,
  '透明字只在支援裁切時才生效',
);
// reduced-motion 把 animation 關掉之後，亮帶停在框外，字仍是完整的金色。
const sweep = css.slice(css.indexOf('@keyframes starlit-gold-sweep'));
assert.match(shimmerRule, /background-position: 100% 0;/, '靜止狀態亮帶在框外');
assert.match(sweep.slice(0, sweep.indexOf('\n}')), /from \{\s*background-position: 100% 0;/);
// Ticket 27: the desktop poem sits 16px lower than Ticket 25 left it. Read the
// one rule, not the rest of the file: another rule picking up the same offset
// would otherwise keep this passing after the desktop one had gone back.
const poemRule = css.slice(css.indexOf(".starlit-beat[data-beat='5'] .starlit-ending-poem"));
assert.match(poemRule.slice(0, poemRule.indexOf('}')), /top: 72px;/);

// ---------------------------------------------------------------------------
// Regression (coordinator CUA, 2026-09-14): at the closing beat, click
// 「進入關於我」 and hit the brand ~80ms later. The old 700ms timer was keyed on
// the launch alone, so it still opened About about a second into the replay.
// ---------------------------------------------------------------------------
const { launchInFlight, armEntry, METEOR_MS } = shell;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

// A star belongs to the run that launched it.
assert.equal(launchInFlight({ pose: 0, run: 0 }, 0), 0);
assert.equal(launchInFlight({ pose: 1, run: 0 }, 0), 1);
assert.equal(launchInFlight(null, 0), null);
assert.equal(
  launchInFlight({ pose: 0, run: 0 }, 1),
  null,
  'a replay makes a star already in flight stale',
);
assert.equal(
  launchInFlight({ pose: 0, run: 1 }, 1),
  0,
  'a fresh star after the replay still flies',
);

// Driven in the order React drives it: arm on the value the effect is keyed
// on, tear down when that value changes, re-arm with the new value.
const entered: number[] = [];
const record = (pose: number) => entered.push(pose);
let launch: { pose: number; run: number } | null = { pose: 0, run: 0 };
let run = 0;
let teardown = armEntry(launchInFlight(launch, run), record, () => {
  launch = null;
});
assert.equal(typeof teardown, 'function', 'the entry was really armed');
await sleep(80); // the visitor hits the brand while the star is still flying
run = 1;
teardown?.();
teardown = armEntry(launchInFlight(launch, run), record, () => {
  launch = null;
});
assert.equal(teardown, undefined, 'the replay leaves nothing armed');
await sleep(METEOR_MS + 120);
assert.deepEqual(
  entered,
  [],
  'a replay must not be overtaken by the previous run’s shooting star',
);

// Control: with no replay the same code does open the chapter, so the check
// above is not passing for want of a timer.
launch = { pose: 1, run: 1 };
teardown = armEntry(launchInFlight(launch, 1), record, () => {
  launch = null;
});
await sleep(METEOR_MS + 120);
assert.deepEqual(entered, [1], 'an undisturbed star still opens its chapter');
teardown?.();

// The scroller itself carries nothing readable — that is what keeps the words
// from riding up and down with it. It is only scroll length, and the six beats
// live on a stage fixed over the scene.
const scroller = waiting.slice(
  waiting.indexOf('<section class="starlit-reader"'),
  waiting.indexOf('<div class="starlit-text-stage"'),
);
assert.equal(
  [...scroller.matchAll(/class="starlit-scroll-step"/g)].length,
  READING_BEATS,
  'one screen of scroll per beat',
);
assert.equal(
  /[一-鿿A-Za-z]/.test(scroller.replace(/<[^>]*>/g, '')),
  false,
  '捲動容器裡沒有任何字，所以字不會跟著捲動上下移動',
);
assert.match(waiting, /class="starlit-text-stage"/);
// 版面裡沒有暗幕或卡片：文字靠自己的陰影撐對比。
for (const veil of ['starlit-copy::before', 'starlit-veil', 'backdrop-filter'])
  assert.equal(css.includes(veil), false, `${veil} 已從閱讀層移除`);
assert.match(css, /\.starlit-copy-inner \{[^}]*text-shadow:/);
// 揭露只改上色，不改版面，所以不可能把換行後的字永遠裁掉。
assert.match(css, /\.starlit-ink \{[^}]*color: transparent;[^}]*text-shadow: none;/);
assert.match(
  css,
  /\.starlit-ink\[data-on='true'\] \{\s*color: inherit;\s*text-shadow: inherit;/,
);
assert.equal(
  /\.starlit-ink \{[^}]*opacity:/.test(css),
  false,
  '揭露不能用 opacity：合成層會把字整到整數像素，字就會位移 1px',
);
assert.equal(
  /\.starlit-ink \{[^}]*transition:/.test(css),
  false,
  '揭露不加轉場：節奏由 REVEAL_MS 的計時給，不必同時淡入上百個字的模糊陰影',
);
// 三個關鍵詞疊在同一個 grid 格子裡。用絕對定位的話子元素對本質寬度沒有貢獻，
// 盒子只會跟「我追求」一樣寬，overflow: hidden 就把「極限」切成「極」。
const keywordRule = css.slice(
  css.indexOf('.starlit-keywords > span {'),
  css.indexOf('.starlit-keywords > span[data-on'),
);
assert.match(keywordRule, /grid-area: 1 \/ 1;/);
assert.equal(keywordRule.includes('position: absolute'), false);
assert.match(back, /style="transform:translateY\(0%\)"[^>]*>極限</);

// Regression: the scene reports an empty string while the camera travels, so
// every beat has to render with no lines at all rather than throwing the reader
// out of the tree. 我追求 used to tokenise `undefined` and take the page down.
for (let index = 0; index < READING_BEATS; index++)
  for (const reveal of [0, 0.5, 1])
    assert.doesNotThrow(
      () => beat(index, '', reveal),
      `第 ${index} 段在鏡頭移動、還沒有文字時也要能算繪`,
    );
assert.match(
  reader({ step: 2, text: '', settled: false }),
  /class="starlit-keywords"/,
);

console.log('full-viewport reading: beats, reveal, keywords, entries: ok');
// ---------------------------------------------------------------------------
// Opening input: the first beat opens to a click, a tap or any ordinary key,
// not only the wheel (user request, 2026-09-14).
// ---------------------------------------------------------------------------
const { isOpeningKey, fromInteractive } = shell;

// Any ordinary key starts it — letters, space, Enter, the arrows.
for (const key of [
  'a',
  'Z',
  ' ',
  'Enter',
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'Home',
  '1',
  'F5',
])
  assert.equal(isOpeningKey({ key }), true, `${key} should start the opening`);

// Browser shortcuts and bare modifiers are left alone.
for (const key of ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'])
  assert.equal(isOpeningKey({ key }), false, `${key} must not start it`);
for (const held of ['ctrlKey', 'altKey', 'metaKey'])
  assert.equal(
    isOpeningKey({ key: 'r', [held]: true }),
    false,
    `${held} shortcuts must reach the browser`,
  );
assert.equal(
  isOpeningKey({ key: 'A', ctrlKey: false, altKey: false, metaKey: false }),
  true,
);

// Clicks and keys that came from a control belong to that control: the brand
// replay, the language switch and any link keep their own behaviour.
const like = (match: string | null) => ({ closest: () => match });
assert.equal(fromInteractive(like('<button>')), true);
assert.equal(fromInteractive(like(null)), false, 'the bare scene starts it');
assert.equal(fromInteractive(null), false);
assert.equal(fromInteractive({}), false, 'a target without closest is safe');
for (const selector of [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'label',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
]) {
  let asked = '';
  fromInteractive({
    closest: (sel: string) => {
      asked = sel;
      return null;
    },
  });
  assert.ok(asked.includes(selector), `${selector} must be excluded`);
}

for (const language of ['zh', 'en'] as const) {
  assert.equal(reader({ language, step: 0, text: POEM, settled: true }).includes('starlit-reading-hint'), false);
}

console.log('replay cancels a shooting star already in flight: ok');
// The handler itself, not just the predicates. A key the opening takes must
// also be kept from the browser: the native scroll of Space, the arrows and
// Page Down interrupts the smooth scroll to beat one, which is why
// ArrowDown left the visitor on beat zero in the coordinator's run.
const { openingKeydown } = shell;
type FakeKey = {
  key: string;
  repeat?: boolean;
  defaultPrevented?: boolean;
  target?: unknown;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
};
const press = (event: FakeKey) => {
  const seen = { prevented: 0, began: 0 };
  const took = openingKeydown(
    { ...event, preventDefault: () => void seen.prevented++ },
    () => void seen.began++,
  );
  return { ...seen, took };
};

// Every scrolling key is taken from the browser exactly once, and starts once.
for (const key of ['ArrowDown', 'ArrowUp', ' ', 'PageDown', 'PageUp', 'End'])
  assert.deepEqual(
    press({ key }),
    { prevented: 1, began: 1, took: true },
    `${key} must start the opening and not scroll natively`,
  );
// Keys with no scrolling of their own behave the same way.
for (const key of ['a', 'Enter', '7'])
  assert.deepEqual(press({ key }), { prevented: 1, began: 1, took: true }, key);

// Refused keys are left completely alone — nothing prevented, nothing started.
const untouched = { prevented: 0, began: 0, took: false };
for (const key of ['Tab', 'Escape', 'Shift', 'Meta'])
  assert.deepEqual(press({ key }), untouched, `${key} stays the browser's`);
for (const held of ['ctrlKey', 'altKey', 'metaKey'])
  assert.deepEqual(
    press({ key: 'r', [held]: true }),
    untouched,
    `${held} shortcuts must reach the browser untouched`,
  );
assert.deepEqual(
  press({ key: 'Enter', target: { closest: () => '<button>' } }),
  untouched,
  'Enter on the brand or the language button belongs to that button',
);
assert.deepEqual(
  press({ key: ' ', target: { closest: () => '<button>' } }),
  untouched,
  'and so does the space bar',
);
// …but only those two. Refusing every key whenever a control had focus made the
// opening unreachable from the keyboard after one click on the language switch:
// focus stays on that button, and nothing entered the introduction at all
// (Coordinator, reproduced: `ticket-09/findings-rev2-red.txt` F4). Spec says any
// ordinary key enters the introduction, and an arrow is not an activation key.
for (const key of ['ArrowDown', 'PageDown', 'End', 'a'])
  assert.deepEqual(
    press({ key, target: { closest: () => '<button>' } }),
    { prevented: 1, began: 1, took: true },
    `${key} 不是按鈕的啟動鍵，焦點在按鈕上時仍要能進介紹`,
  );

// Holding a key repeats the keydown. A repeat must not start again: re-issuing
// the scroll would restart the smooth scroll, and it must never reach beat two.
assert.deepEqual(
  press({ key: 'ArrowDown', repeat: true }),
  untouched,
  'a held key starts the opening once, not once per repeat',
);
// The reader's own handler runs before the document one; the second must not
// act on a keystroke the first already took.
assert.deepEqual(
  press({ key: 'ArrowDown', defaultPrevented: true }),
  untouched,
  'a keystroke already taken is not taken twice',
);

// One press, one start: the same event object through both handlers begins
// exactly once, so it lands on beat one rather than being scrolled past.
let begun = 0;
const shared = {
  key: 'ArrowDown',
  defaultPrevented: false,
  preventDefault() {
    shared.defaultPrevented = true;
  },
};
openingKeydown(shared, () => void begun++);
openingKeydown(shared, () => void begun++);
assert.equal(begun, 1, 'the reader and the document handler start it once');
assert.equal(shared.defaultPrevented, true, 'the browser never scrolls it');

console.log('opening starts on click, tap or any ordinary key: ok');
console.log('opening keydown takes the key from the browser, once: ok');

// Keep the mounted per-visit/timing regression in the usual test command.
// Browser layout regression: actual reader markup and stylesheet in fixed-size
// viewports. These checks fail for the former zero-width column and media gaps;
// no CSS coordinates or camera projection formulas are reproduced here.
{
  const { execFileSync } = await import('node:child_process');
  const { tmpdir, homedir } = await import('node:os');
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-layout-'));
  const cases = [[700,700,false],[760,700,false],[799,700,false],
    [800,700,true],[900,800,true],[1440,1441,false]];
  const markup = Object.fromEntries(['zh','en'].map(language => [language,
    `<div class="starlit">${reader({step:5, text:introCopy(language).ending, settled:true, language})}</div>`]));
  const script = `
    const cases = ${JSON.stringify(cases)};
    const markup = ${JSON.stringify(markup)};
    const css = ${JSON.stringify(css)};
    const check = (ok, why) => { if (!ok) throw Error(why); };
    let pending = cases.length * 2;
    for (const [w,h,desktop] of cases) for (const lang of ['zh','en']) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+w+'px;height:'+h+'px';
      frame.onload = () => {
        try {
          const d=frame.contentDocument, win=frame.contentWindow;
          const poem=d.querySelector('.starlit-ending-poem');
          const brand=d.querySelector('.starlit-ending-brand');
          const p=poem.getBoundingClientRect(), b=brand.getBoundingClientRect();
          const label=lang+' '+w+'x'+h+': ';
          check(p.width>100 && b.width>100, label+'both columns have real width');
          check(p.left>=0 && p.right<=w+1 && p.bottom<=h+1, label+'poem fits viewport');
          check(win.getComputedStyle(poem).position === (desktop?'absolute':'static'), label+'correct media mode');
          if(desktop) {
            check(b.right < p.left && p.left>w/2, label+'brand left, poem right');
            for(const line of poem.querySelectorAll('.starlit-poem-line')) {
              check(win.getComputedStyle(line).whiteSpace==='nowrap',label+'desktop line does not wrap');
              const range=d.createRange();range.selectNodeContents(line);
              check(range.getBoundingClientRect().right<=w+1,label+'actual text fits');
            }
          } else {
            check(win.getComputedStyle(d.querySelector('[data-beat="5"] .starlit-copy')).alignContent==='start',label+'narrow top reading area');
            if(w<800) check(p.width<=220.1,label+'narrow landscape avoids held star');
          }
          if(--pending===0 && !document.getElementById('result').textContent.startsWith('FAIL'))
            document.getElementById('result').textContent='PASS 12 real CSS layouts';
        } catch(e) { document.getElementById('result').textContent='FAIL '+e.message; }
      };
      // The page carries its own lang (layout.tsx sets it), so the language's
      // own type sizes are part of what this measures — the same srcdoc the
      // Ticket 26 introduction harness below already uses.
      frame.srcdoc='<!doctype html><html lang="'+(lang==='zh'?'zh-Hant':'en')+'"><meta charset="utf-8"><style>body{margin:0}'+css+'</style>'+markup[lang];
      document.body.append(frame);
    }
  `;
  const file=join(dir,'layout.html');
  fs.writeFileSync(file, '<!doctype html><pre id="result">PENDING</pre><script>'+script.replaceAll('</script','<\\/script')+'</script>');
  const output=execFileSync(process.env.CHROME_BIN ?? join(homedir(),'.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    ['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--virtual-time-budget=1000','--dump-dom',pathToFileURL(file).href],
    {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
  const result=output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
  assert.equal(result,'PASS 12 real CSS layouts');
  console.log(result);
}

// Ticket 26 introduction grouping, measured in the real stylesheet: the
// greeting reads larger than the lines under it, the gap between the two groups
// is bigger than the gap inside a group, and nothing runs off the window.
{
  const { execFileSync } = await import('node:child_process');
  const { tmpdir, homedir } = await import('node:os');
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-intro-layout-'));
  const cases = [[1707,735],[900,800],[390,844]];
  const markup = Object.fromEntries(['zh','en'].map(language => [language,
    `<div class="starlit">${reader({step:1, text:introCopy(language).front, settled:true, language})}</div>`]));
  const script = `
    const cases = ${JSON.stringify(cases)};
    const markup = ${JSON.stringify(markup)};
    const css = ${JSON.stringify(css)};
    const check = (ok, why) => { if (!ok) throw Error(why); };
    let pending = cases.length * 2;
    for (const [w,h] of cases) for (const lang of ['zh','en']) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+w+'px;height:'+h+'px';
      frame.onload = () => {
        try {
          const d=frame.contentDocument, win=frame.contentWindow;
          const label=lang+' '+w+'x'+h+': ';
          const greeting=d.querySelector('.starlit-greeting');
          const lines=[...d.querySelectorAll('[data-beat="1"] .starlit-beat-line')];
          check(!!greeting && lines.length===4, label+'一句問候加四行自介');
          const size=el=>parseFloat(win.getComputedStyle(el).fontSize);
          check(size(greeting)>size(lines[0]), label+'問候比自介正文大');
          const gap=(a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().bottom;
          const between=gap(lines[0],lines[1]);
          const inside=gap(lines[1],lines[2]);
          check(between>inside, label+'兩組之間比組內的行距寬');
          check(lines[1].dataset.group==='start', label+'組距掛在第二組第一行');
          const box=d.querySelector('[data-beat="1"] .starlit-copy-inner').getBoundingClientRect();
          check(box.left>=0 && box.right<=w+1, label+'自介沒有超出左右邊界');
          check(box.top>=0 && box.bottom<=h+1, label+'自介沒有超出上下邊界');
          for(const line of [greeting,...lines]) {
            const range=d.createRange(); range.selectNodeContents(line);
            const r=range.getBoundingClientRect();
            check(r.left>=-0.5 && r.right<=w+1, label+'字沒有被裁掉');
          }
          if(--pending===0 && !document.getElementById('result').textContent.startsWith('FAIL'))
            document.getElementById('result').textContent='PASS 6 introduction layouts';
        } catch(e) { document.getElementById('result').textContent='FAIL '+e.message; }
      };
      frame.srcdoc='<!doctype html><html lang="'+(lang==='zh'?'zh-Hant':'en')+'"><meta charset="utf-8"><style>body{margin:0}'+css+'</style>'+markup[lang];
      document.body.append(frame);
    }
  `;
  const file=join(dir,'intro-layout.html');
  fs.writeFileSync(file, '<!doctype html><pre id="result">PENDING</pre><script>'+script.replaceAll('</script','<\\/script')+'</script>');
  const output=execFileSync(process.env.CHROME_BIN ?? join(homedir(),'.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    ['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--virtual-time-budget=1000','--dump-dom',pathToFileURL(file).href],
    {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
  const introResult=output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
  assert.equal(introResult,'PASS 6 introduction layouts');
  console.log(introResult);
}


// ---------------------------------------------------------------------------
// Ticket 28: faster gold sweep, a continuous entry, and the chapters in the
// header.
// ---------------------------------------------------------------------------
// 只有掃光變快；夢想家那顆星維持原速。
assert.match(css, /animation: starlit-gold-sweep 2\.1s ease-in-out 0\.2s 1 both;/);
assert.match(css, /animation: starlit-star-sweep 2\.6s ease-in-out 0\.2s 1 both;/);

// 進入內容的尺寸變化是同一個 grid 的軌道在動，不是換一種定位方式：開場的舞台
// 已經是可內插的百分比軌道，而且不再被絕對定位抽離。
assert.match(css, /\.starlit\[data-intro-complete='false'\] \.starlit-main \{\s*grid-template-columns: 100% 0%;/);
const openingLayers = css.slice(css.indexOf(".starlit[data-intro-complete='false'] .starlit-content,"));
assert.equal(
  openingLayers.slice(0, openingLayers.indexOf('}')).includes('.starlit-stage'),
  false,
  '開場舞台不再是絕對定位的一層',
);
const chapterGrid = css.slice(css.indexOf("Ticket 25: only the desktop content pages"));
assert.match(chapterGrid, /grid-template-columns: 33\.3333% 66\.6667%;/, '最終仍是 1:2');
assert.match(
  chapterGrid,
  /transition: grid-template-columns 1\.25s ease, padding-top 1\.25s ease;/,
  '尺寸變化要走完 chapterMorph 的 1.25 秒',
);
assert.equal(
  chapterGrid.includes('prefers-reduced-motion: no-preference'),
  true,
  'reduced-motion 直接到定位',
);

// 分頁整組在 header、Language 左邊，內容欄不再有第二組，仍然只有一個 tablist。
const chapters = render({ introComplete: true, active: '1', controls: 'LANG-SLOT' });
const header = chapters.slice(
  chapters.indexOf('<header'),
  chapters.indexOf('</header>'),
);
assert.equal((header.match(/role="tab"/g) || []).length, 3, '三個分頁都在 header');
assert.equal(
  (header.match(/\/關於我|\/我的作品|\/聯絡資訊/g) || []).length,
  3,
  'header 裡就是這三個斜線分頁',
);
assert.ok(
  header.indexOf('starlit-nav') < header.indexOf('starlit-controls'),
  'tablist 排在 Language 左邊',
);
assert.equal(
  chapters.slice(chapters.indexOf('<main')).includes('role="tab"'),
  false,
  '內容原來的位置不重複顯示',
);
assert.equal(
  (chapters.match(/role="tablist"/g) || []).length,
  1,
  '只有一組 tablist',
);
// panel 留在內容欄。tab 與 panel 的 aria 對應由 Base UI 在掛載後接起來（伺服器
// 端輸出還沒有 `aria-labelledby`），所以那一段用真實瀏覽器驗（見
// followup-28/entry-probe.cjs 的 tabs 檢查）。
assert.match(
  chapters.slice(chapters.indexOf('<main')),
  /role="tabpanel"[^>]*class="starlit-chapter"/,
);
// 開場（含結尾）完全沒有分頁。
assert.equal(
  render({ introComplete: false, controls: 'LANG-SLOT' }).includes('starlit-nav'),
  false,
  '開場所有段都不出現分頁',
);


// ---------------------------------------------------------------------------
// Ticket 28 v3 — the shell frame itself, measured in the real stylesheet.
// Reviewer B 的三項都是「狀態限定漏寫」：開場舞台吃到內容頁的 ≤850px 高度、
// 開場吃到內容頁的 `margin-left: 0`、浮動 header 的讓位 padding 綁在
// `data-stage` 上。這個 harness 只載入 starlit-shell.css（沒有 app/globals.css），
// 所以「開場 Language 靠右」若還成立，就證明它不依賴那份全域 header 規則。
// ---------------------------------------------------------------------------
{
  const { execFileSync } = await import('node:child_process');
  const { tmpdir, homedir } = await import('node:os');
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-frame-'));
  const frames = [
    { name: 'opening-desktop', w: 1707, h: 735,
      markup: render({ introComplete: false, stage: 'STAGE', controls: 'LANG' }, 'COPY') },
    { name: 'opening-phone', w: 390, h: 844,
      markup: render({ introComplete: false, stage: 'STAGE', controls: 'LANG' }, 'COPY') },
    { name: 'chapters-no-stage', w: 1707, h: 735,
      markup: render({ introComplete: true, active: '0', controls: 'LANG' }) },
    { name: 'chapters-with-stage', w: 1707, h: 735,
      markup: render({ introComplete: true, active: '0', stage: 'STAGE', controls: 'LANG' }) },
  ];
  const script = `
    const frames = ${JSON.stringify(frames)};
    const css = ${JSON.stringify(css)};
    const check = (ok, why) => { if (!ok) throw Error(why); };
    let pending = frames.length;
    for (const f of frames) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+f.w+'px;height:'+f.h+'px';
      frame.onload = () => {
        try {
          const d=frame.contentDocument, win=frame.contentWindow, label=f.name+': ';
          // 用 iframe 自己的可視寬高，捲軸佔掉的幾 px 不該被算成版面錯誤。
          const vw=d.documentElement.clientWidth, vh=d.documentElement.clientHeight;
          const box=(sel)=>{const el=d.querySelector(sel);return el&&el.getBoundingClientRect();};
          const main=box('.starlit-main'), controls=box('.starlit-controls');
          const padTop=win.getComputedStyle(d.querySelector('.starlit-main')).paddingTop;
          if (f.name.startsWith('opening')) {
            const stage=box('.starlit-stage');
            // 開場的舞台在任何寬度都是整個視窗（B 的阻擋項）。
            check(Math.abs(stage.height-vh)<1.5, label+'開場舞台要滿高，實得 '+stage.height+'/'+vh);
            check(Math.abs(stage.width-vw)<1.5, label+'開場舞台要滿寬，實得 '+stage.width+'/'+vw);
            check(padTop==='0px', label+'開場不留 header 讓位，實得 '+padTop);
            // 右上定位由這個樣式表自己決定，沒有 app/globals.css 也成立。
            if (f.w>850) check(controls.right>vw*0.8, label+'開場 Language 要靠右，實得 '+controls.right+'/'+vw);
          } else {
            check(padTop==='90px', label+'內容頁要留 90px 給浮動 header，實得 '+padTop);
            check(Math.abs(main.top)<1.5, label+'main 仍是整個視窗高，top 實得 '+main.top);
            const content=box('.starlit-content');
            check(content.top>=89, label+'內容不被 header 蓋住，實得 '+content.top);
            const stage=box('.starlit-stage');
            if (stage) {
              check(Math.abs(stage.top-90)<1.5, label+'舞台從 header 底下開始');
              check(Math.abs(stage.width-vw/3)<2, label+'舞台仍是 1/3，實得 '+stage.width+'/'+vw);
            }
          }
          if(--pending===0 && !document.getElementById('result').textContent.startsWith('FAIL'))
            document.getElementById('result').textContent='PASS 4 shell frames';
        } catch(e) { document.getElementById('result').textContent='FAIL '+e.message; }
      };
      frame.srcdoc='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>body{margin:0}'+css+'</style>'+f.markup;
      document.body.append(frame);
    }
  `;
  const file=join(dir,'frame.html');
  fs.writeFileSync(file, '<!doctype html><pre id="result">PENDING</pre><script>'+script.replaceAll('</script','<\\/script')+'</script>');
  const output=execFileSync(process.env.CHROME_BIN ?? join(homedir(),'.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    ['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--virtual-time-budget=1000','--dump-dom',pathToFileURL(file).href],
    {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
  const frameResult=output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
  assert.equal(frameResult,'PASS 4 shell frames');
  console.log(frameResult);
}

// ---------------------------------------------------------------------------
// Ticket 30-D.1 / 30-D.5 / 30-D.7 — the font system, pinned at source level.
//
// Review B raised two things this section exists to stop from drifting again:
//
//   MINOR-2  `--starlit-font-title` had quietly grown from the three places
//            30-B.2 listed to eight. The extra five are justified — that stack
//            is the only way to reach a real CJK weight, so a heading that
//            wants a true 900 has to carry it — and 30-D.5 ratifies them. What
//            was missing was a list: an eighth selector could be added, or a
//            ninth, and nothing would say so. The list below IS that statement.
//            Adding a selector is fine; adding it here at the same time is the
//            point, so the spread stays a decision instead of an accident.
//
//   MINOR-5  CSS font matching never leaves a family because the weight asked
//            for is missing — it silently substitutes the nearest weight that
//            exists. With only 600 and 900 loaded, `.starlit-brand-sub`'s 400
//            rendered CJK at 600 and nothing anywhere reported it. So the rule
//            pinned here is the invariant, not the file: every weight any
//            font-title rule asks for must have a real face behind it.
//
// Both are read out of the stylesheet rather than restated from it, and
// compared against literals typed here by hand — the Ticket 29 Review A
// MINOR-1 rule. An expectation derived from the file it checks proves nothing.
// ---------------------------------------------------------------------------
const globalsCss = fs.readFileSync(`${root}app/globals.css`, 'utf8');
const contactCss = fs.readFileSync(`${root}components/starlit-contact-milktea.css`, 'utf8');
/** Rules are matched on the comment-free text; a comment can hold braces. */
const bareCss = css.replace(/\/\*[^]*?\*\//g, ' ');
const fontTitleRules = [...bareCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => /font-family:\s*var\(--starlit-font-title\)/.test(m[2]))
  .map((m) => ({
    selector: m[1].trim().replace(/\s+/g, ' '),
    weight: (m[2].match(/font-weight:\s*(\d+)/) ?? [, null])[1],
  }));

assert.deepEqual(
  fontTitleRules,
  [
    // Review C MAJOR-1 — `.starlit-brand-name` and `.starlit-brand-sub` left
    // this stack when 30-B was withdrawn. They were only ever on it to reach
    // the display face, and the pre-30 snapshot shows they were Georgia and
    // Arial; they now carry those declarations directly again. Six, not eight.
    { selector: '.starlit-block h2', weight: '900' },
    { selector: '.starlit-block h2 small', weight: '900' },
    { selector: '.starlit h1.starlit-about-name', weight: '900' },
    { selector: '.starlit-about-name-sub', weight: '900' },
    { selector: '.starlit .starlit-skill-column h3', weight: '600' },
    { selector: '.starlit .starlit-award h3', weight: '600' },
  ],
  '--starlit-font-title 套到哪些選擇器、各要什麼字重，改了就要同時改這份清單（30-D.5；Review C 後為六個）',
);

// Every font-title rule states its own weight. One that inherits instead would
// slip past the weight check below without ever appearing in it.
assert.equal(
  fontTitleRules.every((r) => r.weight !== null),
  true,
  '每一條 font-title 規則都要自己寫明字重，不能靠繼承',
);

// Ticket 30-B withdrawn (user, 2026-09-17). MINOR-5's invariant was "every
// weight a font-title rule asks for must have a real face behind it". With the
// extra faces gone that has nothing left to protect, so it is replaced — not
// dropped — by the invariant the withdrawal creates: the site loads exactly one
// face, from the one origin it has always used. That is the thing that can now
// drift back without anyone noticing, and it is what the user asked for.
const fontImports = [...globalsCss.matchAll(/@import\s+url\(['"]([^'"]+)['"]\)/g)].map(
  (m) => m[1],
);
assert.deepEqual(
  fontImports,
  ['https://font.emtech.cc/css/jfOpenHuninn'],
  'app/globals.css 只准載入 jfOpenHuninn 一個字體；Ticket 30-B 已撤回',
);
// Review C MAJOR-3 — the first version of this guard watched `app/globals.css`
// and `--starlit-font-display`, and nothing else. Reviewer C wrote 18 ways to
// put a face back and 10 of them passed green: a `<link rel=stylesheet>` in
// layout.tsx, an `@import` in starlit-shell.css, an inline `<style>` with an
// `@font-face`, the heavy variable swapped instead of the display one. A guard
// with a door next to it is not a guard, so every source that can pull a face
// is checked, not just the one that happened to hold the wiring on the day.
const layoutSource = fs.readFileSync(`${root}app/layout.tsx`, 'utf8');
// `shellSource` is already read further up for the wheel-handler check.
const fontSources = [
  ['app/globals.css', globalsCss],
  ['components/starlit-shell.css', css],
  // Ticket 03（starlit-moon-contact）：聯絡奶茶自己的樣式表也會進頁面，一併看守。
  ['components/starlit-contact-milktea.css', contactCss],
  ['app/layout.tsx', layoutSource],
  ['components/starlit-shell.tsx', shellSource],
] as const;
/** The one URL the site is allowed to fetch a face from. */
const ALLOWED_FONT_URL = 'https://font.emtech.cc/css/jfOpenHuninn';

for (const [name, text] of fontSources) {
  // Comments are stripped only where prose lives: what must not come back is
  // the wiring, not the record of why it went. A commented-out `@import` still
  // counts as wiring — it is the spare answer someone later uncomments — so it
  // is matched against the raw text, deliberately.
  const bare = text.replace(/\/\*[^]*?\*\/|\{\/\*[^]*?\*\/\}/g, ' ');

  // Every mechanism that can pull a *stylesheet or font file* — `@import`,
  // `url()`, and `<link>`. Plain `<a href>` is not one of them, so the social
  // links in the shell are not swept up: this check is about faces, not about
  // the site never linking outward.
  const urls = [
    ...text.matchAll(
      /(?:@import\s+url\(|@import\s+|url\(|<link[^>]*?href=)\s*['"]?(https?:\/\/[^'")\s>]+)/g,
    ),
  ].map((m) => m[1]);
  assert.deepEqual(
    urls.filter((u) => !u.startsWith(ALLOWED_FONT_URL)),
    [],
    `${name}：Ticket 30-B 撤回後，載入樣式或字檔只准 ${ALLOWED_FONT_URL} 一個來源（@import／url()／<link href> 都算，註解掉的也算）`,
  );
  // A self-hosted or inline face bypasses the URL check entirely.
  assert.equal(
    /@font-face/.test(text),
    false,
    `${name}：不得自己宣告 @font-face —— 那是繞過上面那條 URL 檢查的路`,
  );
  for (const banned of ['NotoSansTC', 'Playfair', 'Cinzel', 'Jost']) {
    assert.equal(
      new RegExp(banned, 'i').test(bare),
      false,
      `${name}：撤除的字體 ${banned} 不該還出現在實際程式碼裡`,
    );
  }
}

// Ticket 30-D.6 added preconnects for the Google Fonts origins; 30-B is
// withdrawn, nothing is fetched from them, and a preconnect to a host the page
// never contacts opens a connection for nothing. Quote-agnostic on purpose:
// the first version of this matched `rel="preconnect"` only, so `rel='...'`
// walked straight past it (Review C).
assert.equal(
  /rel=\s*['"]?preconnect/i.test(layoutSource + shellSource),
  false,
  'Ticket 30-B 撤回後，不該再 preconnect 任何字體來源（單雙引號都算）',
);

// Review C — the display and heavy slots must each be ONE bare family name.
// This is what stops the generic-serif trap on both of them at once: a generic
// sitting ahead of jfOpenHuninn in the composed stack answers for CJK glyphs
// too, so 「技能」 would silently stop being jfOpenHuninn. The generics belong
// at the tail of `--starlit-font-title`, after both slots.
const fontVar = (n: string) =>
  (bareCss.match(new RegExp(`--starlit-font-${n}:\\s*([^;]+);`)) ?? [, ''])[1].trim();
for (const slot of ['display', 'heavy']) {
  assert.equal(
    fontVar(slot),
    "'jfOpenHuninn'",
    `--starlit-font-${slot} 必須就是 'jfOpenHuninn' 這一個字族，不得有逗號或泛型（Review C MAJOR-1）`,
  );
}
// Guarding the two slots is not enough on its own: a generic dropped at the
// FRONT of the composed stack sails past both of them and still steals CJK
// glyphs. (Found by red-testing this very guard — C6 was green until this
// assertion existed.) So the composed value is pinned whole: the two slots
// first, in order, generics only after them.
assert.equal(
  fontVar('title').replace(/\s+/g, ' '),
  "var(--starlit-font-display), var(--starlit-font-heavy), 'Microsoft JhengHei', sans-serif",
  '--starlit-font-title 必須是兩個插槽在前、泛型在後；泛型插到前面會接走中文字',
);
// Independently meaningful, unlike the weight list it replaces: the whole
// point of the withdrawal is that the site is back to ONE family, so the two
// slots and the body font must all name the same one.
assert.equal(
  /font-family:\s*'jfOpenHuninn',\s*'Microsoft JhengHei',\s*sans-serif;/.test(bareCss),
  true,
  '本文字體仍是 jfOpenHuninn；撤回後全站只剩這一個字族',
);

// The about harness below reproduces this one global rule by hand instead of
// loading globals.css. If globals.css ever stops declaring it, the harness's
// geometry silently stops matching production, so it is pinned here.
assert.match(
  globalsCss,
  /\*\s*\{\s*box-sizing:\s*border-box\s*\}/,
  'app/globals.css 要有 *{box-sizing:border-box}；下面的版面 harness 依賴它',
);

console.log('font system: Ticket 30-B withdrawn — one family across 4 sources, 6 font-title selectors, no external origin, no preconnect: ok');

// ---------------------------------------------------------------------------
// Ticket 31.7 — reduce 時脊線與連接線不得有任何動態（靜態光跡可以留）。
// 源碼層的一條；實機行為由 followup-31/ui-checks.cjs 在兩個寬度各走一次。
// ---------------------------------------------------------------------------
const eduRules = rules.match(/\.starlit-education[^{}]*\{[^}]*\}/g) ?? [];
assert.ok(eduRules.length >= 6, `找不到教育區的規則，實得 ${eduRules.length}`);
assert.deepEqual(
  eduRules
    .filter((r) => /animation(-name)?\s*:/.test(r))
    .map((r) => r.slice(0, r.indexOf('{')).trim()),
  ['.starlit-education::after'],
  '教育區只有那顆會走的頭可以有動畫；脊線與每一筆的連接線必須是靜態的',
);
assert.match(
  rules,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.starlit-education::after \{\s*display: none;/,
  'reduce 時那顆會走的頭要整個藏起來',
);
console.log('education timeline: only the comet head animates, and reduce hides it: ok');

// ---------------------------------------------------------------------------
// Ticket 33-A — the head is a window onto the line, not a second colour.
// Three source-level pins, each red-tested in followup-33/red-test.sh:
//   1. ::before and ::after share ONE gradient declaration (33-A.1)
//   2. ::before carries the spindle mask (33-A.3)
//   3. ::after intersects two mask layers and animates mask-position, and its
//      own background is nothing but that shared gradient (33-A.1 / 33-A.2)
// ---------------------------------------------------------------------------
const eduShared = rules.match(
  /\.starlit-education::before,\s*\.starlit-education::after \{([^}]*)\}/,
);
assert.ok(eduShared, '脊線與頭必須共用同一條規則宣告漸層（33-A.1）');
assert.match(
  eduShared![1],
  /background-image:\s*linear-gradient\(\s*to bottom,[^)]*var\(--starlit-purple\)[^)]*var\(--starlit-gold\)/,
  '共用規則裡的漸層要是紫→金的垂直漸層，這就是頭唯一能有的顏色',
);
// The shared rule's selector list ends in `.starlit-education::after {` too,
// so it is cut out before looking for the two standalone rules — otherwise
// the ::after lookup lands on the shared block and "has its own background"
// becomes true for the wrong reason.
const eduOwn = rules.replace(eduShared![0], '');
const eduBefore = eduOwn.match(/\.starlit-education::before \{([^}]*)\}/);
const eduAfter = eduOwn.match(/\.starlit-education::after \{([^}]*)\}/);
assert.ok(eduBefore && eduAfter, '找不到 ::before / ::after 各自的規則');
// 33-A.3（使用者更正後）：底線一樣粗，不准有任何 mask 把它變成紡錘；
// 會變寬變窄的是亮光。
assert.match(eduBefore![1], /width:\s*2px;/, '底線固定 2px 寬（33-A.3：線一樣粗）');
assert.equal(
  /mask-image/.test(eduBefore![1]),
  false,
  '底線不准有 mask —— 寬度變化只屬於亮光，不屬於線',
);
assert.equal(
  /background(-image|-color)?\s*:/.test(eduAfter![1]),
  false,
  '亮光不准有自己的 background —— 顏色只能來自共用漸層（33-A.1）',
);
assert.ok(
  /width:\s*18px;/.test(eduAfter![1]) && /brightness\(/.test(eduAfter![1]),
  '亮光要比線寬並提亮，特效才看得見',
);
const comet = rules.match(/@keyframes starlit-comet \{([\s\S]*?)\n\}/);
assert.ok(comet, '找不到 starlit-comet keyframes');
const kf = (pct: string) =>
  (comet![1].match(new RegExp(`\\n\\s*${pct}% \\{([^}]*)\\}`)) ?? [, ''])[1];
assert.match(kf('0'), /opacity: 0;/, '亮光從 opacity 0 開始，不會突然出現（33-A.2）');
// 錨在行首的無前綴屬性上：`-webkit-mask-size` 那一行也含 "mask-size: 100% "，
// 不錨的話改壞無前綴那行測試仍會綠（紅測 R3 第一次就是這樣漏掉的）。
assert.match(kf('0'), /\n\s*mask-size: 30% /, '亮光起點窄（33-A.3）');
assert.match(kf('50'), /\n\s*mask-size: 100% /, '亮光中段最寬（33-A.3）');
assert.match(kf('100'), /\n\s*mask-size: 30% /, '亮光終點窄（33-A.3）');
assert.match(kf('100'), /\n\s*mask-position: 50% 100%/, '亮光靠 mask-position 從頭走到尾');
console.log('education spine: uniform 2px line, glow is a swelling mask window over the same gradient: ok');

// ---------------------------------------------------------------------------
// Ticket 30-D.3 (Review B MINOR-6) — /關於我 的視覺成果，量在真的樣式表上。
//
// 為什麼要有這一段：Reviewer B 實跑六種 CSS 改壞法 —— 把 30-A.1 的減線、
// 30-A.2 的型階、30-A.3 的彗星斜度、30-A.6 的照片尺寸、30-C 的捲動顯現整個
// 關掉 —— 兩支測試全部還是綠的。這一票的視覺成果當時一項都沒有回歸保護：
// 文案與標記釘得很死，畫面上看得到的每一個數字卻一個都沒釘。
//
// 接縫沿用上面「real CSS layouts」那一段：同一顆 headless Chrome、同樣把真的
// 標記與真的樣式表塞進固定尺寸的 iframe、同樣用 getComputedStyle 量。不另外
// 發明一套，也不重新實作一次排版公式。
//
// 期望值全部是手打在這個檔案裡的字面值（票面 30-A.2／A.6 的區間、32px 的行、
// 3 條線），不從 CSS 或 SITE_COPY 反推 —— 從被驗的東西身上取期望值的測試
// 永遠會是綠的，那正是 Ticket 29 Review A 的 MINOR-1。
//
// 這個 harness 只載 starlit-shell.css，沒有 app/globals.css。這是刻意的：
// 區塊標題的字距若哪天又漏寫，就會掉回 `normal` 而不是掉到 globals 給裸 h2 的
// -1px，兩種情況這裡都會紅。
// ---------------------------------------------------------------------------
{
  const { execFileSync } = await import('node:child_process');
  const { tmpdir, homedir } = await import('node:os');
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-about-'));
  const aboutCases = [];
  for (const [w, h, desktop] of [
    [1440, 900, true],
    [390, 844, false],
  ] as [number, number, boolean][])
    for (const language of ['zh', 'en'])
      aboutCases.push({
        name: language + ' ' + w + 'x' + h,
        w,
        h,
        desktop,
        markup: render({
          introComplete: true,
          active: '0',
          stage: 'STAGE',
          controls: 'LANG',
          language,
        }),
      });
  const script = `
    const cases = ${JSON.stringify(aboutCases)};
    const css = ${JSON.stringify(css)};
    const check = (ok, why) => { if (!ok) throw Error(why); };
    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    // 每一個 case 的失敗都要留下來一起報。只留最後一個的話，四個 case 裡先壞的
    // 那幾個會被後面壞的蓋掉，修一輪只看得到一條，很容易以為只有一個問題。
    const fails = [];
    let pending = cases.length;
    for (const c of cases) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+c.w+'px;height:'+c.h+'px';
      frame.onload = () => {
        try {
          const d = frame.contentDocument, win = frame.contentWindow, L = c.name + ': ';
          const cs = (el, pseudo) => win.getComputedStyle(el, pseudo || null);
          const px = (v) => parseFloat(v);

          const name = d.querySelector('h1.starlit-about-name');
          check(!!name, L + '找不到主名，這一輪量的不是 /關於我');
          const chapter = name.closest('.starlit-chapter');
          check(!!chapter, L + '主名不在章節裡');

          // --- 30-A.1 減線 -------------------------------------------------
          // 參考站只有每個區塊標題下一條髮絲線，列與列之間完全沒有線。章節裡
          // 有三個區塊，所以恰好三條，而且每一條都必須在 h2 底下 —— 只數數量
          // 會被「拿掉 h2 的線、加回教育的列間線」這種等量交換騙過去。
          const ruled = [...chapter.querySelectorAll('*')].filter((el) => {
            const s = cs(el);
            return s.borderBottomStyle !== 'none' && px(s.borderBottomWidth) > 0;
          });
          check(ruled.length === 4, L + '章節裡的橫線要恰好 4 條（Ticket 33-B 加了第四個區塊），實得 ' + ruled.length);
          check(ruled.every((el) => el.tagName === 'H2'),
            L + '每一條線都要在區塊標題下，實得 ' + ruled.map((e) => e.tagName).join(','));

          // --- 30-A.2 型階 -------------------------------------------------
          // 清單項：16px / line-height 32px，三種清單都是。
          const listItems = [
            ...chapter.querySelectorAll('.starlit-skill-column .starlit-plain-list li'),
            ...chapter.querySelectorAll('.starlit-education li'),
            ...chapter.querySelectorAll('.starlit-award p'),
            ...chapter.querySelectorAll('.starlit-award > span'),
          ];
          check(listItems.length >= 24, L + '清單項太少，選擇器可能已經失準，實得 ' + listItems.length);
          for (const li of listItems) {
            const s = cs(li);
            check(near(px(s.fontSize), 16, 0.01), L + '清單項要 16px，實得 ' + s.fontSize);
            check(near(px(s.lineHeight), 32, 0.01), L + '清單項 line-height 要 32px，實得 ' + s.lineHeight);
          }

          // 區塊標題：15–16px、真 900、字距 0.25em。
          const heads = [...chapter.querySelectorAll('.starlit-block h2')];
          check(heads.length === 4, L + '四個區塊標題（Ticket 33-B），實得 ' + heads.length);
          for (const h2 of heads) {
            const s = cs(h2);
            check(px(s.fontSize) >= 15 && px(s.fontSize) <= 16,
              L + '區塊標題要 15–16px，實得 ' + s.fontSize);
            check(s.fontWeight === '900', L + '區塊標題要 weight 900，實得 ' + s.fontWeight);
            check(near(px(s.letterSpacing), px(s.fontSize) * 0.25, 0.2),
              L + '區塊標題字距要約 0.25em，實得 ' + s.letterSpacing);
            const small = h2.querySelector('small');
            if (small) {
              const ss = cs(small);
              check(near(px(ss.fontSize), px(s.fontSize), 0.01),
                L + '拉丁小標與中文標題同尺寸，實得 ' + ss.fontSize + ' vs ' + s.fontSize);
              check(ss.fontWeight === '900', L + '拉丁小標也要 weight 900，實得 ' + ss.fontWeight);
              const hr = h2.getBoundingClientRect(), sr = small.getBoundingClientRect();
              check(sr.top >= hr.top - 1 && sr.bottom <= hr.top + px(s.lineHeight) + 1,
                L + '中文標題與其後的拉丁小標要在同一行');
            }
          }

          // 欄標題與得獎標題：18–19px / 600。
          const subHeads = [
            ...chapter.querySelectorAll('.starlit-skill-column h3'),
            ...chapter.querySelectorAll('.starlit-award h3'),
          ];
          check(subHeads.length === 4, L + '兩個欄標題 + 兩筆得獎標題，實得 ' + subHeads.length);
          for (const h3 of subHeads) {
            const s = cs(h3);
            check(px(s.fontSize) >= 18 && px(s.fontSize) <= 19,
              L + '欄標題要 18–19px，實得 ' + s.fontSize);
            check(s.fontWeight === '600', L + '欄標題要 weight 600，實得 ' + s.fontWeight);
            // 30-D.2：SITCON 的大寫來自字面值。得獎標題若被 text-transform
            // 大寫，畫面與 DOM 文字就會不一致，而標記層的斷言看不出來。
            check(s.textTransform === 'none',
              L + '標題的大小寫要來自字面值，不得用 text-transform 造，實得 ' + s.textTransform);
          }

          // 主名與英文副名。
          const ns = cs(name);
          check(ns.fontWeight === '900', L + '主名要 weight 900，實得 ' + ns.fontWeight);
          const sub = chapter.querySelector('.starlit-about-name-sub');
          const ss2 = cs(sub);
          check(ss2.fontWeight === '900', L + '英文副名要 weight 900，實得 ' + ss2.fontWeight);
          check(ss2.textTransform === 'uppercase', L + '英文副名維持大寫，實得 ' + ss2.textTransform);
          check(px(ss2.letterSpacing) >= 2, L + '英文副名維持寬字距，實得 ' + ss2.letterSpacing);
          if (c.desktop) {
            // 票面的型階表是 1440 實測基準，所以尺寸區間只在桌面比對。窄螢幕
            // 另有一組刻意縮小的值（主名 clamp 下限 32px、副名 15px），那是
            // Ticket 29 就驗收過的行為，不是這一票的區間。
            check(px(ss2.fontSize) >= 18 && px(ss2.fontSize) <= 21,
              L + '1440 英文副名要 18–21px，實得 ' + ss2.fontSize);
            // 票面：主名與清單項 16px 的比值 3.2–3.5（參考站約 3.1）。
            const ratio = px(ns.fontSize) / 16;
            check(ratio >= 3.2 && ratio <= 3.5,
              L + '1440 主名與清單項的比值要落在 3.2–3.5，實得 ' + px(ns.fontSize) + '/16 = ' + ratio);
          } else {
            // 窄螢幕只要求它不大於桌面那一階，避免哪天被改大而擠爆 390。
            check(px(ss2.fontSize) <= 21, L + '窄螢幕英文副名不得比桌面還大，實得 ' + ss2.fontSize);
          }

          // --- 30-D.4 (MINOR-1) 每一份清單都落在同一條 32px 垂直網格上 -------
          // 量的是實際節奏，不是 line-height：前一輪 line-height 是 32 沒錯，
          // 但 padding 12px + gap 4px 讓教育的 pitch 變成 60，整塊就偏了。
          const gridPitch = (els) => {
            const tops = [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().top)))]
              .sort((a, b) => a - b);
            const deltas = [];
            for (let i = 1; i < tops.length; i++) deltas.push(tops[i] - tops[i - 1]);
            return deltas;
          };
          const eduItems = [...chapter.querySelectorAll('.starlit-education li')];
          check(eduItems.length === 3, L + '三所學校，實得 ' + eduItems.length);
          for (const delta of gridPitch(eduItems))
            check(delta > 0 && delta % 32 === 0,
              L + '教育每一列要落在 32px 網格上，實得節奏 ' + delta);
          const awards = [...chapter.querySelectorAll('.starlit-award')];
          check(awards.length === 2, L + '得獎兩筆，實得 ' + awards.length);
          for (const delta of gridPitch(awards))
            check(delta > 0 && delta % 32 === 0,
              L + '兩筆得獎之間也要落在 32px 網格上，實得節奏 ' + delta);
          // 一份清單量一份：跨到下一組要先經過那組的 h3，那個落差是區塊邊界、
          // 不是清單節奏，混進來只會讓這條斷言變成噪音。
          for (const ul of chapter.querySelectorAll('.starlit-skill-column .starlit-plain-list'))
            for (const delta of gridPitch([...ul.querySelectorAll('li')]))
              check(delta > 0 && delta % 32 === 0,
                L + '技能清單也要在同一條網格上，實得節奏 ' + delta);
          // 第二筆得獎的兩個成績是兩行，不是一行。
          const secondLines = [...awards[1].querySelectorAll('p')];
          check(secondLines.length === 2, L + '第二筆得獎要兩行，實得 ' + secondLines.length);
          const lineGap = Math.round(
            secondLines[1].getBoundingClientRect().top - secondLines[0].getBoundingClientRect().top);
          check(lineGap > 0 && lineGap % 32 === 0,
            L + '第二筆的兩行要各自成行且在網格上，實得 ' + lineGap);

          // --- Ticket 31 交錯式時間軸 -----------------------------------------
          // 票面「驗證」段的六項，期望值（280、24、1、96、LRL、無數字）全部
          // 手打在這個檔案裡，不從樣式表或 SITE_COPY 反推。脊線的中心與斜度
          // 則是**實量** ::before 的 left / margin-left / width / transform 再
          // 回推的，所以「連接線接不接得到線」量的是兩個獨立來源的一致性，
          // 不是把同一個 CSS 值抄兩遍。
          const edu = chapter.querySelector('.starlit-education');
          const eduRect = edu.getBoundingClientRect();
          const spine = cs(edu, '::before');
          check(spine.content !== 'none', L + '脊線要真的畫出來');
          check(spine.display !== 'none', L + '脊線不該被藏起來');

          // 1. 脊線高度 = 教育區塊高度（參考站 272.292px 之於 h 272）。
          check(/px$/.test(spine.height),
            L + '脊線高度要量得到 px，實得 ' + spine.height);
          check(near(px(spine.height), eduRect.height, 1),
            L + '脊線高度要等於教育區塊高度，實得 ' + spine.height +
              ' vs 區塊 ' + eduRect.height);

          // 2. 斜度非零（使用者要「保留微斜」，參考站是純垂直），但仍是微斜。
          const mx = /matrix\\(([^)]+)\\)/.exec(spine.transform);
          check(!!mx, L + '脊線要有 transform，實得 ' + spine.transform);
          const cosT = parseFloat(mx[1].split(',')[0]);
          const sinT = parseFloat(mx[1].split(',')[1]);
          check(Math.abs(sinT) >= 0.02,
            L + '脊線要有非零斜度（純垂直就是 0），實得 sin = ' + sinT);
          check(Math.abs(sinT) <= 0.35,
            L + '票面要的是「微斜」，不是斜到誇張，實得 sin = ' + sinT);

          // 脊線在容器高度 Y 的 x。CSS 的正角是順時針，繞自己的中心轉，所以
          // 離中心 d 的點落到 (−d·sinθ, d·cosθ) → x(Y) = cx − (Y − cy)·tanθ。
          const lenOf = (v, base) =>
            /%$/.test(v) ? (parseFloat(v) / 100) * base : parseFloat(v);
          const spineCx =
            lenOf(spine.left, eduRect.width) +
            lenOf(spine.marginLeft, eduRect.width) +
            px(spine.width) / 2;
          const spineCy = lenOf(spine.top, eduRect.height) + px(spine.height) / 2;
          const spineAt = (Y) => spineCx - (Y - spineCy) * (sinT / cosT);

          // 量的是文字，不是 li 的框：每一筆現在都是滿寬的，只看框分不出交錯。
          const textRect = (li) => {
            const r = d.createRange();
            r.selectNodeContents(li);
            return r.getBoundingClientRect();
          };
          const mid = eduRect.left + eduRect.width / 2;

          // 6. 校名不得含任何數字 —— 使用者裁示不放年份，且不得自行編造。
          // 這一條量的是畫面上真的印出來的字，中英兩語、兩個寬度各驗一次。
          for (const li of eduItems)
            check(!/\\d/.test(li.textContent),
              L + '校名不得含數字（不得自行編造年份），實得 ' + li.textContent);

          if (c.desktop) {
            // 3. 左／右／左交錯。
            const sides = eduItems.map((li) => {
              const b = textRect(li);
              return b.right <= mid + 0.5 ? 'L' : b.left >= mid - 0.5 ? 'R' : '?';
            });
            check(sides.join('') === 'LRL',
              L + '三筆要左／右／左交錯，實得 ' + sides.join(''));

            // 5. 區塊高度。每筆只有校名一行，靠列距把區塊拉高才拿得回長度。
            check(eduRect.height >= 280,
              L + '1440 教育區塊高度要 ≥ 280px，實得 ' + eduRect.height);
            // 上面那個「列中心 = H/2 ± pitch」只有在三列等高時成立，所以把
            // 前提本身也釘住：一旦哪天校名長到撐開某一列，這裡先紅。
            const heights = [...new Set(eduItems.map((li) =>
              Math.round(li.getBoundingClientRect().height)))];
            check(heights.length === 1 && heights[0] === 96,
              L + '三筆列高要一致且為 96px（連接線位移的前提；英文最長那筆' +
                '在半欄寬是三行），實得 ' + heights.join('/'));
            for (const delta of gridPitch(eduItems))
              check(delta === 96,
                L + '教育每一列的 pitch 要 96px（96 列高 + 0 列距），實得 ' + delta);

            // 4. 每一筆的連接線起點落在脊線於該列的 x 上。
            for (let i = 0; i < eduItems.length; i++) {
              const lr = eduItems[i].getBoundingClientRect();
              const arm = cs(eduItems[i], '::after');
              check(arm.content !== 'none' && arm.display !== 'none',
                L + '第 ' + (i + 1) + ' 筆要有連接線');
              check(near(px(arm.width), 24, 0.01),
                L + '連接線要 24px 長（參考站 24×1），實得 ' + arm.width);
              check(near(px(arm.height), 1, 0.01),
                L + '連接線要 1px 高，實得 ' + arm.height);
              let x0;
              if (/px$/.test(arm.left)) x0 = lr.left + parseFloat(arm.left);
              else if (/px$/.test(arm.right))
                x0 = lr.right - parseFloat(arm.right) - px(arm.width);
              else {
                check(false, L + '連接線的水平位置量不到，left=' + arm.left +
                  ' right=' + arm.right);
              }
              // 奇數筆在左側，貼著脊線的是右緣；偶數筆在右側，是左緣。
              const startX = i % 2 === 0 ? x0 + px(arm.width) : x0;
              const rowY = lr.top + lr.height / 2 - eduRect.top;
              const want = eduRect.left + spineAt(rowY);
              check(near(startX, want, 1),
                L + '第 ' + (i + 1) + ' 筆連接線起點 x 要落在脊線上，實得 ' +
                  startX.toFixed(2) + ' vs 脊線 ' + want.toFixed(2) +
                  '（差 ' + (startX - want).toFixed(2) + 'px）');
            }
          } else {
            // 窄螢幕（票面 6 授權 Developer 判斷）：單欄、脊線移到左側、
            // 微斜保留、連接線收起來 —— 校名在 390 寬會折行，列高不再一致，
            // 固定位移就會讓連接線離開脊線。脊線本身 top:0/bottom:0，
            // 不管每列多高都仍然等於區塊高度，所以它留著。
            const lefts = [...new Set(eduItems.map((li) =>
              Math.round(textRect(li).left)))];
            check(lefts.length === 1,
              L + '窄螢幕教育收成單欄，實得 ' + lefts.length + ' 種左緣');
            check(lefts[0] >= eduRect.left + 24,
              L + '窄螢幕卡片要讓開左側的脊線，實得 ' + lefts[0] +
                ' vs 容器左緣 ' + eduRect.left);
            check(spineCx < eduRect.width / 2,
              L + '窄螢幕脊線要移到左側，實得中心 x ' + spineCx +
                ' vs 容器寬 ' + eduRect.width);
            for (const li of eduItems)
              check(cs(li, '::after').display === 'none',
                L + '窄螢幕不畫連接線（列高不一致，起點會浮在半空）');
          }

          // --- 滿月合照：正方形且不出血 -----------------------------------
          const img = chapter.querySelector('.starlit-about-portrait img');
          check(!!img, L + '找不到個人照');
          const wrap = img.parentElement;
          const ir = img.getBoundingClientRect();
          check(near(ir.width, ir.height, 1), L + '滿月不得拉伸成橢圓');
          if (c.desktop) {
            check(ir.width >= 320 && ir.width <= 384,
              L + '1440 照片寬度要落在 320–384，實得 ' + ir.width);
            // 取消出血：右緣對齊內容欄右緣，而不是衝出去。
            // 內緣要從 clientWidth 算，不能從 getBoundingClientRect().right 減
            // padding：桌面的 .starlit-content 是自己的捲動容器，它的捲軸在這個
            // harness 裡實佔 10px（offsetWidth 960 / clientWidth 950），而正式環境
            // 的疊加式捲軸佔 0。用 clientWidth 兩種情況得到的是同一個內緣，
            // 斷言才不會因為跑在哪裡而飄。
            const content = d.querySelector('.starlit-content');
            const ccs = cs(content), cr = content.getBoundingClientRect();
            const innerRight = cr.left + content.clientWidth - px(ccs.paddingRight);
            check(near(ir.right, innerRight, 1.5),
              L + '照片右緣要對齊內容欄右緣（不出血），實得 ' + ir.right + ' vs ' + innerRight);
            check(near(px(cs(wrap).marginRight), 0, 0.01),
              L + '出血用的負 margin 要拿掉，實得 ' + cs(wrap).marginRight);
          }

          // --- 30-C 捲動顯現的兩個狀態 ---------------------------------------
          const reveals = [...chapter.querySelectorAll('.starlit-reveal')];
          check(reveals.length === 5, L + '/關於我 五塊捲動顯現（Ticket 33-B），實得 ' + reveals.length);
          for (const el of reveals) {
            const s = cs(el);
            check(s.opacity === '0', L + '顯現前是透明的，實得 opacity ' + s.opacity);
            check(s.transform !== 'none', L + '顯現前要往下偏移，實得 transform ' + s.transform);
            check(px(s.transitionDuration) > 0, L + '顯現要有轉場，實得 ' + s.transitionDuration);
          }
          for (const el of reveals) el.setAttribute('data-reveal', 'in');
          // 轉場先關掉再量終點，否則量到的是插值中的瞬時值，測試會時綠時紅。
          const kill = d.createElement('style');
          kill.textContent = '.starlit-reveal{transition:none !important}';
          d.head.append(kill);
          for (const el of reveals) {
            const s = cs(el);
            check(s.opacity === '1', L + '顯現後要完全不透明，實得 ' + s.opacity);
            check(s.transform === 'none', L + '顯現後要回到原位，實得 ' + s.transform);
          }
          kill.remove();

          // 橫向不溢出（窄螢幕的老問題）。量的是內容欄自己，不是 document：
          // 這個 harness 的 iframe 用的是會佔位的傳統捲軸，document 的
          // clientWidth 因此比視窗少 15px，拿它當基準會把捲軸誤判成溢出。
          const contentEl = d.querySelector('.starlit-content');
          const over = contentEl.scrollWidth - contentEl.clientWidth;
          if (over > 1) {
            const cr2 = contentEl.getBoundingClientRect();
            const worst = [...chapter.querySelectorAll('*')]
              .map((el) => ({ el, r: el.getBoundingClientRect() }))
              .filter((x) => x.r.width > 0 && x.r.right > cr2.right + 1)
              .sort((a, b) => b.r.right - a.r.right)[0];
            check(false, L + '內容欄橫向溢出 ' + over + 'px，最外側的是 ' +
              (worst ? worst.el.tagName + '.' + worst.el.className + ' right=' + worst.r.right +
                ' vs ' + cr2.right : '(找不到單一元素，可能是文字本身不折行)'));
          }

        } catch (e) { fails.push(e.message); }
        if (--pending === 0)
          document.getElementById('result').textContent =
            fails.length ? 'FAIL ' + fails.join(' ｜ ') : 'PASS 4 about visual layouts';
      };
      // box-sizing: border-box is the one thing this chapter's geometry needs
      // from app/globals.css, which the harness deliberately does not load (see
      // the header comment). Without it .starlit-content renders its 64.8px
      // padding OUTSIDE its grid track and every right-edge number comes out
      // 129.6px wrong — measured, not assumed. It is written out here rather
      // than read from globals.css so the two stay independent; the assertion
      // above the harness fails if globals.css stops declaring it.
      // (No backticks anywhere in this script: it lives in a template literal.)
      frame.srcdoc ='<!doctype html><html lang="' + (c.name.startsWith('zh') ? 'zh-Hant' : 'en') +
        '"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}' + css + '</style>' + c.markup;
      document.body.append(frame);
    }
  `;
  const file = join(dir, 'about.html');
  fs.writeFileSync(
    file,
    '<!doctype html><pre id="result">PENDING</pre><script>' +
      script.replaceAll('</script', '<\\/script') +
      '</script>',
  );
  const output = execFileSync(
    process.env.CHROME_BIN ??
      join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    ['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--virtual-time-budget=1000','--dump-dom',pathToFileURL(file).href],
    { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 },
  );
  const aboutResult = output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
  assert.equal(aboutResult, 'PASS 4 about visual layouts');
  console.log(aboutResult);
}

// ---------------------------------------------------------------------------
// Ticket 03（starlit-moon-contact）— 聯絡區 3D 奶茶的真實 CSS 版面（Review B 重要項）。
//
// 上面的 about harness 只內嵌 starlit-shell.css；聯絡奶茶的樣式在自己的
// components/starlit-contact-milktea.css，沒接進來的話，把 pointer-events:none
// 刪掉或把 850px 單欄改壞，整套測試仍然全綠。這裡把兩份 CSS 一起放進 iframe，
// 對 zh／en × 1440／390 四個 case 量真的盒子：畫布不壓標題／內文／Email／社群、
// 桌面在文字右側且右緣對齊內容欄、手機在內文下方 Email 上方、指標點在畫布上
// 落到的是它底下的容器（不攔截）、內容欄不橫向溢出。畫布本身沒有 JS 也沒有
// 點雲——量的是版面，不是渲染；渲染與生命週期由 lib 測試與 logs 的 harness 負責。
// 只有 CSS：markup 是 renderToStaticMarkup 的靜態輸出，不執行 React。
// ---------------------------------------------------------------------------
{
  const { execFileSync } = await import('node:child_process');
  const { tmpdir, homedir } = await import('node:os');
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-contact-'));
  const contactCases = [];
  for (const [w, h, desktop] of [
    [1440, 900, true],
    [390, 844, false],
  ] as [number, number, boolean][])
    for (const language of ['zh', 'en'])
      contactCases.push({
        name: language + ' ' + w + 'x' + h,
        w,
        h,
        desktop,
        markup: render({
          introComplete: true,
          active: '2',
          stage: 'STAGE',
          controls: 'LANG',
          language,
        }),
      });
  const script = `
    const cases = ${JSON.stringify(contactCases)};
    const css = ${JSON.stringify(css + '\n' + contactCss)};
    const check = (ok, why) => { if (!ok) throw Error(why); };
    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    const fails = [];
    let pending = cases.length;
    for (const c of cases) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+c.w+'px;height:'+c.h+'px';
      frame.onload = () => {
        try {
          const d = frame.contentDocument, win = frame.contentWindow, L = c.name + ': ';
          const cs = (el) => win.getComputedStyle(el);
          const px = (v) => parseFloat(v);
          const rect = (el) => el.getBoundingClientRect();
          const disjoint = (a, b) =>
            a.right <= b.left + 0.5 || b.right <= a.left + 0.5 ||
            a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5;

          const canvas = d.querySelector('canvas.starlit-contact-milktea');
          check(!!canvas, L + '找不到聯絡奶茶畫布');
          const chapter = canvas.closest('.starlit-chapter');
          check(!!chapter, L + '畫布不在章節裡');
          const head = canvas.closest('.starlit-contact-head');
          check(!!head, L + '畫布不在 .starlit-contact-head 裡');
          const h1 = chapter.querySelector('.starlit-contact-intro h1');
          const lead = chapter.querySelector('.starlit-contact-intro .starlit-lead');
          const mail = chapter.querySelector('.starlit-contact-mail');
          const socials = chapter.querySelector('.starlit-social-list');
          check(h1 && lead && mail && socials, L + '標題／內文／Email／社群其中一個找不到');

          const content = d.querySelector('.starlit-content');
          // 畫布要有真的盒子（寬與 4:5 高由 CSS 給），而且不接指標。
          const cr = rect(canvas);
          check(cr.width >= 200 && cr.height > cr.width, L + '畫布盒子不對，實得 ' + cr.width + 'x' + cr.height);
          check(cs(canvas).pointerEvents === 'none', L + '畫布要 pointer-events:none，實得 ' + cs(canvas).pointerEvents);
          // elementFromPoint 只看視口內：先把畫布捲進來（桌面捲的是內容欄，
          // 手機捲的是視窗），量完再捲回頂，後面的相對位置斷言不受影響。
          canvas.scrollIntoView({ block: 'center' });
          const vr = rect(canvas);
          const hit = d.elementFromPoint(vr.left + vr.width / 2, vr.top + vr.height / 2);
          check(hit && hit !== canvas && !canvas.contains(hit),
            L + '點在畫布中心要落到底下的元素，實得 ' + (hit ? hit.tagName + '.' + hit.className : 'null') +
              '（畫布視口座標 ' + JSON.stringify([vr.left, vr.top, vr.right, vr.bottom].map(Math.round)) + '）');
          win.scrollTo(0, 0); content.scrollTop = 0;

          // 不壓任何文字或入口。
          for (const [what, el] of [['標題', h1], ['內文', lead], ['Email 區塊', mail], ['社群清單', socials]]) {
            const r = rect(el);
            check(disjoint(cr, r), L + '畫布壓到' + what + '：畫布 ' +
              JSON.stringify([cr.left, cr.top, cr.right, cr.bottom].map(Math.round)) + ' vs ' +
              JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)));
          }

          const ccs = cs(content), contentRect = rect(content);
          if (c.desktop) {
            // 桌面：文字左、奶茶右，右緣對齊內容欄內緣（與滿月照片同一條線；
            // 內緣從 clientWidth 算，理由見 about harness）。
            check(cr.left >= rect(lead).right + 8, L + '桌面畫布要在內文右側，實得畫布 left ' + cr.left + ' vs 內文 right ' + rect(lead).right);
            const innerRight = contentRect.left + content.clientWidth - px(ccs.paddingRight);
            check(near(cr.right, innerRight, 1.5), L + '桌面畫布右緣要對齊內容欄右緣，實得 ' + cr.right + ' vs ' + innerRight);
          } else {
            // 手機：單欄，畫布在內文下方、Email 上方，左右都在內容欄裡。
            check(cr.top >= rect(lead).bottom, L + '手機畫布要在內文下方，實得畫布 top ' + cr.top + ' vs 內文 bottom ' + rect(lead).bottom);
            check(cr.bottom <= rect(mail).top, L + '手機畫布要在 Email 上方，實得畫布 bottom ' + cr.bottom + ' vs Email top ' + rect(mail).top);
            check(cr.left >= contentRect.left && cr.right <= contentRect.right + 0.5,
              L + '手機畫布要留在內容欄內，實得 ' + cr.left + '–' + cr.right + ' vs 欄 ' + contentRect.left + '–' + contentRect.right);
          }

          // 橫向不溢出，量法同 about harness。
          const over = content.scrollWidth - content.clientWidth;
          check(over <= 1, L + '內容欄橫向溢出 ' + over + 'px');
        } catch (e) { fails.push(e.message); }
        if (--pending === 0)
          document.getElementById('result').textContent =
            fails.length ? 'FAIL ' + fails.join(' ｜ ') : 'PASS 4 contact visual layouts';
      };
      frame.srcdoc ='<!doctype html><html lang="' + (c.name.startsWith('zh') ? 'zh-Hant' : 'en') +
        '"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}' + css + '</style>' + c.markup;
      document.body.append(frame);
    }
  `;
  const file = join(dir, 'contact.html');
  fs.writeFileSync(
    file,
    '<!doctype html><pre id="result">PENDING</pre><script>' +
      script.replaceAll('</script', '<\\/script') +
      '</script>',
  );
  const output = execFileSync(
    process.env.CHROME_BIN ??
      join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    ['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--virtual-time-budget=1000','--dump-dom',pathToFileURL(file).href],
    { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 },
  );
  const contactResult = output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
  assert.equal(contactResult, 'PASS 4 contact visual layouts');
  console.log(contactResult);
}

// ---------------------------------------------------------------------------
// Ticket 43 — 星塵流整層拿掉（Ticket 37／42 的反向釘子）。
//
// 使用者 2026-09-19：「直接放棄這種星塵的背景」。原本 Ticket 42.6 在這裡釘的是
// 「殼怎麼掛星塵層」；現在改釘「殼再也掛不出星塵層」，三個方向各一條，這樣任何
// 一種把它加回來的方式（掛載行、import、檔案復活）都會被擋下來：
// ---------------------------------------------------------------------------
{
  // 1) 任何一個分頁、開場中或開場後，渲染出來的 markup 都不得有星塵 canvas／
  //    圖層。這一條同時擋掉 `canvas.starlit-dust` 與 `.starlit-dust-layer`。
  for (const [tag, markup] of [
    ['開場中', render({ introComplete: false })],
    ['內容頁', render({ introComplete: true, active: '0' })],
    ['作品頁', render({ introComplete: true, active: '1' })],
    ['聯絡頁', render({ introComplete: true, active: '2' })],
  ] as [string, string][]) {
    assert.equal(
      /starlit-dust/.test(markup),
      false,
      `${tag}：頁面上不得再有星塵 canvas／圖層（Ticket 43 整層移除）`,
    );
    assert.equal(
      /StarlitDust/.test(markup),
      false,
      `${tag}：markup 裡不得留下星塵元件的任何痕跡`,
    );
  }
  // 2) 原始碼（含註解）不得再 import 或掛載星塵層——不留死碼。
  assert.equal(
    /StarlitDust|starlit-dust|star-dust/.test(shellSource),
    false,
    'components/starlit-shell.tsx 不得再提到 StarlitDust／starlit-dust／star-dust',
  );
  assert.equal(
    /scrollerId/.test(shellSource),
    false,
    'scrollerId 只為星塵層而存在，必須一起清掉',
  );
  // 3) 四個檔案本身要真的不見了（不是只有 import 被註解掉）。
  for (const gone of [
    'components/starlit-dust.tsx',
    'components/starlit-dust.css',
    'lib/star-dust.ts',
    'lib/star-dust.test.ts',
  ])
    assert.equal(
      fs.existsSync(`${root}${gone}`),
      false,
      `${gone} 必須已被刪除（Ticket 43）`,
    );
}

// ---------------------------------------------------------------------------
// Ticket 44 — 鼠標漸亮（毛哥 elvismao.com/zh-Hant/code 的做法）。
//
// harness 在真瀏覽器上量座標、opacity 與像素；這裡釘的是 harness 量不到的結構與
// 來源面：層級、DOM 形狀、只有一個監聽、`(hover: none)` 的擋板、以及「流光框沒被
// 偷走」。
// ---------------------------------------------------------------------------
{
  const css44 = fs.readFileSync(`${root}components/starlit-shell.css`, 'utf8');

  // 1) 聚光宿主：開場中不存在；開場後三個分頁都在，而且是內容欄的第一個孩子、
  //    聚光層又是宿主的第一個孩子（永遠在文字之下）。
  assert.equal(
    /starlit-nebula/.test(render({ introComplete: false })),
    false,
    '開場中不得有內容欄聚光層（那時候還沒有內容欄可言）',
  );
  for (const active of ['0', '1', '2']) {
    const markup = render({ introComplete: true, active });
    assert.match(
      markup,
      /<div class="starlit-content" id="starlit-content"><div class="starlit-glow-host"><div class="starlit-nebula" aria-hidden="true">/,
      `分頁 ${active}：聚光宿主是內容欄的第一個孩子，聚光層是宿主的第一個孩子`,
    );
    // 頁尾被搬進宿主裡（票面 A：整欄都要有聚光，包含頁尾那一條）。
    assert.match(
      markup,
      /<footer class="starlit-footer">[^]*?<\/footer><\/div><\/div><\/main>/,
      `分頁 ${active}：頁尾在聚光宿主裡面，宿主再關內容欄`,
    );
    assert.equal(
      (markup.match(/class="starlit-glow-host"/g) ?? []).length,
      1,
      `分頁 ${active}：整頁只有一個聚光宿主`,
    );
    assert.equal(
      (markup.match(/class="starlit-nebula"/g) ?? []).length,
      1,
      `分頁 ${active}：整頁只有一層聚光`,
    );
  }
  // 開場中頁尾照舊不存在（Ticket 28 的老規矩，搬家之後仍要成立）。
  assert.equal(
    render({ introComplete: false }).includes('starlit-footer'),
    false,
    '開場中仍然沒有頁尾',
  );

  // 2) 卡片：五張各有一個空的內部聚光層，而且就掛在膜之後。
  const works44 = render({ introComplete: true, active: '1' });
  assert.equal(
    (works44.match(/<div class="starlit-ember-spot" aria-hidden="true"><\/div>/g) ?? [])
      .length,
    5,
    '五張卡各一個內部聚光層，而且是空的（純裝飾）',
  );

  // 3) 來源：一個 pointermove、rAF 節流、只寫 CSS 變數、`(hover: none)` 不掛。
  assert.equal(
    (shellSource.match(/addEventListener\('pointermove'/g) ?? []).length,
    1,
    '只有一處註冊 pointermove（內容欄與作品格子共用同一個 hook）',
  );
  assert.equal(
    (shellSource.match(/removeEventListener\('pointermove'/g) ?? []).length,
    1,
    'cleanup 一定要把它拆掉',
  );
  assert.equal(
    /addEventListener\('mousemove'/.test(shellSource),
    false,
    '用 pointermove，不用 mousemove',
  );
  assert.match(
    shellSource,
    /cursorGlowSupported\(typeof matchMedia === 'function' \? matchMedia : null\)/,
    '掛之前先問 lib/cursor-glow.ts 的 (hover: none) 擋板',
  );
  assert.match(
    shellSource,
    /if \(!raf\) raf = requestAnimationFrame\(paint\);/,
    'pointermove 只記座標，真正的工作丟給 requestAnimationFrame（節流）',
  );
  // 回呼裡只碰 style 的自訂屬性——不設 state、不改 class、不量 layout 以外的事。
  const glowEffect = shellSource.slice(
    shellSource.indexOf('function useCursorGlow('),
    shellSource.indexOf('export default function StarlitShell('),
  );
  assert.ok(glowEffect.length > 200, '找得到 useCursorGlow 的本體');
  assert.equal(
    /setState|useState|classList|dataset/.test(glowEffect),
    false,
    '鼠標聚光不得引發 React re-render，也不寫 class／data-*，只寫 CSS 變數',
  );
  // Review R F2 — 捲動也要重算，否則滾輪捲了而指標沒動時聚光會跟著內容跑掉。
  // 三件事一起釘：只有一處、掛在 document 的捕獲階段（元素的 scroll 不冒泡到
  // window，桌機捲的正是 `.starlit-content` 這個元素）、cleanup 拆得掉。
  // （全檔有兩處 `addEventListener('scroll', onScroll…)`：另一處是 useStarlitReveal
  //  的，它為了同一個理由——元素的 scroll 不冒泡——也掛在 document 的捕獲階段。
  //  所以這裡只數 useCursorGlow 自己那一段。）
  assert.equal(
    (glowEffect.match(/addEventListener\('scroll', onScroll/g) ?? []).length,
    1,
    'Review R F2：聚光的 hook 裡只有一處註冊 scroll 監聽',
  );
  assert.match(
    glowEffect,
    /document\.addEventListener\('scroll', onScroll, \{ passive: true, capture: true \}\);/,
    'Review R F2：scroll 掛在 document 的捕獲階段、passive',
  );
  assert.match(
    glowEffect,
    /document\.removeEventListener\('scroll', onScroll, \{ capture: true \}\);/,
    'Review R F2：cleanup 要用同一組 capture 旗標拆掉它',
  );
  // 而且它必須在 `(hover: none)` 擋板**之後**才註冊——否則觸控裝置會多一個監聽。
  assert.ok(
    glowEffect.indexOf('cursorGlowSupported(') <
      glowEffect.indexOf("document.addEventListener('scroll'"),
    'Review R F2：scroll 監聽也要被 (hover: none) 擋板擋著',
  );
  assert.ok(
    glowEffect.indexOf('cursorGlowSupported(') <
      glowEffect.indexOf("host.addEventListener('pointermove'"),
    '(hover: none) 擋板要在 pointermove 之前',
  );
  for (const v of ['--mouse-x', '--mouse-y'])
    assert.ok(
      glowEffect.includes(`setProperty('${v}'`) &&
        glowEffect.includes(`removeProperty('${v}')`),
      `${v} 要寫得進去也收得回來`,
    );

  // 4) CSS：亮起來的規則關在 `@media (hover: hover)` 裡（觸控裝置的 :hover 會
  //    黏住）。三條 opacity: 1 全部都要在裡面。
  const hoverBlocks = [
    ...css44.matchAll(/@media \(hover: hover\) \{([^]*?)\n\}/g),
  ].map((m) => m[1]);
  assert.ok(
    hoverBlocks.length >= 2,
    `至少兩段 @media (hover: hover)：卡片邊框、卡片內部，實得 ${hoverBlocks.length}`,
  );
  const hoverAll = hoverBlocks.join('\n');
  for (const sel of [
    '.starlit-ember-grid:hover .starlit-ember::after',
    '.starlit-ember:hover .starlit-ember-spot',
  ])
    assert.ok(hoverAll.includes(sel), `${sel} 必須關在 @media (hover: hover) 裡`);

  // 5) ::before 保留基礎 orbit；燒穿中粗度由共用輪廓周界接觸比例控制，不另跑定時 grow。
  //    覆寫後的時機與增粗由 starlit-card-ring.test.cjs 驗證；鼠標聚光仍用 ::after 並讓位。
  assert.match(
    css44,
    /\.starlit-ember\[data-lit='true'\]::before \{\n  opacity: 1;\n  animation: starlit-ember-orbit 7s linear infinite;\n\}/,
    '流光框保留基礎 orbit；接觸驅動粗度另由 burning 規則覆寫',
  );
  assert.match(
    css44,
    /\.starlit-ember::after \{\n  content: '';\n  position: absolute;\n  inset: 0;/,
    '鼠標邊框聚光用 ::after、蓋滿整張卡',
  );
  for (const state of ['data-lit', 'data-closing', 'data-burning'])
    assert.ok(
      css44.includes(`.starlit-ember-grid:hover .starlit-ember[${state}='true']::after`) &&
        css44.includes(`.starlit-ember[${state}='true']::after`),
      `${state} 時聚光邊框要讓位給流光框，而且要贏過 grid:hover 那條的權重`,
    );
  // 內容往內縮 1px，露出的那一圈就是邊框聚光（毛哥的 inset: 1px）。
  assert.match(css44, /\.starlit-ember-open \{[^}]*\n  margin: 1px;/, '開啟面內縮 1px');
  assert.match(
    css44,
    /\.starlit-work\.starlit-ember-face \{[^}]*\n  inset: 1px;/,
    '膜內縮 1px',
  );
  // 火的 canvas 仍然蓋滿整張卡（Ticket 45 在動火層，這一條只是確認 44 沒有把
  // 那 1px 的邊從火手上偷走 —— 內縮 1px 的是膜與開啟面，不是 canvas）。
  const block = (selector: string) => {
    const at = css44.indexOf(`${selector} {`);
    assert.notEqual(at, -1, `找不到 ${selector} 的規則`);
    return css44.slice(at, css44.indexOf('}', at));
  };
  assert.match(block('.starlit-ember-canvas'), /\n  inset: 0;/, '火的 canvas 維持 inset: 0');
  // 層級：火 ＞ 內部聚光 3 ＞ 膜 2 ＞ 開啟面 1 ＞ 聚光邊框／流光框 0。火的實際
  // 數字歸 Ticket 45 管，這裡只釘它要在內部聚光之上。
  const z = (selector: string) =>
    Number(block(selector).match(/z-index: (-?\d+);/)![1]);
  assert.deepEqual(
    [
      z('.starlit-ember::before'),
      z('.starlit-ember-open'),
      z('.starlit-work.starlit-ember-face'),
      z('.starlit-ember-spot'),
    ],
    [0, 1, 2, 3],
    '卡片內的層級：流光框／聚光邊框 0 → 開啟面 1 → 膜 2 → 內部聚光 3',
  );
  assert.ok(
    z('.starlit-ember-canvas') > z('.starlit-ember-spot'),
    '火的 canvas 要在內部聚光之上',
  );
  assert.match(
    css44,
    /\.starlit-ember::after \{[^}]*\n  z-index: 0;/,
    '聚光邊框跟流光框同層（偽元素順序讓 ::after 畫在 ::before 之上），都在內容之下',
  );

  // 6) reduced-motion 只拿掉過渡，不拿掉效果。
  const reduce = css44.slice(css44.indexOf('@media (prefers-reduced-motion: reduce)'));
  for (const sel of ['.starlit-ember::after', '.starlit-ember-spot'])
    assert.ok(
      new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{\\n    transition: none;`).test(
        reduce,
      ),
      `${sel} 在 reduced-motion 下只去掉過渡`,
    );


  console.log(
    'Ticket 44 cursor spotlight: one glow host per column, one pointermove, hover-gated CSS, the turning ring untouched: ok',
  );
}

await import('./starlit-reader.test.ts');

// Ticket 46（Review 44 F3）— 開啟面字級與置中的釘子，釘在 CSS 原始碼上：
// 頭列置中、名稱 17px；簡介 15px、置中。harness 的 face46 探針量的是實際 computed style。
{
  const css46 = fs.readFileSync(`${root}components/starlit-shell.css`, 'utf8');
  const rule46 = (sel: string) =>
    (css46.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')) ?? [, ''])[1];
  assert.match(rule46('.starlit-ember-head'), /justify-content:\s*center/, 'Ticket 46：開啟面頭列置中');
  // Ticket 48（使用者 2026-09-19：「稍縮小，減少換行」）：17 → 16、15 → 14。
  // 這份樣式表沒有第二條規則改這兩個字級（頭列與簡介在任何寬度都用同一個值），
  // 所以這兩條就是全部；置中與頭列的排法不動。
  assert.match(rule46('.starlit-ember-head-name'), /font-size:\s*16px/, 'Ticket 48：名稱 16px');
  assert.match(rule46('.starlit-ember-open p'), /font-size:\s*14px/, 'Ticket 48：簡介 14px');
  assert.equal(
    (css46.match(/\.starlit-ember-head-name\s*\{/g) ?? []).length,
    1,
    'Ticket 48：名稱只有一條規則（沒有別的斷點另外設字級）',
  );
  assert.equal(
    (css46.match(/\.starlit-ember-open p\s*\{/g) ?? []).length,
    1,
    'Ticket 48：簡介只有一條規則',
  );
  assert.match(rule46('.starlit-ember-open p'), /text-align:\s*center/, 'Ticket 46：簡介置中');
  assert.match(rule46('.starlit-ember-open .starlit-work-links'), /justify-content:\s*space-between/, 'Ticket 40.2：連結列仍一左一右');
}

// ---------------------------------------------------------------------------
// Ticket 47 — 加粗的流光框與舔邊火：把 lib 的常數和 CSS 真正畫出來的幾何對起來。
//
// 這一段是「5px」唯一不會各自漂走的地方。粗度是兩段加起來的（`::before` 往外凸
// ＋ 卡片內容往內縮 1px），而兩段分別寫在 CSS 的兩條規則裡；把它們和
// lib/ember-fire-gl.ts 的 EMBER_RING_PX / EMBER_RING_OUTSET_PX 綁在一起之後，
// 單獨改任何一邊都會 RED。舔邊火那一半釘的是「裁切線與 canvas 的邊界一致」——
// 卡片的 clip-path 只要比 canvas 小一點，火就會被切掉一條直邊。
// ---------------------------------------------------------------------------
{
  const css47 = fs.readFileSync(`${root}components/starlit-shell.css`, 'utf8');
  const source47 = fs.readFileSync(`${root}components/starlit-shell.tsx`, 'utf8');
  const fire = source47.slice(
    source47.indexOf('function StarlitEmberFire'),
    source47.indexOf('* Ticket 38 — a reveal block'),
  );
  assert.ok(fire.length > 2000, 'Ticket 47：找得到火的元件');
  const rule47 = (sel: string) =>
    (css47.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')) ?? [, ''])[1];
  const px = (body: string, prop: string) => {
    const m = body.match(new RegExp(`(?:^|\\n)\\s*${prop}:\\s*(-?[0-9.]+)px`));
    assert.ok(m, `找不到 ${prop}`);
    return Number(m![1]);
  };

  // ① 流光框：往外 4px ＋ 內容內縮 1px = 5px。
  const ring = rule47('.starlit-ember::before');
  assert.equal(
    -px(ring, 'inset'),
    emberFireGl.EMBER_RING_OUTSET_PX,
    `Ticket 47：::before 往外凸 ${emberFireGl.EMBER_RING_OUTSET_PX}px`,
  );
  assert.equal(
    px(rule47('.starlit-ember-open'), 'margin'),
    emberFireGl.EMBER_RING_INNER_PX,
    'Ticket 47：開啟面仍然內縮 1px（Ticket 44-B）',
  );
  assert.equal(
    px(rule47('.starlit-work.starlit-ember-face'), 'inset'),
    emberFireGl.EMBER_RING_INNER_PX,
    'Ticket 47：膜仍然內縮 1px（Ticket 44-B）',
  );
  assert.equal(
    -px(ring, 'inset') + px(rule47('.starlit-ember-open'), 'margin'),
    emberFireGl.EMBER_RING_PX,
    `Ticket 47：兩段加起來就是 ${emberFireGl.EMBER_RING_PX}px（使用者 2026-09-19 定案）`,
  );
  // 圓角跟著往外走，不然四個角會比四條邊薄。
  assert.equal(
    px(ring, 'border-radius'),
    px(rule47('.starlit-ember'), 'border-radius') + emberFireGl.EMBER_RING_OUTSET_PX,
    'Ticket 47：流光框的圓角與卡片同心',
  );

  // ② 舔邊火：卡片的 clip-path 要正好等於 canvas 的盒子。
  const clip = rule47('.starlit-ember').match(/clip-path:\s*inset\((-?[0-9.]+)px round ([0-9.]+)px\)/);
  assert.ok(clip, 'Ticket 47：卡片仍然用 clip-path: inset(... round ...)');
  assert.equal(
    -Number(clip![1]),
    emberFireGl.EDGE_FLAME_MARGIN_PX,
    `Ticket 47：裁切要放到 ${emberFireGl.EDGE_FLAME_MARGIN_PX}px（不然舔邊火一個像素都出不來）`,
  );
  assert.equal(
    Number(clip![2]),
    emberFireGl.EMBER_CARD_RADIUS_PX + emberFireGl.EDGE_FLAME_MARGIN_PX,
    'Ticket 47：裁切的圓角 = 膜的圓角 ＋ 邊界，與元件寫在 canvas 上的 inline border-radius 一致',
  );
  assert.ok(
    fire.includes('canvas.style.borderRadius = `${EMBER_FILM_RADIUS + edgeMargin}px`;'),
    'Ticket 47：canvas 自己的圓角就是同一個式子',
  );
  // canvas 的 CSS 規則本身不動（Ticket 44-B 釘著 inset: 0，2D 退路也靠它）。
  assert.match(rule47('.starlit-ember-canvas'), /inset:\s*0;/, 'Ticket 47：canvas 的 CSS 仍然 inset: 0，加大是元件寫 inline 的');
  assert.ok(
    fire.includes("canvas.style.left = `${-edgeMargin}px`;") &&
      fire.includes("canvas.style.top = `${-edgeMargin}px`;"),
    'Ticket 47：加大只由拿到 WebGL context 的那條路寫進去',
  );

  // ③ 版面：每一條縫都要比火伸出去的距離寬，鄰卡的字才不會被蓋到。
  const grid = rule47('.starlit-ember-grid');
  assert.ok(
    px(grid, 'gap') >= 24 && px(grid, 'gap') > emberFireGl.EDGE_FLAME_MARGIN_PX,
    `Ticket 47：桌機欄距 ≥ 24px 且大於火的 ${emberFireGl.EDGE_FLAME_MARGIN_PX}px，實得 ${px(grid, 'gap')}px`,
  );
  assert.ok(
    px(grid, 'margin-top') >= emberFireGl.EDGE_FLAME_MARGIN_PX + 8,
    `Ticket 47：格子上方要留得下火，實得 ${px(grid, 'margin-top')}px`,
  );
  assert.equal(rule47('.starlit-ember-grid').includes('overflow'), false, 'Ticket 47：格子不得有 overflow（火是靠 visible 跑出去的）');
  const narrow = css47.slice(css47.indexOf('@media (max-width: 850px)'));
  const narrowGrid = (narrow.match(/\.starlit-ember-grid \{([^}]*)\}/) ?? [, ''])[1];
  assert.ok(
    px(narrowGrid, 'gap') >= 28 && px(narrowGrid, 'gap') > emberFireGl.EDGE_FLAME_MARGIN_PX,
    `Ticket 47：390 單欄的上下距 ≥ 28px，實得 ${px(narrowGrid, 'gap')}px`,
  );
}

// ---------------------------------------------------------------------------
// 轉場著色器外火仍停用；明暗流動框由相鄰瀏覽器測試驗證。
{
  for (const mode of ['burn', 'close'] as const)
    for (const t of [0, 250, 500, 1500, 3000, 3400, 3800, 6000])
      assert.equal(emberFireGl.edgeFlameStrength(mode, t), 0);
  console.log('PASS transition outward flame remains disabled; run starlit-card-ring.test.cjs for the flowing border');
}
