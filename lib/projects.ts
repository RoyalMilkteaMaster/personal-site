import type { Language } from './site-copy';

// Still the only source of work entries; `en` is the same entry in the other
// language, so adding a project never means editing two lists.
export const projects = [
  {
    id: 'market-council',
    title: 'Market Council',
    category: '多 Agent 系統',
    // 使用者定稿文案（Spec R2）：只整理標點與中英之間的空白，語氣不改寫。
    // 換行是文案的一部分，主預覽的卡片以 `white-space: pre-line` 照著排。
    summary:
      '甚麼？你說一隻 AI 會騙你？\n那就來七隻 AI 吧！\n七隻專業金融分析 agents 的圓桌會議室！',
    detail: '保留證據來源、少數意見與研究紀錄，串起研究、討論與報告。',
    tech: ['Python', 'Multi-Agent', 'Data Analysis'],
    links: [
      {
        label: 'GitHub',
        labelEn: 'GitHub',
        url: 'https://github.com/RoyalMilkteaMaster/AI-agnets-debating-chamber',
      },
      {
        label: '觀看展示',
        labelEn: 'Watch the demo',
        url: 'https://www.youtube.com/watch?v=GzGIeinCTGY',
      },
    ],
    en: {
      title: 'Market Council',
      category: 'Multi-agent systems',
      summary:
        'What? You say one AI might lie to you?\nThen let’s bring in seven!\nA round-table chamber of seven professional financial analyst agents!',
      detail:
        'Evidence sources, minority opinions and research records are kept, linking research, debate and the final report.',
    },
  },
  {
    id: 'cb',
    title: 'CB 影像生成平台',
    category: '生成式 AI',
    summary:
      '你的生圖 AI 生不出穩定的角色形象嗎？\n那就來用 CB 圖像生成！\n人物形象穩定！動作穩定！背景穩定！操作簡單！給想要用 AI 創作影像的你。',
    detail:
      '整合 Blender、SMPL-X / VPoser 與 ComfyUI，透過 FastAPI 和 CLI Bridge 串接工具。',
    tech: ['Blender', 'ComfyUI', 'FastAPI'],
    links: [
      {
        label: '觀看展示',
        labelEn: 'Watch the demo',
        url: 'https://www.youtube.com/watch?v=95etQyKrksA&t=44s',
      },
    ],
    en: {
      title: 'CB Image Generation Platform',
      category: 'Generative AI',
      summary:
        'Can’t get your image AI to keep a character looking the same?\nThen come and use CB image generation!\nStable characters! Stable poses! Stable backgrounds! Simple to use! For everyone who wants to create images with AI.',
      detail:
        'Blender, SMPL-X / VPoser and ComfyUI integrated, with FastAPI and a CLI bridge tying the tools together.',
    },
  },
  {
    id: 'milktea',
    // Spec R2：顯示名稱是「奶茶流開發／Milktea Skills」兩段。英文那一段本身就是
    // 英文名，所以 en 只留 'Milktea Skills'（英文欄位不留中文）。
    title: '奶茶流開發／Milktea Skills',
    category: '開發工作流程',
    summary: '盛滿了皇家奶茶的許願池\n皇家奶茶大師的通用開發 skills',
    detail:
      '用 Skills 協助多 Agent 分工，讓每次開發都有能延續的方法與驗證依據。',
    tech: ['Skills', 'Multi-Agent', 'Claude Code'],
    links: [
      {
        label: 'GitHub',
        labelEn: 'GitHub',
        url: 'https://github.com/RoyalMilkteaMaster/milktea-agents-skills-for-claude',
      },
    ],
    en: {
      title: 'Milktea Skills',
      category: 'Development workflow',
      summary:
        'A wishing well brimming with royal milk tea.\nThe Royal Milktea Master’s all-purpose development skills.',
      detail:
        'Skills split the work between agents, so each round of development leaves behind a method and evidence that carry forward.',
    },
  },
  {
    id: 'lol-highlights',
    title: 'LoL Highlights',
    category: '賽事精華',
    summary: '英雄聯盟職業賽事自動精華剪輯系統～\n我願稱你為最強 聯盟！',
    detail: '英雄聯盟職業賽事自動精華剪輯系統～\n我願稱你為最強 聯盟！',
    tech: [],
    links: [
      {
        label: 'GitHub',
        labelEn: 'GitHub',
        url: 'https://github.com/RoyalMilkteaMaster/lol-highlights',
      },
    ],
    en: {
      title: 'LoL Highlights',
      category: 'Match highlights',
      summary: 'An automatic highlight-editing system for League of Legends pro matches~\nI hereby dub you the strongest — League!',
      detail: 'An automatic highlight-editing system for League of Legends pro matches~\nI hereby dub you the strongest — League!',
    },
  },
  {
    id: 'xuerong-clawd',
    title: '雪絨',
    category: '桌面陪伴',
    summary: '敲卡哇伊的 Coding 助理～\n有她在要怎麼不愛 Coding！？',
    detail: '敲卡哇伊的 Coding 助理～\n有她在要怎麼不愛 Coding！？',
    tech: [],
    links: [
      {
        label: 'GitHub',
        labelEn: 'GitHub',
        url: 'https://github.com/RoyalMilkteaMaster/xuerong-clawd',
      },
    ],
    en: {
      title: 'Xuerong',
      category: 'Desktop companion',
      summary: 'A super kawaii coding companion~\nWith her around, how could you not love coding!?',
      detail: 'A super kawaii coding companion~\nWith her around, how could you not love coding!?',
    },
  },
];

export type Project = (typeof projects)[number];

export const localizedProjects = (language: Language) =>
  language === 'en'
    ? projects.map((p) => ({
        ...p,
        ...p.en,
        links: p.links.map((l) => ({ label: l.labelEn, url: l.url })),
      }))
    : projects;
