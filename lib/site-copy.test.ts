import assert from 'node:assert/strict';
import { introCopy } from './fantasy/starlit-intro.mjs';
import {
  applyDocumentLanguage,
  BRAND_NAME,
  copy,
  HTML_LANG,
  LANGUAGE_KEY,
  LANGUAGES,
  readLanguage,
  saveLanguage,
  SITE_COPY,
} from './site-copy.ts';
import { localizedProjects, projects } from './projects.ts';

// R09: the whole site exists in both languages, not just the menu.
assert.deepEqual(LANGUAGES, ['zh', 'en']);
assert.deepEqual(Object.keys(SITE_COPY), ['zh', 'en']);
// Ticket 29-A: the small second form of a block heading. Chinese sets 教育 /
// EDUCATION beside each other; the English heading already reads as that small
// label, so its second form is deliberately empty.
const optional = new Set([
  'educationSmall',
  'recognitionSmall',
  'skillsSmall',
  'nowSmall',
]);
const compare = (zh: unknown, en: unknown, path: string) => {
  if (typeof zh === 'string') {
    assert.equal(typeof en, 'string', `${path} is missing in English`);
    if (!optional.has(path.split('.').at(-1) ?? ''))
      assert(String(en).trim(), `${path} is empty in English`);
    return;
  }
  if (Array.isArray(zh)) {
    assert(Array.isArray(en) && en.length === zh.length, `${path} length`);
    zh.forEach((item, i) =>
      compare(item, (en as unknown[])[i], `${path}[${i}]`),
    );
    return;
  }
  const keys = Object.keys(zh as object);
  assert.deepEqual(Object.keys(en as object), keys, `${path} keys`);
  for (const key of keys)
    compare(
      (zh as Record<string, unknown>)[key],
      (en as Record<string, unknown>)[key],
      `${path}.${key}`,
    );
};
compare(SITE_COPY.zh, SITE_COPY.en, 'copy');

// Chapter labels, controls, errors and retry all differ per language.
for (const [zh, en] of [
  [SITE_COPY.zh.sections[0].label, SITE_COPY.en.sections[0].label],
  [SITE_COPY.zh.about.tagline, SITE_COPY.en.about.tagline],
  [SITE_COPY.zh.about.name, SITE_COPY.en.about.name],
  [SITE_COPY.zh.about.nameSub, SITE_COPY.en.about.nameSub],
  [SITE_COPY.zh.about.education, SITE_COPY.en.about.education],
  [SITE_COPY.zh.about.skills, SITE_COPY.en.about.skills],
  [SITE_COPY.zh.about.now, SITE_COPY.en.about.now],
  [SITE_COPY.zh.about.nowLines[0], SITE_COPY.en.about.nowLines[0]],
  [SITE_COPY.zh.works.detail, SITE_COPY.en.works.detail],
  [SITE_COPY.zh.contact.lead, SITE_COPY.en.contact.lead],
  [SITE_COPY.zh.preview.error, SITE_COPY.en.preview.error],
  [SITE_COPY.zh.preview.retry, SITE_COPY.en.preview.retry],
  [SITE_COPY.zh.preview.hint, SITE_COPY.en.preview.hint],
  [SITE_COPY.zh.preview.role, SITE_COPY.en.preview.role],
  [SITE_COPY.zh.preview.entryWorks, SITE_COPY.en.preview.entryWorks],
  [SITE_COPY.zh.preview.entryAbout, SITE_COPY.en.preview.entryAbout],
  [SITE_COPY.zh.preview.poem, SITE_COPY.en.preview.poem],
  [SITE_COPY.zh.languageSwitchAria, SITE_COPY.en.languageSwitchAria],
  [SITE_COPY.zh.preview.title, SITE_COPY.en.preview.title],
])
  assert.notEqual(en, zh, `${zh} was left untranslated`);
// Spec R4：近況是四項，兩語都要有——少一項或多一項都是漏掉／自行新增。
for (const language of LANGUAGES)
  assert.equal(SITE_COPY[language].about.nowLines.length, 4, `${language} 近況要四項`);
assert.equal(copy('de' as 'zh'), SITE_COPY.zh, 'unknown language falls back');
assert.deepEqual(HTML_LANG, { zh: 'zh-Hant', en: 'en' });
console.log('bilingual copy covers every chapter, control and error: PASS');

// The tab title and <html lang> follow the language, and the route gives both
// back when it stops owning them.
const doc = {
  title: '皇家奶茶大師 · 星空工房',
  documentElement: { lang: 'zh-Hant' },
};
const original = { title: doc.title, lang: doc.documentElement.lang };
const undoChinese = applyDocumentLanguage(doc, 'zh');
assert.equal(doc.title, SITE_COPY.zh.preview.title, 'Chinese tab title');
assert.equal(doc.documentElement.lang, 'zh-Hant');
undoChinese();
assert.deepEqual(
  { title: doc.title, lang: doc.documentElement.lang },
  original,
  'leaving restores what the document had before',
);
const undoEnglish = applyDocumentLanguage(doc, 'en');
assert.equal(doc.title, SITE_COPY.en.preview.title, 'English tab title');
assert.equal(doc.documentElement.lang, 'en');
assert(!/[一-鿿]/.test(doc.title), 'no Chinese left in the English tab title');
// A switch is restore-then-apply: the pair never carries the other language
// over, and the last undo still returns the document to where it started.
const undoBack = applyDocumentLanguage(doc, 'zh');
assert.equal(doc.title, SITE_COPY.zh.preview.title);
undoBack();
assert.equal(doc.title, SITE_COPY.en.preview.title, 'undo is one step');
assert.equal(doc.documentElement.lang, 'en');
undoEnglish();
assert.deepEqual(
  { title: doc.title, lang: doc.documentElement.lang },
  original,
  'unmount hands the document back untouched',
);
console.log('localized tab title applied and restored: PASS');

// Works keep one source; English is the same entry in the other language.
const english = localizedProjects('en');
assert.equal(localizedProjects('zh'), projects, 'Chinese uses the source list');
assert.deepEqual(
  english.map((p) => p.id),
  projects.map((p) => p.id),
);
english.forEach((p, i) => {
  const source = projects[i];
  assert.deepEqual(p.tech, source.tech, `${p.id} keeps its tech list`);
  assert.deepEqual(
    p.links.map((l) => l.url),
    source.links.map((l) => l.url),
    `${p.id} keeps its links`,
  );
  for (const field of ['title', 'category', 'summary', 'detail'] as const)
    assert(
      !/[一-鿿]/.test(p[field]),
      `${p.id} ${field} is still Chinese in English`,
    );
  assert.equal(source.summary, projects[i].summary, 'Chinese entry untouched');
});
console.log('projects stay the single source in both languages: PASS');

// The language preference lives in its own browser key.
assert.equal(LANGUAGE_KEY, 'starlit-language');
const store = new Map<string, string>([['starlit-muted', 'true']]);
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  },
});
assert.equal(readLanguage(), 'zh', 'no stored choice means Chinese');
saveLanguage('en');
assert.equal(store.get(LANGUAGE_KEY), 'en');
assert.equal(store.get('starlit-muted'), 'true', 'sound preference untouched');
assert.equal(readLanguage(), 'en');
saveLanguage('zh');
assert.equal(readLanguage(), 'zh');
assert.equal(store.get('starlit-muted'), 'true');
store.set(LANGUAGE_KEY, 'klingon');
assert.equal(readLanguage(), 'zh', 'an unusable stored value falls back');
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  },
});
assert.equal(readLanguage(), 'zh', 'a blocked store still renders the site');
saveLanguage('en');
console.log(
  'language preference: own key, kept per browser, safe fallback: PASS',
);

// The opening no longer carries a kicker, a caption, a CLICK frame or an
// advance button: reading is scrolling, and the only prompts are plain words.
for (const language of LANGUAGES) {
  const preview = SITE_COPY[language].preview as Record<string, unknown>;
  for (const gone of [
    'caption',
    'kickerPrelude',
    'kickerName',
    'click',
    'advance',
    'reading3d',
    'words',
    'statusBetween',
    'resume',
    // 2026-09-15: 結尾不再有「歡迎聯繫」大標，改成品牌與職稱。
    'invite',
  ])
    assert.equal(preview[gone], undefined, `${gone} is no longer shown`);
  // One accessible name per beat, in reading order.
  assert.equal(SITE_COPY[language].preview.beats.length, 6);
  for (const beat of SITE_COPY[language].preview.beats) assert.ok(beat.trim());
}
console.log('opening copy: six beats, frameless prompts, no CLICK: PASS');

// 2026-09-15 品牌修訂：拼寫只有一個來源，開場與結尾都拿同一個字串，改一處全改。
assert.equal(BRAND_NAME, 'Royal Milktea Master');
for (const language of LANGUAGES) {
  const t = SITE_COPY[language];
  assert.equal(t.preview.brand, BRAND_NAME);
  assert.equal(t.footer, BRAND_NAME);
  assert.equal(t.brandName, BRAND_NAME.toUpperCase());
  assert.equal(introCopy(language).waiting, BRAND_NAME, '開場字幕就是品牌');
  // 四個加大加粗的關鍵字，依行序（問候之後那四行），而且真的出現在該行裡。
  const lines = introCopy(language).front.split('\n').filter(Boolean);
  assert.equal(t.preview.keywords.length, 4);
  t.preview.keywords.forEach((word, i) =>
    assert.ok(
      lines[i + 1].includes(word),
      `${language}: ${word} 不在第 ${i + 1} 行`,
    ),
  );
}
// 結尾入口的文字與 aria 名稱互相對得上，右欄四行詩是完整四行。
for (const language of LANGUAGES) {
  const t = SITE_COPY[language];
  assert.ok(t.preview.works.includes(t.preview.entryWorks));
  assert.ok(t.preview.about.includes(t.preview.entryAbout));
  assert.equal(introCopy(language).ending.split('\n').length, 4);
}
// Ticket 29-A：/關於我 的名片式檔案。舊的 kicker／標題／lead／歷程／膠囊欄位
// 全部不再存在，教育只有校名而沒有任何年份。
for (const language of LANGUAGES) {
  const about = SITE_COPY[language].about as unknown as Record<string, unknown>;
  for (const gone of [
    'kicker',
    'title',
    'titleEm',
    'lead',
    'journey',
    'journeySmall',
    'timeline',
    'toolkit',
    'toolkitSmall',
  ])
    assert.equal(about[gone], undefined, `about.${gone} 已不再使用`);
  const t = SITE_COPY[language].about;
  assert.equal(t.schools.length, 3, '教育三所學校');
  for (const school of t.schools) {
    assert.ok(school.trim());
    assert.equal(/\d/.test(school), false, `${school} 不得帶年份`);
  }
  assert.equal(t.skillGroups.length, 2, '技能兩塊');
  for (const group of t.skillGroups) {
    assert.ok(group.heading.trim());
    for (const item of group.items) assert.ok(item.trim());
  }
  assert.equal(t.awards.length, 2, '得獎兩筆');
  assert.ok(t.portraitAlt.trim(), '個人照要有 alt');
}
// Ticket 30-A.6：出血取消，所以 alt 不再說「切齊頁面邊緣」。期望值同樣寫死。
assert.equal(SITE_COPY.zh.about.portraitAlt, '林品宏與一隻黑白貓的合照');
assert.equal(
  SITE_COPY.en.about.portraitAlt,
  'Pin Hung Lin with a black-and-white cat',
);
for (const language of LANGUAGES)
  assert.equal(
    /切|edge|bleed/i.test(SITE_COPY[language].about.portraitAlt),
    false,
    `${language}：alt 不該再描述已取消的出血`,
  );
// Review A MINOR-1：技能 20 項與兩筆得獎的文字必須被「寫死在這裡」的期望值釘住。
// 下面每一個字串都是手打進這個檔案的，**不得**改成從 SITE_COPY／site-copy.ts
// 取值——那樣是同義反覆，改壞一個字測試也跟著改，永遠不會紅。
// 中文側的 20 項與兩筆得獎逐字來自 Ticket 29 票面；英文側是本站的譯文，
// 由 Review A 在真實瀏覽器逐字複驗過，這裡把它釘住以防日後被無聲改動。
const EXPECTED_SKILLS = {
  zh: [
    {
      heading: '專業',
      items: [
        '全端開發',
        'AI Agents 開發',
        'Multi-Agents 協作系統',
        'Python 自動化開發',
        '資料分析與視覺化',
        '遊戲企劃',
        '劇本創作',
      ],
    },
    {
      heading: '程式語言與應用',
      items: [
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
    },
  ],
  en: [
    {
      heading: 'Expertise',
      items: [
        'Full-stack development',
        'AI agent development',
        'Multi-agent collaboration systems',
        'Python automation',
        'Data analysis and visualisation',
        'Game design',
        'Scriptwriting',
      ],
    },
    {
      heading: 'Languages & tools',
      items: [
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
    },
  ],
} as const;
// Ticket 30-A.5：得獎資料更新。每一個字串都是手打進這個檔案的期望值，
// **不得**改成從 SITE_COPY 取值。第二筆的兩個成績是 `lines` 裡的兩個元素，
// 不是一個用 `·` 串起來的字串——「兩行」這件事就釘在這個結構上。
const EXPECTED_AWARDS = {
  zh: [
    {
      year: '2026',
      title: 'AWS 雲湧智生黑客松',
      lines: ['智慧交易冠軍'],
    },
    {
      year: '2026',
      // Ticket 30-D.2：官方寫法是全大寫 SITCON，而且寫在字面值裡。
      title: 'SITCON 台灣未來祭',
      lines: ['AI 創意科技優勝', 'AI 綜合賽道 第四'],
    },
  ],
  en: [
    {
      year: '2026',
      title: 'AWS 雲湧智生 Hackathon',
      lines: ['Smart Trading — First Place'],
    },
    {
      year: '2026',
      title: 'SITCON 台灣未來祭 Festival',
      // Ticket 30-D.8：兩行統一成 Title Case。
      lines: [
        'AI Creative Technology — Winner',
        'AI Overall Track — 4th Place',
      ],
    },
  ],
} as const;
const EXPECTED_SCHOOLS = {
  zh: ['市立青溪國民中學', '國立武陵高中', '國立成功大學 光電科學與工程學系'],
  en: [
    'Qingxi Municipal Junior High School',
    'National Wuling Senior High School',
    'National Cheng Kung University — Department of Photonics Science and Engineering',
  ],
} as const;
for (const language of LANGUAGES) {
  const t = SITE_COPY[language].about;
  // deepEqual 而不是 includes：多一項、少一項、換順序、改一個字都會紅。
  assert.deepEqual(
    t.skillGroups.map((g) => ({ heading: g.heading, items: [...g.items] })),
    EXPECTED_SKILLS[language].map((g) => ({
      heading: g.heading,
      items: [...g.items],
    })),
    `${language}：技能兩塊 20 項逐字不符`,
  );
  assert.equal(
    t.skillGroups[0].items.length,
    7,
    `${language}：第一塊技能剛好 7 項`,
  );
  assert.equal(
    t.skillGroups[1].items.length,
    13,
    `${language}：第二塊技能剛好 13 項`,
  );
  assert.deepEqual(
    t.awards.map((a) => ({
      year: a.year,
      title: a.title,
      lines: [...a.lines],
    })),
    EXPECTED_AWARDS[language].map((a) => ({
      year: a.year,
      title: a.title,
      lines: [...a.lines],
    })),
    `${language}：得獎兩筆逐字不符（30-A.5）`,
  );
  // 30-A.5：第二筆是兩行成績，而且沒有任何一行是用 `·` 把兩個成績串起來的。
  assert.equal(t.awards[0].lines.length, 1, `${language}：第一筆得獎一行成績`);
  assert.equal(t.awards[1].lines.length, 2, `${language}：第二筆得獎兩行成績`);
  for (const award of t.awards)
    for (const line of award.lines)
      assert.equal(
        line.includes('·'),
        false,
        `${language}：「${line}」不得把兩個成績併成一行`,
      );
  // AWS／SITCON 前綴兩語都保留。Ticket 30-D.2：SITCON 全大寫是官方寫法，而且
  // 是字面值全大寫——所以這裡連「不得出現小寫形式」一起釘住，避免有人改回
  // `Sitcon` 再用 `text-transform: uppercase` 在畫面上補救：那樣 DOM 文字會與
  // 看到的字不一致，複製、朗讀與站內搜尋拿到的都還是小寫。
  assert.ok(t.awards[0].title.startsWith('AWS '), `${language}：第一筆要有 AWS 前綴`);
  assert.ok(
    t.awards[1].title.startsWith('SITCON '),
    `${language}：第二筆要有 SITCON 前綴（全大寫）`,
  );
  assert.equal(
    t.awards.some((a) => a.title.includes('Sitcon')),
    false,
    `${language}：不得再出現小寫的 Sitcon`,
  );
  assert.deepEqual(
    [...t.schools],
    [...EXPECTED_SCHOOLS[language]],
    `${language}：教育三校逐字不符`,
  );
}
// 主名用頁面語言、副名用另一種書寫形式，與 header 的 brandName／brandSub 同一對。
assert.equal(SITE_COPY.zh.about.nameSub, SITE_COPY.zh.brandName);
assert.equal(SITE_COPY.en.about.nameSub, SITE_COPY.en.brandSub);
assert.equal(SITE_COPY.en.about.name, BRAND_NAME);
assert.equal(SITE_COPY.zh.about.name, '皇家奶茶大師');
assert.equal(SITE_COPY.zh.about.tagline, '熱愛 AI 與遊戲的夢想家');
// 英文側完全沒有中文（兩個獎項名稱除外，它們沒有官方英文）。
for (const value of [
  SITE_COPY.en.about.name,
  SITE_COPY.en.about.nameSub,
  SITE_COPY.en.about.tagline,
  ...SITE_COPY.en.about.schools,
  ...SITE_COPY.en.about.skillGroups.flatMap((g) => [g.heading, ...g.items]),
])
  assert.ok(!/[一-鿿]/.test(value), `${value} 英文側還有中文`);
console.log(
  'about profile: name card, portrait alt, 20 skills, 2 awards (AWS / SITCON, second one two lines), 3 schools pinned word for word: PASS',
);

// Ticket 27：使用者原稿的四行詩（半形空格、逗號、分號照抄）。
assert.equal(
  introCopy('zh').ending,
  // Ticket 34-A：使用者 2026-09-17 給的標點版，逐字。
  '我將星空收入掌，\n我將靈感斟入觴。\n我遂親手摘下神火，執炬先行，共聚星燭鑄天光。\n——向死而生，循心而行；願此長旅，終抵群星。',
);
console.log('brand spelling, front keywords, closing poem: PASS');
