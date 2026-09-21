import {
  BRAND_NAME,
  INTRO_KEYWORDS,
  SCENE_ERROR,
} from './fantasy/starlit-intro.mjs';

/** 品牌拼寫的唯一來源，重新匯出讓元件只認識 site-copy。 */
export { BRAND_NAME };

/**
 * Every visitor-facing string of the starlit site in both languages, kept in
 * one place: the six reading beats live with the opening scene in
 * `lib/fantasy/starlit-intro.mjs`, everything else lives here. Chapter content
 * is translated, not just the menu, and no English line adds a personal fact
 * the Chinese one does not state.
 */
export type Language = 'zh' | 'en';
export const LANGUAGES: Language[] = ['zh', 'en'];
/** Its own browser key; the sound preference owns a separate one. */
export const LANGUAGE_KEY = 'starlit-language';

export const isLanguage = (value: unknown): value is Language =>
  value === 'zh' || value === 'en';

export function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : 'zh';
  } catch {
    return 'zh';
  }
}

export function saveLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // A blocked store only costs this browser its preference.
  }
}

/** The `lang` attribute that belongs to each language. */
export const HTML_LANG: Record<Language, string> = {
  zh: 'zh-Hant',
  en: 'en',
};

type DocumentLike = { title: string; documentElement: { lang: string } };

/**
 * Points the document at `language` and returns the undo for whatever was
 * there before, so a route hands the tab title and `lang` back when it stops
 * owning them (language change, or leaving the route).
 */
export function applyDocumentLanguage(doc: DocumentLike, language: Language) {
  const before = { title: doc.title, lang: doc.documentElement.lang };
  doc.documentElement.lang = HTML_LANG[language];
  doc.title = copy(language).preview.title;
  return () => {
    doc.title = before.title;
    doc.documentElement.lang = before.lang;
  };
}

export type SiteCopy = {
  sections: { value: string; label: string }[];
  navAria: string;
  brandAria: string;
  brandName: string;
  brandSub: string;
  controlsAria: string;
  languageLabel: string;
  languageSwitch: string;
  languageSwitchAria: string;
  languageStatus: string;
  footer: string;
  /**
   * Ticket 29-A: the profile reads like a name card — the name set large, the
   * other writing form of it under that, then one line of self-positioning —
   * followed by three ruled blocks. Per the 2026-09-17 decision the blocks read
   * 技能/SKILLS → 教育/EDUCATION → 得獎/RECOGNITION; what used to be
   * 歷程/JOURNEY is now education, recognition is unchanged, and the toolkit's
   * pills became two plain columns of skills.
   */
  about: {
    /** Set large and heavy, in the page's own language. */
    name: string;
    /** The same person in the other writing form: small, upper case, tracked. */
    nameSub: string;
    /** One line of self-positioning under the two names. */
    tagline: string;
    /**
     * The portrait beside the name. Ticket 30-A.6 cancelled the bleed, so the
     * alt no longer mentions a cut edge — its right edge now lines up with the
     * content column. It carries real content (who the person is), so it is
     * described rather than left as a decorative empty alt.
     */
    portraitAlt: string;
    education: string;
    educationSmall: string;
    /**
     * School names only, oldest first. The visitor has not given the years, so
     * none are shown and none are invented.
     */
    schools: string[];
    recognition: string;
    recognitionSmall: string;
    /**
     * Ticket 30-A.5: one award is one entry, never two run together on a line.
     * `lines` is the list of placings under the event name — the second award
     * has two of them and they are two lines, not one joined with `·`.
     */
    awards: { year: string; title: string; lines: string[] }[];
    skills: string;
    skillsSmall: string;
    /** Two columns: a heading and a plain list of lines, never pills. */
    skillGroups: { heading: string; items: string[] }[];
    /**
     * The last block of /關於我 (Ticket 33-B). Its four lines are the visitor's
     * own 近況 (Spec R4) — no goals, dates or promises beyond them.
     */
    now: string;
    nowSmall: string;
    nowLines: string[];
  };
  works: {
    /**
     * Ticket 40.5: the two lines of the chapter's <h1>, and the only copy the
     * works chapter has left — the kicker, the lead sentence and the bottom
     * "Explore my GitHub" link were all taken out.
     * Ticket 46 / Spec R2: zh「皇家奶茶大師的／程式作品集」, en "Royal Milktea
     * Master's / Coding Projects".
     */
    title: string;
    titleEm: string;
    /** Ticket 36: screen-reader hint on a closed spark card ("open details"). */
    detail: string;
    /** Ticket 36: the same hint once the card is lit and its drawer is open. */
    collapse: string;
  };
  contact: {
    kicker: string;
    title: string;
    titleEm: string;
    /**
     * 2026-09-20 使用者修訂：標題只有「奶茶」兩字是奶茶色，其餘與第一行同色。
     * 這裡放的是 `titleEm` 裡要上色的那個詞本身（英文為 "milk tea"），標題文字
     * 仍然只有 `title` + `titleEm` 一份；元件在 `titleEm` 裡找到它再上色。
     */
    titleAccent: string;
    lead: string;
    mailLabel: string;
  };
  audio: {
    on: string;
    off: string;
    mute: string;
    unmute: string;
    failed: string;
    retry: string;
    credits: string;
    creditsAria: string;
    creditsFile: string;
  };
  preview: {
    title: string;
    canvas: string;
    /** Name of the scrollable reading region that holds the six beats. */
    reading: string;
    /** One accessible name per beat, in reading order. */
    beats: string[];
    /**
     * The four words of the front introduction that are set large and heavy,
     * in line order after the greeting. Each one is a contiguous substring of
     * that line.
     */
    keywords: string[];
    /** Frameless progress line under the opening. */
    hint: string;
    /** Replaces it on the first beat: every way in, not just the wheel. */
    start: string;
    next: string;
    prev: string;
    statusLoading: string;
    statusMoving: string;
    statusPaused: string;
    /** Ticket 02: the 3D is taking long; the chapters are offered meanwhile. */
    statusSlow: string;
    /** Closing beat: the brand, the role under it, then the two entries. */
    brand: string;
    role: string;
    entryWorks: string;
    entryAbout: string;
    about: string;
    works: string;
    contact: string;
    /** Accessible name of the closing four-line poem beside the entries. */
    poem: string;
    error: string;
    retry: string;
  };
};

export const SITE_COPY: Record<Language, SiteCopy> = {
  zh: {
    sections: [
      { value: '0', label: '/關於我' },
      { value: '1', label: '/我的作品' },
      { value: '2', label: '/聯絡資訊' },
    ],
    navAria: '個人網站主題',
    brandAria: '皇家奶茶大師 · 重播開場',
    brandName: BRAND_NAME.toUpperCase(),
    brandSub: 'PIN HUNG LIN',
    controlsAria: '語言',
    languageLabel: '語言',
    /** Shown on the switch: the language it switches to. */
    languageSwitch: 'EN',
    languageSwitchAria: '切換語言為 English，保留目前章節',
    languageStatus: '已切換為中文，停留在目前段落',
    footer: BRAND_NAME,
    about: {
      name: '皇家奶茶大師',
      nameSub: 'ROYAL MILKTEA MASTER',
      tagline: '熱愛 AI 與遊戲的夢想家',
      portraitAlt: '林品宏與一隻黑白貓的合照',
      education: '教育',
      educationSmall: 'EDUCATION',
      schools: [
        '市立青溪國民中學',
        '國立武陵高中',
        '國立成功大學 光電科學與工程學系',
      ],
      recognition: '得獎',
      recognitionSmall: 'RECOGNITION',
      // Ticket 30-A.5：使用者更新的得獎資料。AWS／SITCON 前綴兩語都保留，
      // 第二筆的兩個成績是兩行。
      // Ticket 30-D.2：`SITCON` 是官方寫法，所以全大寫寫在字面值裡，中英一致。
      // 刻意不用 `text-transform: uppercase` 造大小寫——那樣 DOM 文字會與畫面
      // 不符（複製、朗讀、搜尋拿到的都還是 `Sitcon`），而且換一個展示字就可能
      // 連帶改變畫面上的大小寫。字面值是唯一一份真相。
      awards: [
        {
          year: '2026',
          title: 'AWS 雲湧智生黑客松',
          lines: ['智慧交易冠軍'],
        },
        {
          year: '2026',
          title: 'SITCON 台灣未來祭',
          lines: ['AI 創意科技優勝', 'AI 綜合賽道 第四'],
        },
      ],
      skills: '技能',
      skillsSmall: 'SKILLS',
      now: '近況與目標',
      nowSmall: 'NOW & GOALS',
      // Spec R4 的四項近況，沒有自行加上目標、期限或成效承諾。
      nowLines: [
        'SEO & AEO｜認真研究中',
        '《星結奇緣》｜遊戲開發中',
        '《偽典》｜小說撰寫中',
        '隨緣接案中',
      ],
      skillGroups: [
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
    },
    works: {
      title: '皇家奶茶大師的',
      // Spec R2：「作品集」→「程式作品集」；導覽的「/我的作品」不跟著改名。
      titleEm: '程式作品集',
      detail: '了解作品',
      collapse: '收起',
    },
    contact: {
      kicker: 'LET’S CONNECT',
      // Spec R3 定稿：標題分兩行，內文保留顏文字。
      title: '想約出來，',
      titleEm: '一起喝杯奶茶嗎？',
      titleAccent: '奶茶',
      lead:
        '無論是聊聊 AI 應用、想交流一個有趣的點子、又或是討論專案合作、揪團參賽，委託開發、職缺邀約，都歡迎聯絡我！(´▽｀)',
      mailLabel: 'EMAIL',
    },
    audio: {
      on: '聲音開啟',
      off: '聲音靜音',
      mute: '關閉聲音，同時靜音背景音樂、點擊與轉場',
      unmute: '開啟聲音，同時恢復背景音樂、點擊與轉場',
      failed: '聲音暫時無法播放，畫面不受影響。',
      retry: '重試聲音',
      credits: '音訊來源',
      creditsAria: '音訊素材來源與授權',
      creditsFile: '完整授權與改動說明',
    },
    preview: {
      title: '皇家奶茶大師 · 星空工房',
      canvas: '星空與星點人物',
      reading: '開場閱讀 · 向下捲動繼續，向上返回',
      beats: [
        '品牌開場',
        '自我介紹',
        '我勇於追求',
        '一起喝杯奶茶',
        '值得讓星空記下的事',
        '星空詩與入口',
      ],
      keywords: [...INTRO_KEYWORDS.zh],
      hint: '向下捲動繼續 · 向上返回',
      start: '點擊、捲動或按任意鍵開始',
      next: '向下繼續',
      prev: '向上返回',
      statusLoading: '正在凝聚星光…',
      statusMoving: '星光正在移動…',
      statusPaused: '已暫停 · 回到這個分頁就接續',
      statusSlow: '星光凝聚得比平常久。可以先進入章節，完整體驗會在載入完成後接續。',
      brand: BRAND_NAME,
      role: 'AI 應用全端工程師',
      entryWorks: '/我的專案',
      entryAbout: '/關於我',
      about: '進入 /關於我',
      works: '進入 /我的專案',
      contact: '直接聯絡方式',
      poem: '星空四行詩',
      error: SCENE_ERROR.zh,
      retry: '重試完整體驗',
    },
  },
  en: {
    sections: [
      { value: '0', label: '/About me' },
      { value: '1', label: '/My work' },
      { value: '2', label: '/Contact' },
    ],
    navAria: 'Personal site chapters',
    brandAria: `${BRAND_NAME} · replay the opening`,
    brandName: BRAND_NAME.toUpperCase(),
    brandSub: 'PIN HUNG LIN',
    controlsAria: 'Language',
    languageLabel: 'Language',
    languageSwitch: '中文',
    languageSwitchAria: 'Switch the site to Chinese, keeping the current place',
    languageStatus: 'Switched to English, staying where you were',
    footer: BRAND_NAME,
    about: {
      // The page language carries the name; the other writing form goes under
      // it, so the pair is the mirror image of the Chinese one.
      name: 'Royal Milktea Master',
      nameSub: 'PIN HUNG LIN',
      tagline: 'A dreamer who loves AI and games.',
      portraitAlt: 'Pin Hung Lin with a black-and-white cat',
      // The English heading already reads as the small label, so there is no
      // second form to set beside it.
      education: 'Education',
      educationSmall: '',
      schools: [
        'Qingxi Municipal Junior High School',
        'National Wuling Senior High School',
        'National Cheng Kung University — Department of Photonics Science and Engineering',
      ],
      recognition: 'Recognition',
      recognitionSmall: '',
      awards: [
        // The event names have no official English form, so they keep their
        // Chinese name rather than inventing one. Ticket 30-A.5 keeps the
        // AWS / SITCON prefixes in both languages and splits the second
        // award's two placings onto two lines. Ticket 30-D.2 spells SITCON the
        // way the event itself does, in the literal rather than through
        // `text-transform`, so both languages carry the same string.
        {
          year: '2026',
          title: 'AWS 雲湧智生 Hackathon',
          lines: ['Smart Trading — First Place'],
        },
        {
          year: '2026',
          title: 'SITCON 台灣未來祭 Festival',
          // Ticket 30-D.8 — both placings are Title Case. They sit one above
          // the other under the same award, so a sentence-case second line
          // read as an inconsistency rather than a distinction.
          lines: [
            'AI Creative Technology — Winner',
            'AI Overall Track — 4th Place',
          ],
        },
      ],
      skills: 'Skills',
      skillsSmall: '',
      now: 'Now & Goals',
      nowSmall: '',
      // R5：沒有核准的官方英文書名／遊戲名，所以專名保留中文，只翻譯狀態。
      nowLines: [
        'SEO & AEO｜Researching in earnest',
        '《星結奇緣》｜Game in development',
        '《偽典》｜Novel in progress',
        'Taking on freelance work as it comes',
      ],
      skillGroups: [
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
    },
    works: {
      title: "Royal Milktea Master's",
      titleEm: 'Coding Projects',
      detail: 'About this work',
      collapse: 'Collapse',
    },
    contact: {
      kicker: 'LET’S CONNECT',
      title: 'Fancy meeting up',
      titleEm: 'for a cup of milk tea?',
      titleAccent: 'milk tea',
      lead: 'Whether it’s a chat about AI applications, an interesting idea you want to bounce around, a project collaboration, teaming up for a competition, freelance development or a job opening — I’d love to hear from you! (´▽｀)',
      mailLabel: 'EMAIL',
    },
    audio: {
      on: 'Sound on',
      off: 'Sound muted',
      mute: 'Mute the sound, including music, clicks and transitions',
      unmute: 'Turn the sound on, including music, clicks and transitions',
      failed: 'The sound cannot play right now. The visuals are unaffected.',
      retry: 'Try the sound again',
      credits: 'Audio credits',
      creditsAria: 'Sources and licences of the audio',
      creditsFile: 'Full licence and change notes',
    },
    preview: {
      title: 'Royal Milktea Master · Starlit Studio',
      canvas: 'The stars and the starlit figure',
      reading: 'The opening · scroll down to go on, scroll up to go back',
      beats: [
        'The brand',
        'Who I am',
        'What I dare to pursue',
        'Milk tea together',
        'Something worth the sky remembering',
        'The poem and the ways in',
      ],
      keywords: [...INTRO_KEYWORDS.en],
      hint: 'Scroll down to go on · scroll up to go back',
      start: 'Click, scroll or press any key to begin',
      next: 'Go on',
      prev: 'Go back',
      statusLoading: 'Gathering starlight…',
      statusMoving: 'The starlight is moving…',
      statusPaused: 'Paused · it continues when you come back to this tab',
      statusSlow: 'The starlight is taking longer than usual. You can open a chapter now; the full experience continues once it has loaded.',
      brand: BRAND_NAME,
      role: 'AI application full-stack engineer',
      entryWorks: '/My projects',
      entryAbout: '/About me',
      about: 'Open /About me',
      works: 'Open /My projects',
      contact: 'Direct ways to reach me',
      poem: 'The four-line starlit poem',
      error: SCENE_ERROR.en,
      retry: 'Retry the full experience',
    },
  },
};

export const copy = (language: Language): SiteCopy =>
  SITE_COPY[language] ?? SITE_COPY.zh;
