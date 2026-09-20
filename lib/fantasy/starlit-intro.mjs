import { ease } from './orbit.mjs';
/**
 * 品牌名稱的唯一來源。拼寫已於 2026-09-15 修訂確定為 `Royal Milktea Master`
 * （brand-reading-revision.md），不再是暫定；改拼寫只需改這一行，UI 與 3D
 * 開場都跟著走。
 */
export const BRAND_NAME = 'Royal Milktea Master';
// The approved Chinese passages are fixed by the 2026-09-15 revision
// (work/starlit-implementation/visual-revision/brand-revision/requirements.md);
// the English ones keep the same line shape and imagery without adding facts
// of their own. The opening beat is no longer a poem: it is the brand itself,
// which the scene draws as the orthographic 3D word and the UI keeps as a
// readable heading, so both read the same string.
const COPY = {
  zh: {
    waiting: BRAND_NAME,
    front:
      '你好\n我是 皇家奶茶大師。\n\n一位 創作者，\n一名 AI全端工程師，\n一個正在一步步實現理想的 夢想家。',
    back: '我勇於追求\n\n技藝\n自由\n極限',
    invitation:
      '給來到這裡的你：\n歡迎來到我的天地~\n如果有機會，\n我們一起約出來喝杯奶茶吧!',
    cup: '說不定，我們暢談著，歡笑著，就一起幹了件——\n值得讓星空記下的事呢~',
    // Ticket 34-A（2026-09-17）：使用者重新給了標點版——全形逗號、全形分號、
    // 第四行前綴破折號「——」（Ticket 35：使用者說「-- 」是破折號，改成真正的破折號才對齊），第三行維持「神火」（使用者確認「星火」是誤植）。逐字照抄，不潤稿。
    ending:
      '我將星空收入掌，\n我將靈感斟入觴。\n我遂親手摘下神火，執炬先行，共聚星燭鑄天光。\n——向死而生，循心而行；願此長旅，終抵群星。',
  },
  en: {
    waiting: BRAND_NAME,
    front:
      'Hello\nI am Royal Milktea Master.\n\na creator,\nan AI full-stack engineer,\na dreamer realizing ideals step by step.',
    back: 'What I dare to pursue\n\nCraft\nFreedom\nLimits',
    invitation:
      'To you who have found your way here:\nWelcome to my own little world~\nif we get the chance,\nlet’s go out for a cup of milk tea together!',
    // 「呢」的語氣用 don’t you think 帶過，不另外加中文沒有的事實。
    cup: 'Who knows — talking away, laughing away, we might just pull off something —\nsomething worth the starry sky remembering, don’t you think~',
    ending:
      'I gather the starry sky into my palm ,\nI pour inspiration into the cup.\nSacred fire in hand, torch first, star candles forge the sky.\nToward death, by heart; may this long journey reach the stars.',
  },
};
/**
 * 正面介紹裡要加大加粗的關鍵字，依行序排列，每個都是該行的連續子字串。
 * 2026-09-16（Ticket 26）自介分成兩組：第一行「你好」是問候，本身不是關鍵字，
 * 所以這四個字對應的是問候之後的四行。最後一個（夢想家 / dreamer）另外帶星光掠過。
 */
export const INTRO_KEYWORDS = Object.freeze({
  zh: Object.freeze(['皇家奶茶大師', '創作者', 'AI全端工程師', '夢想家']),
  en: Object.freeze([
    'Royal Milktea Master',
    'creator',
    'AI full-stack engineer',
    'dreamer',
  ]),
});
export const LANGUAGES = Object.freeze(['zh', 'en']);
export const INTRO_COPY = Object.freeze(COPY.zh);
Object.freeze(COPY.en);
const known = (language) => (language === 'en' ? 'en' : 'zh');
export const introCopy = (language = 'zh') => COPY[known(language)];
/** Shown by the scene when the full 3D experience cannot start. */
export const SCENE_ERROR = Object.freeze({
  zh: '無法啟動完整體驗，請重試或更換瀏覽器。',
  en: 'The full experience could not start. Please try again, or open this page in another browser.',
});
export const CUP_CENTER = [1.65, 0.9, -1.6];
export const READING_STAGES = Object.freeze([
  'waiting',
  'front',
  'back',
  'invitation',
  'cup',
  'ending',
]);
const TRAVEL_SECONDS = 0.8;
const REVEAL_SECONDS = 2;
const shot = (step) => READING_STAGES.map((_, i) => Number(i === step));

export function createIntro() {
  let readingStep = 0,
    elapsed = 0,
    paused = false,
    language = 'zh';
  let weights = shot(0),
    from = weights,
    travel = null,
    terminal = '';
  function selectStep(next) {
    if (
      terminal ||
      !Number.isInteger(next) ||
      next < 0 ||
      next > 5 ||
      next === readingStep
    )
      return;
    const sameView =
      travel === null && [3, 4].includes(readingStep) && [3, 4].includes(next);
    from = [...weights]; // Freeze the actual in-flight view, never a prior endpoint.
    readingStep = next;
    elapsed = 0;
    travel = sameView ? null : 0;
    if (sameView) weights = shot(next);
  }
  function state() {
    const settled = travel === null && terminal !== 'error';
    const stage =
      terminal || (settled ? READING_STAGES[readingStep] : 'transition');
    const text = COPY[language][stage] || '';
    return {
      stage,
      readingStep,
      settled,
      elapsed,
      text,
      language,
      paused,
      // The UI reveals the entire string with a 2s CSS mask. This count is
      // progress metadata, not an additional typewriter before that mask.
      visibleChars: Math.floor(
        text.length * Math.min(1, elapsed / REVEAL_SECONDS),
      ),
      canAdvance: !terminal && readingStep < 5,
      emphasisFrom: stage === 'cup' ? text.lastIndexOf('\n') + 1 : -1,
      propReveal: weights[5],
      cameraWeights: [...weights],
    };
  }
  return {
    state,
    selectStep,
    tick(dt, hidden = false) {
      if (hidden || paused || terminal || !Number.isFinite(dt) || dt <= 0)
        return;
      if (travel !== null) {
        const used = Math.min(dt, TRAVEL_SECONDS - travel);
        travel += used;
        const u = ease(travel / TRAVEL_SECONDS),
          to = shot(readingStep);
        weights = from.map((v, i) => v + (to[i] - v) * u);
        dt -= used;
        if (travel < TRAVEL_SECONDS) return;
        weights = to;
        travel = null;
      }
      elapsed = Math.min(REVEAL_SECONDS, elapsed + dt);
    },
    advance() {
      selectStep(Math.min(5, readingStep + 1));
    },
    setLanguage(next) {
      language = known(next);
    },
    openContent() {
      if (terminal !== 'error') {
        terminal = 'done';
        paused = false;
      }
    },
    replay() {
      readingStep = 0;
      elapsed = 0;
      paused = false;
      weights = shot(0);
      from = weights;
      travel = null;
      terminal = '';
    },
    fail() {
      terminal = 'error';
      elapsed = 0;
    },
    pause(value) {
      paused = value;
    },
    // Inspection freezes the same product clock at a named reading destination.
    seek(name, seconds = 0) {
      const step = READING_STAGES.indexOf(name);
      if (step < 0) return;
      readingStep = step;
      elapsed = Math.max(0, Math.min(REVEAL_SECONDS, seconds));
      weights = shot(step);
      from = weights;
      travel = null;
      terminal = '';
      paused = true;
    },
  };
}

export function introCamera(path, state, aspect) {
  // Focus on the existing central face surface (reference-stars.f32), not sky.
  // The eye stays outside the face with clearance beyond the .02 near plane.
  const waiting = {
    ...path.near,
    target: [0, 0.77, 0.02],
    dist: 0.13,
    az: 0,
    el: 0,
    roll: 0,
  };
  const front = { ...path.near, target: [0.0034, 0.79, 0], dist: 0.95 };
  const cup = {
    ...path.wide,
    az: 265,
    el: 9,
    dist: 2.9,
    target: [CUP_CENTER[0], CUP_CENTER[1] + 0.11, CUP_CENTER[2]],
    roll: 0,
  };
  const shots = [waiting, front, path.rear, cup, cup, path.wide];
  const weights = state.cameraWeights;
  const c = {
    target: [0, 0, 0],
    az: 0,
    el: 0,
    dist: 0,
    roll: 0,
    fov: 0,
    frameScaleY: 1,
  };
  shots.forEach((view, i) => {
    for (const key of ['az', 'el', 'dist', 'roll', 'fov'])
      c[key] += (view[key] || 0) * weights[i];
    view.target.forEach((v, axis) => {
      c.target[axis] += v * weights[i];
    });
  });
  // Full-window framing. Preserve subject width on narrow phones without the
  // former content-column aspect assumptions; waiting intentionally stays close.
  const fit = Math.max(1, 0.8 / Math.max(0.1, aspect));
  const scale = 1 + (fit - 1) * (1 - weights[0]);
  c.fov =
    (Math.atan(Math.tan((c.fov * Math.PI) / 360) * scale) * 360) / Math.PI;
  return c;
}
