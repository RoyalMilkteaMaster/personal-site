import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BRAND_NAME,
  createIntro,
  introCamera,
  INTRO_COPY,
  introCopy,
  INTRO_KEYWORDS,
  READING_STAGES,
  SCENE_ERROR,
} from './fantasy/starlit-intro.mjs';
import { createPath, cameraEye } from './fantasy/orbit.mjs';
import { cameraFrame } from './fantasy/camera.mjs';
import { frameDelta } from './fantasy/scene.mjs';

const path = createPath(
  JSON.parse(
    fs.readFileSync(
      new URL('../public/fantasy/camera-alignment.json', import.meta.url),
      'utf8',
    ),
  ),
);
const player = createIntro();
const camera = (aspect = 16 / 9) => introCamera(path, player.state(), aspect);
const values = (c: ReturnType<typeof camera>) => [
  c.az,
  c.el,
  c.dist,
  c.roll,
  c.fov,
  ...c.target,
];
assert.deepEqual(READING_STAGES, [
  'waiting',
  'front',
  'back',
  'invitation',
  'cup',
  'ending',
]);
// 2026-09-15 核准文案。開場不再是四句詩，而是品牌本身；四句詩移到結尾。
assert.equal(INTRO_COPY.waiting, BRAND_NAME);
assert.equal(introCopy('en').waiting, BRAND_NAME, '品牌兩語共用同一個拼寫');
assert.equal(BRAND_NAME, 'Royal Milktea Master');
// 2026-09-16 使用者逐字指定的內容；Ticket 26 在最前面加上問候，並用一個空行把
// 「你好／我是」與下面三句分成兩組（空行是組距，讀出來仍是同一段的幾行）。
assert.equal(
  INTRO_COPY.front,
  '你好\n我是 皇家奶茶大師。\n\n一位 創作者，\n一名 AI全端工程師，\n一個正在一步步實現理想的 夢想家。',
);
assert.equal(introCopy('en').front.split('\n')[0], 'Hello', '英文有等意問候');
for (const language of ['zh', 'en'] as const) {
  const groups = introCopy(language)
    .front.split('\n\n')
    .map((group) => group.split('\n').filter(Boolean));
  assert.equal(groups.length, 2, `${language}: 自介分成兩組`);
  assert.deepEqual(
    groups.map((group) => group.length),
    [2, 3],
    `${language}: 上面問候與名字，下面三句`,
  );
}
// 每個關鍵字前面都留一個空白，關鍵字才和前面的量詞分得開（問候那一行不算）。
INTRO_KEYWORDS.zh.forEach((word, i) => {
  const line = INTRO_COPY.front.split('\n').filter(Boolean)[i + 1];
  const at = line.indexOf(word);
  assert.ok(at > 0 && line[at - 1] === ' ', `第 ${i + 1} 行的 ${word} 前面要有空白`);
});
// Ticket 26：引句改成「我勇於追求」，英文同步。
assert.equal(INTRO_COPY.back, '我勇於追求\n\n技藝\n自由\n極限');
assert.equal(introCopy('en').back, 'What I dare to pursue\n\nCraft\nFreedom\nLimits');
// Ticket 27：邀請是使用者核准的四行，一字不差。
assert.equal(
  INTRO_COPY.invitation,
  '給來到這裡的你：\n歡迎來到我的天地~\n如果有機會，\n我們一起約出來喝杯奶茶吧!',
);
// 2026-09-16：結尾那一句改成使用者指定的字，一字不差、沒有尾綴。
// Ticket 27 再加上「呢」的語氣。
assert.equal(
  INTRO_COPY.cup,
  '說不定，我們暢談著，歡笑著，就一起幹了件——\n值得讓星空記下的事呢~',
);
// Ticket 27：四行詩照使用者原稿，連半形空格、半形逗號與分號都不動，不潤稿。
assert.equal(
  INTRO_COPY.ending,
  // Ticket 34-A：使用者 2026-09-17 給的標點版，逐字。
  '我將星空收入掌，\n我將靈感斟入觴。\n我遂親手摘下神火，執炬先行，共聚星燭鑄天光。\n——向死而生，循心而行；願此長旅，終抵群星。',
);
// 兩語的詩都是四行，英文是等意翻譯而不是另一首詩。
for (const language of ['zh', 'en'] as const) {
  assert.equal(introCopy(language).ending.split('\n').length, 4);
  assert.equal(introCopy(language).invitation.split('\n').length, 4);
}
// 使用者刪掉的舊句子不得留在任何一語的文案裡。
for (const language of ['zh', 'en'] as const)
  for (const gone of [
    '星空斟入玉觴',
    '但在這些之前',
    '值得讓世界記住的事',
    // Ticket 27 換掉的上一版邀請與四行詩。
    '在星空下喝杯奶茶',
    '將星空收入手掌',
    '散落的星願',
    'under the stars',
    'jade cup',
    '會讓星光記住的事',
    '數位內容創作者',
    'AI 應用全端工程師',
    'digital content creator',
    '歡迎走近我的世界',
    '都歡迎找我聊聊合作',
    'Let’s connect',
    'jade cup into which',
  ])
    for (const passage of Object.values(introCopy(language)))
      assert.equal(
        String(passage).includes(gone),
        false,
        `${gone} 已被 2026-09-15 修訂取代`,
      );
// 問候之後的四行每一行都含有自己的關鍵字，關鍵字是該行的連續子字串。
for (const language of ['zh', 'en'] as const) {
  const lines = introCopy(language).front.split('\n').filter(Boolean);
  const keywords = INTRO_KEYWORDS[language];
  assert.equal(keywords.length, 4);
  assert.equal(lines.length, 5, '一句問候加四行自介');
  keywords.forEach((word, i) =>
    assert.ok(
      lines[i + 1].includes(word),
      `${language} 第 ${i + 1} 行沒有關鍵字 ${word}`,
    ),
  );
}
// 背面三個大字剛好三個，才停得在最後一個。
for (const language of ['zh', 'en'] as const)
  assert.equal(
    introCopy(language)
      .back.split('\n')
      .filter((line) => line.trim()).length,
    4,
    '一句小引句加三個大字',
  );
assert(SCENE_ERROR.zh && SCENE_ERROR.en);
assert.equal(introCopy('unknown'), introCopy('zh'));

// No passage, including the invitation and ending, advances on elapsed time.
for (const language of ['zh', 'en']) {
  player.replay();
  player.setLanguage(language);
  for (const step of [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]) {
    player.selectStep(step);
    if (!player.state().settled) {
      player.tick(0.4);
      assert.equal(player.state().text, '');
      assert.equal(player.state().visibleChars, 0);
      player.tick(0.4);
    }
    assert(player.state().settled);
    assert.equal(player.state().readingStep, step);
    assert.equal(player.state().stage, READING_STAGES[step]);
    const shot = camera();
    player.tick(1);
    const middle = player.state();
    assert(middle.visibleChars > 0 && middle.visibleChars < middle.text.length);
    player.tick(1);
    assert.equal(player.state().visibleChars, player.state().text.length);
    player.tick(3600);
    assert.equal(player.state().stage, READING_STAGES[step]);
    assert.deepEqual(camera(), shot, 'reading never moves the camera');
  }
}
console.log(
  'six passages, forwards/backwards, settled text gate, 2s reveal, indefinite hold: PASS',
);

// Observe the first positive-dt frame, not the unchanged weights at request time.
const flight = createIntro();
const eye = () => cameraEye(introCamera(path, flight.state(), 16 / 9));
const distance = (a: number[], b: number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]));
flight.selectStep(1);
flight.tick(0.3);
const normalBefore = eye();
flight.tick(1 / 60);
const redirectBefore = eye();
const normalMotion = distance(normalBefore, redirectBefore);
flight.selectStep(3);
flight.tick(1 / 60);
const redirectedMotion = distance(redirectBefore, eye());
assert(normalMotion > 0);
assert(
  redirectedMotion <= 2 * normalMotion,
  'first positive-dt retarget frame must remain within normal frame motion',
);
console.log(JSON.stringify({ normalMotion, redirectedMotion }));

// Retarget a moving view repeatedly; each new request starts at the rendered view.
player.replay();
for (const step of [2, 0, 5, 1, 4, 2, 5]) {
  const before = camera();
  player.selectStep(step);
  assert.deepEqual(
    camera(),
    before,
    'no snap to an old endpoint when redirecting',
  );
  player.tick(0.17);
  assert(!player.state().settled);
  assert.equal(player.state().text, '');
  for (const aspect of [0.45, 0.75, 1, 16 / 9, 2.4]) {
    assert(values(camera(aspect)).every(Number.isFinite));
    assert(camera(aspect).dist > 0.02);
    assert.equal(
      cameraFrame(camera(aspect), { width: aspect * 1000, height: 1000 })
        .viewport[3],
      1000,
    );
  }
}
player.tick(0.8);
assert.equal(
  player.state().stage,
  'ending',
  'last target wins without queued intermediate acts',
);
const ending = camera();
player.tick(10000);
assert.equal(player.state().stage, 'ending');
assert.deepEqual(camera(), ending);
player.openContent();
assert.equal(
  player.state().stage,
  'done',
  'only explicit content opening ends the intro',
);
player.selectStep(0);
assert.equal(
  player.state().stage,
  'done',
  'scroll after content opening cannot replay',
);
player.replay();
assert.equal(player.state().stage, 'waiting');

// Language changes preserve both transition position and reveal fraction.
player.selectStep(2);
player.tick(0.3);
let before = camera();
player.setLanguage('en');
assert.deepEqual(camera(), before);
assert.equal(player.state().text, '');
const hidden = player.state();
player.tick(100, true);
assert.deepEqual(player.state(), hidden);
player.pause(true);
const paused = player.state();
player.tick(100);
assert.deepEqual(player.state(), paused);
player.pause(false);
player.tick(0.5);
player.tick(0.8);
const fraction = player.state().visibleChars / player.state().text.length;
before = camera();
player.setLanguage('zh');
assert.deepEqual(camera(), before);
assert(
  Math.abs(
    player.state().visibleChars / player.state().text.length - fraction,
  ) < 0.07,
);
const untouched = player.state();
for (const bad of [NaN, Infinity, -1, 6, 1.5, undefined])
  player.selectStep(bad);
assert.deepEqual(player.state(), untouched);
player.fail();
player.tick(100);
player.selectStep(1);
player.openContent();
assert.equal(player.state().stage, 'error');
player.replay();
assert.equal(player.state().stage, 'waiting');
assert.equal(frameDelta(0.3, true), 0.3);
assert.equal(frameDelta(20, true), 0.5);
assert.equal(frameDelta(0.3), 0.05);
console.log(
  'redirect, explicit content opening, replay, hidden/pause, language, invalid input/error: PASS',
);

// Project the actual existing surface stars, with facing and near-plane checks.
// This catches the previous sky-only waiting camera without a screenshot oracle.
const bytes = fs.readFileSync(
  new URL('../public/fantasy/reference-stars.f32', import.meta.url),
);
const stars = new Float32Array(
  bytes.buffer,
  bytes.byteOffset,
  bytes.byteLength / 4,
);
for (const aspect of [0.46, 16 / 9]) {
  const counts: number[] = [];
  for (const stage of ['waiting', 'front']) {
    player.seek(stage, 2);
    const frame = cameraFrame(camera(aspect), {
      width: aspect * 1000,
      height: 1000,
    });
    let visible = 0,
      outside = 0;
    for (let i = 0; i < stars.length; i += 8) {
      const p = Array.from(stars.slice(i, i + 3));
      if (p[1] < 0.74 || p[1] > 0.87 || Math.abs(p[0]) > 0.08) continue;
      const facing = p.reduce(
        (sum, v, j) => sum + stars[i + j + 3] * (frame.eye[j] - v),
        0,
      );
      if (facing <= 0) continue;
      const clip = [0, 1, 2, 3].map(
        (row) =>
          frame.M[row + 12] +
          p.reduce((sum, v, j) => sum + frame.M[j * 4 + row] * v, 0),
      );
      if (clip[3] > 0 && clip.slice(0, 3).every((v) => Math.abs(v) < clip[3]))
        visible++;
      else outside++;
    }
    assert(
      visible > 5,
      `${stage}: real face stars remain visible at aspect ${aspect}`,
    );
    if (stage === 'waiting')
      assert(outside > visible, 'extreme closeup excludes most of the face');
    else assert(visible > outside, 'front framing includes the central face');
    counts.push(visible);
  }
  assert(counts[1] > counts[0] * 2, 'dolly out reveals more of the same face');
  console.log(
    `actual face projection ${aspect.toFixed(2)}: waiting=${counts[0]}, front=${counts[1]}: PASS`,
  );
}
