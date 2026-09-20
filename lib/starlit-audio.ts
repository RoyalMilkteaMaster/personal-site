// 星空開場的聲音核心。它不擁有任何時間軸：幕、暫停、重播與章節都由外部
// 真實事件（scene 回報的 intro state、頁面可見性、使用者輸入）推進，這裡只
// 把那些事件翻成「床音開關」「轉場聲」「點擊聲」與靜音／暫停。

export const MUTE_STORAGE_KEY = 'starlit-muted';

export const STARLIT_AUDIO_ASSETS = {
  bed: '/audio-starlit/bed-ethereal.mp3',
  click: '/audio-starlit/click-crystal.wav',
  transition: '/audio-starlit/transition-chime.wav',
} as const;

export type StarlitCue = 'click' | 'transition';

// 背景床的無縫循環區間：原檔 28.75s 起淡出、30.5s 後為數位靜音，所以循環
// 只取中段，並把尾段交叉折回開頭，接縫才不會有斷點。
export const BED_LOOP = { start: 0.6, end: 28, crossfade: 3 } as const;

// 音量集中在這裡，之後依實際試聽調整不必改流程。
export const MIX = { bed: 0.32, click: 0.55, transition: 0.45 } as const;

const FADE = { mute: 0.12, bedIn: 1.6, bedOut: 0.5, cueRelease: 0.06 } as const;

/** 幕名稱來自 lib/fantasy/starlit-intro.mjs，另加 scene 尚未就緒的 loading。 */
export type StarlitStage =
  | 'loading'
  | 'waiting'
  | 'approach'
  | 'front'
  | 'turn-back'
  | 'back'
  | 'cup'
  | 'return'
  | 'ending'
  | 'done'
  | 'error'
  | (string & {});

/** 這些幕代表「還沒走進星空」或「出事了」，一律安靜等待。 */
const SILENT_STAGES = new Set(['loading', 'waiting', 'error']);

export const isSilentStage = (stage: StarlitStage) => SILENT_STAGES.has(stage);

export type StarlitAudioStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type StarlitAudioSnapshot = {
  /** 素材備妥進度；ready 可能早於使用者啟動，因為等待期間就先載入了。 */
  status: StarlitAudioStatus;
  /** 使用者是否已用手勢啟動聲音；未啟動前一律無聲。 */
  unlocked: boolean;
  muted: boolean;
  error: string;
};

/** 外部事件的完整輸入；缺省值代表「未暫停、未隱藏、第一章、未重播」。 */
export type StarlitAudioInput = {
  stage: StarlitStage;
  paused?: boolean;
  hidden?: boolean;
  pose?: number;
  replay?: number;
};

/** 聲音輸出的最小接縫，測試以假實作替換，瀏覽器用 Web Audio 實作。 */
export type StarlitAudioEngine = {
  /** 必須在使用者手勢的同一個同步流程裡呼叫，否則瀏覽器不會解鎖音訊。 */
  unlock(): void;
  /** 取素材並解碼。不需要手勢，可在安靜等待期間先做。 */
  load(): Promise<void>;
  startBed(): void;
  stopBed(): void;
  playCue(cue: StarlitCue): void;
  stopCues(): void;
  setMuted(muted: boolean): void;
  setSuspended(suspended: boolean): void;
  dispose(): void;
};

export type StarlitAudioOptions = {
  createEngine?: () => StarlitAudioEngine;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
};

export type StarlitAudio = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): StarlitAudioSnapshot;
  getServerSnapshot(): StarlitAudioSnapshot;
  /** 依外部事件更新；同一組輸入重複呼叫不會重放任何聲音。 */
  sync(input: StarlitAudioInput): void;
  /**
   * 真正的開場 CLICK（含鍵盤等價操作）。必須在手勢裡同步呼叫；素材若已在
   * 等待期間備妥，點擊音就在這一刻響起，不需要等網路。這是唯一會啟動聲音的
   * 入口，之後重複呼叫只會發出點擊音。
   */
  start(): void;
  /**
   * 一般控制的按下音（語言、品牌、章節、重試）。永遠不啟動聲音，而且在還沒
   * 走進星空的安靜幕裡完全不出聲。移過按鈕不呼叫，所以 hover 本來就無聲。
   */
  click(): void;
  setMuted(muted: boolean): void;
  toggleMute(): void;
  /** 音訊載入／啟動失敗後的重試，同樣來自使用者手勢。 */
  retry(): void;
  dispose(): void;
};

const IDLE: StarlitAudioSnapshot = Object.freeze({
  status: 'idle' as const,
  unlocked: false,
  muted: false,
  error: '',
});

const LOAD_ERROR = '聲音暫時無法播放，畫面不受影響，可再試一次。';

function readMuted(storage: StarlitAudioOptions['storage']) {
  try {
    return storage?.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    // 私密模式可能讀不到 localStorage；沒有偏好就當作未靜音。
    return false;
  }
}

function defaultStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function createStarlitAudio(
  options: StarlitAudioOptions = {},
): StarlitAudio {
  const storage =
    options.storage === undefined ? defaultStorage() : options.storage;
  const createEngine = options.createEngine ?? (() => createWebAudioEngine());

  let engine: StarlitAudioEngine | null = null;
  let snapshot: StarlitAudioSnapshot = {
    status: 'idle',
    unlocked: false,
    muted: readMuted(storage),
    error: '',
  };
  let generation = 0;
  let disposed = false;
  let stage: StarlitStage = 'loading';
  let pose = 0;
  let replay = 0;
  let seenInput = false;
  let unlocked = false;
  let bedWanted = false;
  let bedRunning = false;
  let suspended = false;
  const listeners = new Set<() => void>();

  const emit = (patch: Partial<StarlitAudioSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };

  // 只在「要不要有床音」真的翻轉時動它，所以連點與重複回報不會疊出第二條背景音軌。
  const applyBed = () => {
    if (!engine || snapshot.status !== 'ready' || bedWanted === bedRunning)
      return;
    bedRunning = bedWanted;
    if (bedWanted) engine.startBed();
    else engine.stopBed();
  };

  // 聲音是事件，不是佇列：素材還沒備妥、或聲音正暫停著，就讓這一聲過去。
  // 暫停時若照樣建立 source，Web Audio 會把它排在凍結的時鐘上，恢復的瞬間
  // 全部一起補播；一次性的點擊與轉場寧可丟掉，也不要在恢復時堆成一團。
  const cue = (name: StarlitCue) => {
    if (!unlocked || suspended || snapshot.status !== 'ready' || snapshot.muted)
      return;
    engine?.playCue(name);
  };

  /**
   * 開場 CLICK 是唯一可以在「還在等待星空」時出聲的按下；語言、品牌、章節、
   * 重試都只是一般控制，在 waiting／loading／error 一律安靜。3D 尚未就緒或
   * 已失敗時，連開場 CLICK 也不出聲。
   */
  const pressCue = (opening: boolean) => {
    if (
      opening ? stage === 'loading' || stage === 'error' : isSilentStage(stage)
    )
      return;
    cue('click');
  };

  // 在安靜等待期間就把素材抓好、解好。這裡不解鎖也不播任何東西：
  // context 尚未被手勢啟動，畫面依舊完全無聲。
  const prepare = () => {
    if (disposed || engine) return;
    const mine = ++generation;
    try {
      engine = createEngine();
      engine.setMuted(snapshot.muted);
      engine.setSuspended(suspended);
    } catch (error) {
      engine = null;
      bedRunning = false;
      emit({ status: 'failed', error: LOAD_ERROR });
      console.error(error);
      return;
    }
    emit({ status: 'loading', error: '' });
    engine.load().then(
      () => {
        if (disposed || mine !== generation) return;
        emit({ status: 'ready', error: '' });
        // 床音是持續狀態，晚備妥就從現在開始；轉場是一次性事件，不補發。
        applyBed();
      },
      (error: unknown) => {
        if (disposed || mine !== generation) return;
        emit({ status: 'failed', error: LOAD_ERROR });
        console.error(error);
      },
    );
  };

  const setMuted = (muted: boolean) => {
    if (disposed || muted === snapshot.muted) return;
    try {
      storage?.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // 寫不進偏好不該讓聲音失效，這一輪照樣生效。
    }
    emit({ muted });
    engine?.setMuted(muted);
    if (muted) engine?.stopCues();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => IDLE,
    sync(input) {
      if (disposed) return;
      const nextStage = input.stage;
      const nextPose = input.pose ?? 0;
      const nextReplay = input.replay ?? 0;
      const first = !seenInput;
      seenInput = true;

      // 重播：先掐掉殘留轉場聲，回到 waiting 後由下面的 bedWanted 收掉床音。
      if (nextReplay !== replay) {
        replay = nextReplay;
        engine?.stopCues();
      }

      // 先套用暫停狀態，下面判斷 cue 時看到的才是這一刻真正的情況：
      // 同一次回報既換幕又切到背景時，那一聲轉場不該被排進暫停的時鐘裡。
      const nextSuspended = !!(input.hidden || input.paused);
      if (nextSuspended !== suspended) {
        suspended = nextSuspended;
        engine?.setSuspended(suspended);
      }

      const silent = isSilentStage(nextStage);
      if (nextStage !== stage && !first) {
        if (silent) engine?.stopCues();
        else cue('transition');
      }
      if (nextPose !== pose && !first && !silent) cue('transition');
      stage = nextStage;
      pose = nextPose;

      // 床音只在「已被使用者啟動」且不在安靜幕時播放；沒解鎖前完全沒有聲音。
      bedWanted = unlocked && !silent;
      applyBed();

      // 等待期間先把素材備妥，首次 CLICK 才能當場有聲，而不是之後補。
      if (nextStage !== 'error') prepare();
    },
    start() {
      if (disposed) return;
      if (!unlocked) {
        // 還沒 sync 過就被按下時才會走到這裡；仍然同步建立，不離開手勢。
        if (!engine) prepare();
        engine?.unlock();
        unlocked = true;
        emit({ unlocked: true });
        bedWanted = !isSilentStage(stage);
        applyBed();
      }
      pressCue(true);
    },
    click() {
      pressCue(false);
    },
    setMuted,
    toggleMute: () => setMuted(!snapshot.muted),
    retry() {
      if (disposed) return;
      generation += 1;
      engine?.dispose();
      engine = null;
      bedRunning = false;
      emit({ status: 'idle', error: '' });
      prepare();
      // 重試也來自使用者手勢，新的 context 需要在這裡同步啟動。
      if (unlocked) (engine as StarlitAudioEngine | null)?.unlock();
      bedWanted = unlocked && !isSilentStage(stage);
    },
    dispose() {
      disposed = true;
      generation += 1;
      engine?.dispose();
      engine = null;
      bedRunning = false;
      unlocked = false;
      listeners.clear();
    },
  };
}

/**
 * 把緩衝的尾段等功率折回開頭，做出可無縫 loop 的段落。原檔結尾是淡出，
 * 直接 loop 會聽見斷點；這樣處理不需要另外產生大的音檔。
 */
export function buildSeamlessLoop(
  source: AudioBuffer,
  context: BaseAudioContext,
  loop: { start: number; end: number; crossfade: number } = BED_LOOP,
): AudioBuffer {
  const rate = source.sampleRate;
  const start = Math.max(0, Math.round(loop.start * rate));
  const end = Math.min(source.length, Math.round(loop.end * rate));
  const fade = Math.max(1, Math.round(loop.crossfade * rate));
  const length = Math.max(fade + 1, end - start - fade);
  const out = context.createBuffer(source.numberOfChannels, length, rate);
  for (let c = 0; c < source.numberOfChannels; c += 1) {
    const src = source.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < length; i += 1) dst[i] = src[start + i] ?? 0;
    for (let i = 0; i < fade; i += 1) {
      const t = (Math.PI / 2) * (i / fade);
      dst[i] =
        (src[start + i] ?? 0) * Math.sin(t) +
        (src[end - fade + i] ?? 0) * Math.cos(t);
    }
  }
  return out;
}

export function createWebAudioEngine(
  assets: Record<'bed' | 'click' | 'transition', string> = STARLIT_AUDIO_ASSETS,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): StarlitAudioEngine {
  const Ctor =
    (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio is unavailable');
  const context = new Ctor();
  const master = context.createGain();
  master.connect(context.destination);

  const buffers: Partial<Record<'bed' | 'click' | 'transition', AudioBuffer>> =
    {};
  let bed: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  let transition: { source: AudioBufferSourceNode; gain: GainNode } | null =
    null;
  let wantSuspended = false;
  let settling = false;
  let unlocked = false;
  let disposed = false;
  /** 這個 engine 是否已經套過一次靜音狀態；第一次是初始化，不是切換。 */
  let muteApplied = false;

  const ramp = (gain: GainNode, value: number, seconds: number) => {
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  };

  const stopVoice = (
    voice: { source: AudioBufferSourceNode; gain: GainNode } | null,
    seconds: number,
  ) => {
    if (!voice) return;
    ramp(voice.gain, 0, seconds);
    try {
      voice.source.stop(context.currentTime + seconds);
    } catch {
      // 已經停過的 source 再停會丟例外，忽略即可。
    }
  };

  // suspend/resume 都是非同步，快速切分頁會互相追撞；每次結束後對照期望值補正。
  // 手勢之前不碰 resume：那時 context 本來就該保持 suspended，畫面完全無聲。
  const settle = () => {
    if (disposed || settling || !unlocked) return;
    const target = wantSuspended;
    if ((target ? 'suspended' : 'running') === context.state) return;
    settling = true;
    const done = () => {
      settling = false;
      if (!disposed && target !== wantSuspended) settle();
    };
    (target ? context.suspend() : context.resume()).then(done, done);
  };

  return {
    unlock() {
      unlocked = true;
      // 同步呼叫 resume 才算落在手勢裡，promise 之後才 resolve 沒關係。
      context.resume().catch(() => {});
    },
    async load() {
      const names = ['bed', 'click', 'transition'] as const;
      const decoded = await Promise.all(
        names.map(async (name) => {
          const response = await fetchImpl(assets[name]);
          if (!response.ok)
            throw new Error(`${assets[name]} ${response.status}`);
          return context.decodeAudioData(await response.arrayBuffer());
        }),
      );
      if (disposed) return;
      names.forEach((name, i) => {
        buffers[name] = decoded[i];
      });
      buffers.bed = buildSeamlessLoop(decoded[0], context);
    },
    startBed() {
      if (disposed || bed || !buffers.bed) return;
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(master);
      const source = context.createBufferSource();
      source.buffer = buffers.bed;
      source.loop = true;
      source.connect(gain);
      source.start();
      ramp(gain, MIX.bed, FADE.bedIn);
      bed = { source, gain };
    },
    stopBed() {
      stopVoice(bed, FADE.bedOut);
      bed = null;
    },
    playCue(name) {
      const buffer = buffers[name];
      if (disposed || !buffer) return;
      if (name === 'transition') {
        // 轉場是單聲部：快速換幕時先收掉前一聲，不留殘響疊加。
        stopVoice(transition, FADE.cueRelease);
        transition = null;
      }
      const gain = context.createGain();
      gain.gain.value = MIX[name];
      gain.connect(master);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.onended = () => gain.disconnect();
      source.start();
      if (name === 'transition') transition = { source, gain };
    },
    stopCues() {
      stopVoice(transition, FADE.cueRelease);
      transition = null;
    },
    setMuted(muted) {
      if (disposed) return;
      const value = muted ? 0 : 1;
      const initialising = !muteApplied;
      muteApplied = true;
      // 只有「播放中由使用者切換」才淡變，其餘一律直接寫內在值：
      // ．第一次套用是初始化。master 預設全開，排一條漸變等於讓保存的靜音在頭
      //   120ms 漏出聲音——context 起始是 running 也一樣，重試後新建的 engine 尤其
      //   會撞上剛開始的床音。
      // ．時鐘停著（或正要停）時排的漸變會整段留到恢復那一刻才跑，同樣會漏。
      //   wantSuspended 是我們自己的意圖，比非同步才更新的 context.state 先知道。
      if (initialising || wantSuspended || context.state !== 'running') {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.value = value;
        return;
      }
      ramp(master, value, FADE.mute);
    },
    setSuspended(value) {
      wantSuspended = value;
      settle();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopVoice(bed, 0.02);
      stopVoice(transition, 0.02);
      bed = null;
      transition = null;
      context.close().catch(() => {});
    },
  };
}

export type StarlitAudioCredit = {
  role: string;
  title: string;
  /** 來源頁 Author 欄位所列的作者，不是上傳者。 */
  author: string;
  /** 來源頁另外標示的提交者（作者與提交者不同時才有）。 */
  submitter?: string;
  /** 授權或作者指定要連過去的頁面；有的話介面必須把作者名連到這裡。 */
  authorUrl?: string;
  license: string;
  attribution: string;
  source: string;
  file: string;
  changes: string;
};

/**
 * 產品端可直接呈現的音訊素材來源與署名，不只留在開發資料夾。
 *
 * 作者、授權與署名要求都在 2026-09-14 逐頁讀過 OpenGameArt 來源頁後填寫：
 * - Glass Bell Sounds 的 Author 欄位是 Varkalandar，但頁面 Attribution Notice
 *   明文要求「state my name, Hansjörg Malthaner, and link here:
 *   opengameart.org/users/varkalandar」，所以署名用本名並連到該使用者頁。
 * - Shimmer glitter magic 的 Author 欄位是 The Berklee College of Music，
 *   qubodup 只是提交者；此頁沒有另外的 Attribution Notice。
 * - Ethereal 是 CC0，Attribution Notice 寫 Public Domain，沒有署名義務。
 */
export const STARLIT_AUDIO_CREDITS: readonly StarlitAudioCredit[] = [
  {
    role: '背景音樂',
    title: 'Ethereal',
    author: 'wipics',
    license: 'CC0 1.0',
    attribution: '無署名義務（來源頁標示 Public Domain）',
    source: 'https://opengameart.org/content/ethereal',
    file: 'https://opengameart.org/sites/default/files/ethereal_0.mp3',
    changes:
      '檔案未修改；播放時取 0.6–28 秒並以 3 秒等功率交叉折疊成無縫循環。',
  },
  {
    role: '點擊音',
    title: 'Glass Bell Sounds',
    author: 'Hansjörg Malthaner',
    submitter: 'Varkalandar',
    authorUrl: 'https://opengameart.org/users/varkalandar',
    license: 'CC-BY 3.0',
    attribution:
      '來源頁明文要求：署名 Hansjörg Malthaner 並連至 https://opengameart.org/users/varkalandar',
    source: 'https://opengameart.org/content/glass-bell-sounds',
    file: 'https://opengameart.org/sites/default/files/hjm-glass_bell_3.wav',
    changes:
      '自 0.051 秒起裁為 0.5 秒，淡入 3ms、淡出 300ms，峰值正規化至 −6 dBFS，單聲道 16-bit。',
  },
  {
    role: '轉場音（掠過層）',
    title: 'Shimmer glitter magic',
    author: 'The Berklee College of Music',
    submitter: 'qubodup',
    license: 'CC-BY 3.0',
    attribution:
      '須署名來源頁所列作者 The Berklee College of Music（qubodup 為提交者）',
    source: 'https://opengameart.org/content/shimmer-glitter-magic',
    file: 'https://opengameart.org/sites/default/files/shimmer_1.flac',
    changes: '取 0–0.658 秒，淡入 20ms、淡出 200ms，衰減至 0.5 後混入轉場音。',
  },
  {
    role: '轉場音（鈴音層）',
    title: 'Glass Bell Sounds',
    author: 'Hansjörg Malthaner',
    submitter: 'Varkalandar',
    authorUrl: 'https://opengameart.org/users/varkalandar',
    license: 'CC-BY 3.0',
    attribution:
      '來源頁明文要求：署名 Hansjörg Malthaner 並連至 https://opengameart.org/users/varkalandar',
    source: 'https://opengameart.org/content/glass-bell-sounds',
    file: 'https://opengameart.org/sites/default/files/hjm-glass_bell_5.wav',
    changes:
      '自 0.040 秒起裁為 1.1 秒、淡出 700ms，衰減至 0.85 並延後 120ms 疊在掠過層之後；成品全長 1.22 秒、峰值 −8 dBFS。',
  },
];
