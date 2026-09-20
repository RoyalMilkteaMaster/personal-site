import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BED_LOOP,
  buildSeamlessLoop,
  createStarlitAudio,
  createWebAudioEngine,
  isSilentStage,
  MUTE_STORAGE_KEY,
  STARLIT_AUDIO_ASSETS,
  STARLIT_AUDIO_CREDITS,
  type StarlitAudioEngine,
} from './starlit-audio.ts';

type Call = string;

function fakeEngine() {
  const calls: Call[] = [];
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const engine: StarlitAudioEngine = {
    unlock: () => void calls.push('unlock'),
    load: () =>
      new Promise<void>((res, rej) => {
        calls.push('load');
        resolve = res;
        reject = rej;
      }),
    startBed: () => void calls.push('startBed'),
    stopBed: () => void calls.push('stopBed'),
    playCue: (cue) => void calls.push(`cue:${cue}`),
    stopCues: () => void calls.push('stopCues'),
    setMuted: (muted) => void calls.push(`muted:${muted}`),
    setSuspended: (value) => void calls.push(`suspended:${value}`),
    dispose: () => void calls.push('dispose'),
  };
  return {
    engine,
    calls,
    finish: async () => {
      resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
    fail: async () => {
      reject(new Error('asset 404'));
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

function harness(initial: Record<string, string> = {}) {
  const engines: ReturnType<typeof fakeEngine>[] = [];
  const storage = fakeStorage(initial);
  const audio = createStarlitAudio({
    storage,
    createEngine: () => {
      const made = fakeEngine();
      engines.push(made);
      return made.engine;
    },
  });
  return { audio, engines, storage, last: () => engines[engines.length - 1] };
}

const silence = (console.error = () => {});
void silence;

// 1 — 未 CLICK 之前完全無聲，但素材要先備妥：可以載入，不可以解鎖或出聲。
{
  const h = harness();
  h.audio.sync({ stage: 'loading' });
  h.audio.sync({ stage: 'waiting' });
  h.audio.sync({ stage: 'waiting', pose: 2, replay: 1 });
  h.audio.click();
  assert.equal(
    h.engines.length,
    1,
    'assets are fetched during the silent wait',
  );
  await h.last().finish();
  h.audio.click();
  h.audio.sync({ stage: 'waiting', pose: 3 });
  assert.equal(h.audio.getSnapshot().status, 'ready');
  assert.equal(h.audio.getSnapshot().unlocked, false);
  assert.deepEqual(
    h
      .last()
      .calls.filter(
        (c) => c === 'unlock' || c === 'startBed' || c.startsWith('cue:'),
      ),
    [],
    'nothing is unlocked and nothing sounds before the first CLICK',
  );
  console.log('waiting is silent yet already loaded: PASS');
}

// 2 — 一般情況（素材已在等待期間備妥）：CLICK 當下同步解鎖並出聲，中間沒有 await。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  assert.deepEqual(
    h.last().calls,
    ['muted:false', 'suspended:false', 'load'],
    'preparing assets must not unlock anything',
  );
  await h.last().finish();
  assert.equal(h.audio.getSnapshot().status, 'ready');
  h.last().calls.length = 0;

  // 以下兩行相當於同一個 click handler，全部同步執行。
  h.audio.start();
  h.audio.sync({ stage: 'approach' });

  assert.deepEqual(
    h.last().calls,
    ['unlock', 'cue:click', 'cue:transition', 'startBed'],
    'the gesture unlocks and the sound starts in the same synchronous turn',
  );
  assert.equal(h.audio.getSnapshot().unlocked, true);
  console.log('a prepared CLICK starts animation and sound together: PASS');
}

// 2b — 慢網路：CLICK 照常推進動畫，素材晚到也不補播已過期的幕。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  h.audio.sync({ stage: 'approach' });
  h.audio.sync({ stage: 'front' });
  assert.equal(h.audio.getSnapshot().status, 'loading');
  assert.deepEqual(
    h.last().calls.filter((c) => c.startsWith('cue:')),
    [],
    'nothing can sound before the assets arrive',
  );

  h.last().calls.length = 0;
  await h.last().finish();
  assert.deepEqual(
    h.last().calls,
    ['startBed'],
    'the bed joins late, but the stale approach/front transitions are dropped',
  );

  h.last().calls.length = 0;
  h.audio.sync({ stage: 'turn-back' });
  assert.deepEqual(
    h.last().calls,
    ['cue:transition'],
    'the next real stage change sounds normally',
  );
  console.log('slow load never replays an expired transition: PASS');
}

// 3 — 已保存的靜音優先，且不因啟動或重播被解除。
{
  const h = harness({ [MUTE_STORAGE_KEY]: '1' });
  assert.equal(h.audio.getSnapshot().muted, true);
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  assert.ok(h.last().calls.includes('muted:true'));
  h.audio.sync({ stage: 'approach' });
  await h.last().finish();
  assert.equal(h.audio.getSnapshot().muted, true, 'CLICK must not unmute');
  h.audio.sync({ stage: 'waiting', replay: 1 });
  h.audio.sync({ stage: 'approach', replay: 1 });
  assert.equal(h.audio.getSnapshot().muted, true, 'replay must not unmute');
  assert.ok(
    !h.last().calls.includes('cue:transition'),
    'muted means no cue at all',
  );
  h.audio.click();
  assert.ok(!h.last().calls.includes('cue:click'));
  console.log('stored mute wins over start and replay: PASS');
}

// 4 — 靜音偏好是獨立 key，切換只寫這一個鍵。
{
  const h = harness({ language: 'en' });
  h.audio.setMuted(true);
  assert.equal(h.storage.data.get(MUTE_STORAGE_KEY), '1');
  assert.equal(h.storage.data.get('language'), 'en', 'language is untouched');
  h.audio.toggleMute();
  assert.equal(h.storage.data.get(MUTE_STORAGE_KEY), '0');
  assert.equal(h.audio.getSnapshot().muted, false);
  assert.deepEqual(
    [...h.storage.data.keys()].sort(),
    ['language', MUTE_STORAGE_KEY].sort(),
  );
  console.log('mute lives in its own storage key: PASS');
}

// 5 — 一個開關統一管背景、點擊與轉場；靜音時當下的轉場也要收掉。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  h.audio.sync({ stage: 'approach' });
  await h.last().finish();
  h.last().calls.length = 0;
  h.audio.click();
  h.audio.sync({ stage: 'front' });
  assert.deepEqual(h.last().calls, ['cue:click', 'cue:transition']);
  h.audio.setMuted(true);
  assert.ok(h.last().calls.includes('muted:true'));
  assert.ok(h.last().calls.includes('stopCues'), 'mute kills a ringing cue');
  h.last().calls.length = 0;
  h.audio.click();
  h.audio.sync({ stage: 'turn-back' });
  h.audio.sync({ stage: 'turn-back', pose: 1 });
  assert.deepEqual(h.last().calls, [], 'nothing sounds while muted');
  h.audio.setMuted(false);
  h.last().calls.length = 0;
  h.audio.click();
  assert.deepEqual(
    h.last().calls,
    ['cue:click'],
    'unmute restores every sound',
  );
  console.log('one control covers bed, click and transition: PASS');
}

// 6 — 只有明確的使用者點擊會發聲；sync 自己不會產生點擊音（hover 無 API 可觸發）。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  h.audio.sync({ stage: 'approach' });
  await h.last().finish();
  h.last().calls.length = 0;
  for (const stage of ['front', 'turn-back', 'back']) h.audio.sync({ stage });
  assert.deepEqual(
    h.last().calls.filter((c) => c === 'cue:click'),
    [],
    'stage traffic never emits a click sound',
  );
  console.log('click sound only comes from an explicit press: PASS');
}

// 7 — 連點與重播：床音不重複，殘留轉場被切掉，回到等待就安靜。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  for (let i = 0; i < 5; i += 1) h.audio.start();
  assert.equal(
    h.engines.length,
    1,
    'rapid CLICK must not open a second engine',
  );
  h.audio.sync({ stage: 'approach' });
  await h.last().finish();
  h.last().calls.length = 0;
  for (const stage of ['front', 'turn-back', 'back', 'cup']) {
    h.audio.sync({ stage });
    h.audio.sync({ stage });
  }
  assert.equal(
    h.last().calls.filter((c) => c === 'startBed').length,
    0,
    'the bed is never restarted mid-run',
  );
  assert.equal(
    h.last().calls.filter((c) => c === 'cue:transition').length,
    4,
    'one transition per real stage change, repeats ignored',
  );
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'waiting', replay: 1 });
  assert.ok(h.last().calls.includes('stopCues'), 'replay cuts the transition');
  assert.ok(h.last().calls.includes('stopBed'), 'replay returns to silence');
  assert.ok(!h.last().calls.includes('cue:transition'));
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'approach', replay: 1 });
  assert.deepEqual(h.last().calls.sort(), ['cue:transition', 'startBed']);
  console.log(
    'rapid click and replay leave no duplicate or residual sound: PASS',
  );
}

// 8 — 分頁隱藏與手動暫停都走同一個暫停，回來從原處接續。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  h.audio.sync({ stage: 'front' });
  await h.last().finish();
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'front', hidden: true });
  assert.deepEqual(h.last().calls, ['suspended:true']);
  h.audio.sync({ stage: 'front', hidden: true });
  assert.deepEqual(h.last().calls, ['suspended:true'], 'no repeated suspend');
  h.audio.sync({ stage: 'front' });
  assert.deepEqual(h.last().calls, ['suspended:true', 'suspended:false']);
  assert.ok(
    !h.last().calls.includes('stopBed'),
    'the bed keeps its position across a hidden tab',
  );
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'front', paused: true });
  h.audio.sync({ stage: 'front', paused: false });
  assert.deepEqual(h.last().calls, ['suspended:true', 'suspended:false']);
  console.log('hidden tab and manual pause share one suspend: PASS');
}

// 9 — 音訊失敗不影響場景，且可以重試；重試成功才恢復聲音。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  await h.last().fail();
  assert.equal(
    h.audio.getSnapshot().status,
    'failed',
    'a failure during the wait is already visible before CLICK',
  );
  h.audio.start();
  h.audio.sync({ stage: 'approach' });
  assert.equal(h.audio.getSnapshot().status, 'failed');
  assert.ok(h.audio.getSnapshot().error.length > 0, 'a retryable message');
  assert.ok(!h.last().calls.includes('startBed'));
  h.audio.sync({ stage: 'front' });
  h.audio.click();
  assert.ok(
    !h.last().calls.includes('cue:click'),
    'a failed engine stays quiet',
  );
  h.audio.retry();
  assert.equal(h.engines.length, 2, 'retry builds a fresh engine');
  assert.ok(h.engines[0].calls.includes('dispose'));
  assert.equal(h.audio.getSnapshot().status, 'loading');
  await h.last().finish();
  assert.equal(h.audio.getSnapshot().status, 'ready');
  assert.ok(h.last().calls.includes('startBed'));
  console.log('audio failure is retryable and never blocks the scene: PASS');
}

// 10 — 遲到的失敗不能蓋掉重試後的成功狀態。
{
  const h = harness();
  h.audio.sync({ stage: 'front' });
  h.audio.start();
  const stale = h.last();
  h.audio.retry();
  await h.last().finish();
  await stale.fail();
  assert.equal(h.audio.getSnapshot().status, 'ready', 'stale result ignored');
  console.log('a stale load result cannot overwrite the retry: PASS');
}

// 11 — 3D 失敗進入 error 幕時音訊回到安靜等待。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  h.audio.sync({ stage: 'cup' });
  await h.last().finish();
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'error' });
  assert.ok(h.last().calls.includes('stopCues'));
  assert.ok(h.last().calls.includes('stopBed'));
  assert.ok(!h.last().calls.includes('cue:transition'));
  assert.ok(isSilentStage('error') && isSilentStage('waiting'));
  console.log('3D error returns the sound to silent waiting: PASS');
}

// 12 — 章節切換依實際 pose 事件發轉場聲。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  h.audio.sync({ stage: 'done' });
  await h.last().finish();
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'done', pose: 1 });
  h.audio.sync({ stage: 'done', pose: 1 });
  h.audio.sync({ stage: 'done', pose: 2 });
  assert.deepEqual(h.last().calls, ['cue:transition', 'cue:transition']);
  console.log('chapter changes follow the real pose event: PASS');
}

// 13 — dispose 收乾淨，之後的事件不再有任何動作。
{
  const h = harness();
  const seen: number[] = [];
  const off = h.audio.subscribe(() => seen.push(1));
  h.audio.sync({ stage: 'waiting' });
  h.audio.start();
  await h.last().finish();
  const before = seen.length;
  h.audio.dispose();
  assert.ok(h.last().calls.includes('dispose'));
  h.audio.sync({ stage: 'front' });
  h.audio.click();
  h.audio.start();
  h.audio.setMuted(true);
  h.audio.retry();
  assert.equal(h.engines.length, 1, 'nothing is rebuilt after dispose');
  assert.equal(seen.length, before, 'listeners stop being called');
  off();
  console.log('dispose is complete: PASS');
}

// 14 — 無 storage（私密模式）時仍可運作，只是不保存。
{
  const audio = createStarlitAudio({
    storage: null,
    createEngine: () => fakeEngine().engine,
  });
  audio.setMuted(true);
  assert.equal(audio.getSnapshot().muted, true);
  audio.dispose();
  console.log('missing localStorage degrades to session-only mute: PASS');
}

// 15 — 無縫循環：折回後的接縫要和原訊號的自然斜率同級，不是斷點。
{
  const rate = 48000;
  const length = 31 * rate;
  const data = new Float32Array(length);
  // 刻意讓循環區間剛好差半個週期：直接切會是最糟的斷點，折回才看得出效果。
  const freq = 200 + 0.5 / (BED_LOOP.end - BED_LOOP.start);
  for (let i = 0; i < length; i += 1) {
    const t = i / rate;
    data[i] = Math.sin(2 * Math.PI * freq * t) * (t > 28.75 ? 0 : 0.5);
  }
  const context = {
    createBuffer(channels: number, frames: number, sampleRate: number) {
      const store = [new Float32Array(frames)];
      return {
        numberOfChannels: channels,
        length: frames,
        sampleRate,
        duration: frames / sampleRate,
        getChannelData: (c: number) => store[c],
      };
    },
  };
  const source = {
    numberOfChannels: 1,
    length,
    sampleRate: rate,
    duration: 31,
    getChannelData: () => data,
  };
  const loop = buildSeamlessLoop(
    source as unknown as AudioBuffer,
    context as unknown as BaseAudioContext,
  );
  const out = loop.getChannelData(0);
  assert.equal(
    loop.length,
    Math.round((BED_LOOP.end - BED_LOOP.start - BED_LOOP.crossfade) * rate),
  );
  let maxStep = 0;
  for (let i = 1; i < out.length; i += 1)
    maxStep = Math.max(maxStep, Math.abs(out[i] - out[i - 1]));
  const seam = Math.abs(out[0] - out[out.length - 1]);
  assert.ok(
    seam <= maxStep * 1.5,
    `loop seam ${seam} must not exceed the signal's own step ${maxStep}`,
  );
  // 尾段淡出區完全不能進到循環裡，否則會聽見音樂變小聲。
  let tailPeak = 0;
  for (let i = out.length - rate; i < out.length; i += 1)
    tailPeak = Math.max(tailPeak, Math.abs(out[i]));
  assert.ok(tailPeak > 0.3, 'the faded-out ending must be excluded');
  const naive = Math.abs(
    data[Math.round(BED_LOOP.start * rate)] -
      data[Math.round(BED_LOOP.end * rate) - 1],
  );
  assert.ok(seam < naive, 'folding must beat a plain cut');
  console.log('bed loop seam is folded, not cut: PASS');
}

// 16 — 署名資料必須完整、可出貨，且與人工查證過的來源頁事實一致。
{
  assert.ok(STARLIT_AUDIO_CREDITS.length >= 3);
  for (const credit of STARLIT_AUDIO_CREDITS) {
    for (const key of [
      'role',
      'title',
      'author',
      'license',
      'attribution',
      'source',
      'file',
      'changes',
    ] as const)
      assert.ok(credit[key].length > 0, `${credit.title}.${key} is empty`);
    assert.match(credit.source, /^https:\/\//);
    assert.match(credit.file, /^https:\/\//);
    if (credit.authorUrl) assert.match(credit.authorUrl, /^https:\/\//);
  }

  // 2026-09-14 逐頁讀 OpenGameArt 來源頁抄下來的事實。這些字串是外部要求的
  // 複本，不是從其他本地資料推導出來的，所以資料飄掉時這裡會先失敗。
  const VERIFIED = [
    {
      source: 'https://opengameart.org/content/ethereal',
      author: 'wipics',
      license: 'CC0 1.0',
      authorUrl: undefined,
      submitter: undefined,
    },
    {
      // Author 欄位是 Varkalandar，但 Attribution Notice 明文要求：
      // "please state my name, Hansjörg Malthaner, and link here:
      //  http://opengameart.org/users/varkalandar"
      source: 'https://opengameart.org/content/glass-bell-sounds',
      author: 'Hansjörg Malthaner',
      license: 'CC-BY 3.0',
      authorUrl: 'https://opengameart.org/users/varkalandar',
      submitter: 'Varkalandar',
    },
    {
      // 來源頁：Author: The Berklee College of Music (Submitted by qubodup)
      source: 'https://opengameart.org/content/shimmer-glitter-magic',
      author: 'The Berklee College of Music',
      license: 'CC-BY 3.0',
      authorUrl: undefined,
      submitter: 'qubodup',
    },
  ];
  for (const fact of VERIFIED) {
    const used = STARLIT_AUDIO_CREDITS.filter((c) => c.source === fact.source);
    assert.ok(used.length > 0, `${fact.source} is no longer credited`);
    for (const credit of used) {
      assert.equal(credit.author, fact.author, `${fact.source} author`);
      assert.equal(credit.license, fact.license, `${fact.source} licence`);
      assert.equal(credit.authorUrl, fact.authorUrl, `${fact.source} link`);
      assert.equal(
        credit.submitter,
        fact.submitter,
        `${fact.source} submitter`,
      );
      // 提交者不可以被當成作者拿去署名。
      if (fact.submitter)
        assert.notEqual(
          credit.author,
          fact.submitter,
          `${fact.source} credits the submitter instead of the author`,
        );
    }
  }
  // CC-BY 指定了連結的素材，署名文字與連結都必須留著。
  const glass = STARLIT_AUDIO_CREDITS.find((c) => c.authorUrl);
  assert.ok(glass);
  assert.match(glass.attribution, /Hansjörg Malthaner/);
  assert.match(glass.attribution, /opengameart\.org\/users\/varkalandar/);

  // 公開檔案與程式裡的資料必須一致，否則網站上看到的署名會過期。
  const published = fs.readFileSync(
    new URL('../public/audio-starlit/CREDITS.md', import.meta.url),
    'utf8',
  );
  for (const credit of STARLIT_AUDIO_CREDITS) {
    assert.ok(published.includes(credit.source), `${credit.title} source`);
    assert.ok(published.includes(credit.file), `${credit.title} file`);
    assert.ok(published.includes(credit.author), `${credit.title} author`);
    assert.ok(published.includes(credit.attribution), `${credit.title} credit`);
    assert.ok(published.includes(credit.changes), `${credit.title} changes`);
    if (credit.authorUrl)
      assert.ok(published.includes(credit.authorUrl), `${credit.title} link`);
    if (credit.submitter)
      assert.ok(
        published.includes(credit.submitter),
        `${credit.title} submitter`,
      );
  }
  console.log(
    'credits match the verified source pages and are published: PASS',
  );
}

// 18 — Coordinator finding：等待期間的一般控制（語言、品牌、署名、重試）
// 不可以解鎖，也不可以出聲；只有真正的開場 CLICK 可以。
{
  const h = harness();
  h.audio.sync({ stage: 'loading' });
  h.audio.click();
  h.audio.sync({ stage: 'waiting' });
  await h.last().finish();
  assert.equal(h.audio.getSnapshot().status, 'ready', 'assets are ready');

  h.last().calls.length = 0;
  for (let i = 0; i < 3; i += 1) h.audio.click();
  assert.deepEqual(
    h.last().calls,
    [],
    'a language or brand press on the waiting sky is silent and never unlocks',
  );
  assert.equal(h.audio.getSnapshot().unlocked, false);

  // 真正的 CLICK 仍然要在同一下出聲。
  h.audio.start();
  assert.deepEqual(h.last().calls, ['unlock', 'cue:click']);
  h.audio.sync({ stage: 'approach' });
  h.last().calls.length = 0;
  h.audio.click();
  assert.deepEqual(
    h.last().calls,
    ['cue:click'],
    'once the opening has begun, ordinary controls click like everything else',
  );

  // 重播回到等待：解鎖狀態還在，但一般控制必須重新安靜下來。
  h.audio.sync({ stage: 'waiting', replay: 1 });
  h.last().calls.length = 0;
  h.audio.click();
  assert.deepEqual(
    h.last().calls,
    [],
    'after a replay the waiting sky is silent for ordinary controls again',
  );

  // 音訊重試之後也一樣：重試本身不出聲，之後在等待切語言仍然安靜。
  h.audio.retry();
  await h.last().finish();
  h.last().calls.length = 0;
  h.audio.click();
  assert.deepEqual(
    h.last().calls,
    [],
    'an audio retry must not make the waiting sky audible either',
  );
  h.audio.start();
  assert.deepEqual(
    h.last().calls,
    ['cue:click'],
    'and the real CLICK still works after a retry',
  );
  console.log('only the opening CLICK may sound on the waiting sky: PASS');
}

// 19 — 3D 還沒就緒或已失敗時，連開場 CLICK 也不出聲。
{
  const h = harness();
  h.audio.sync({ stage: 'loading' });
  await h.last().finish();
  h.last().calls.length = 0;
  h.audio.start();
  assert.deepEqual(
    h.last().calls,
    ['unlock'],
    'a press while the scene is still loading unlocks but stays silent',
  );
  h.audio.sync({ stage: 'error' });
  h.last().calls.length = 0;
  h.audio.start();
  h.audio.click();
  assert.deepEqual(h.last().calls, [], 'the error stage is silent for both');
  console.log('loading and error stay silent for every press: PASS');
}

// 20 — Reviewer A/B F1：暫停期間的控制按下不可以被排進凍結的時鐘，
// 恢復時也不可以補播；床音必須是同一條、從原處接續。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  await h.last().finish();
  h.audio.start();
  h.audio.sync({ stage: 'approach' });
  assert.ok(h.last().calls.includes('startBed'));

  h.last().calls.length = 0;
  h.audio.sync({ stage: 'approach', paused: true });
  assert.deepEqual(h.last().calls, ['suspended:true']);

  // 暫停中連按語言／品牌／章節：一個 cue 都不該產生。
  for (let i = 0; i < 4; i += 1) h.audio.click();
  h.audio.sync({ stage: 'approach', paused: true, pose: 1 });
  h.audio.sync({ stage: 'front', paused: true, pose: 1 });
  assert.deepEqual(
    h.last().calls.filter((c) => c.startsWith('cue:')),
    [],
    'nothing is scheduled onto the frozen clock',
  );
  assert.ok(
    !h.last().calls.includes('stopBed'),
    'the bed is only suspended, never stopped',
  );

  // 恢復：只有 resume，沒有任何補播。
  h.last().calls.length = 0;
  h.audio.sync({ stage: 'front', pose: 1 });
  assert.deepEqual(
    h.last().calls,
    ['suspended:false'],
    'resuming replays nothing that happened while paused',
  );

  // 恢復後的下一次真實操作照常出聲，而且床音仍是原本那一條。
  h.audio.click();
  h.audio.sync({ stage: 'back', pose: 1 });
  assert.deepEqual(h.last().calls, [
    'suspended:false',
    'cue:click',
    'cue:transition',
  ]);
  assert.equal(
    h.last().calls.filter((c) => c === 'startBed').length,
    0,
    'the single bed source continues from where it was',
  );
  console.log('a paused control press is dropped, never queued: PASS');
}

// 21 — 同一次回報既換幕又切到背景／從背景回來時，暫停狀態要先套用。
{
  const h = harness();
  h.audio.sync({ stage: 'waiting' });
  await h.last().finish();
  h.audio.start();
  h.audio.sync({ stage: 'approach' });

  h.last().calls.length = 0;
  // 換幕與「切到背景」同時到達：那一聲轉場不該被排進暫停的時鐘。
  h.audio.sync({ stage: 'front', hidden: true });
  assert.deepEqual(
    h.last().calls,
    ['suspended:true'],
    'suspension is applied before the stage cue is judged',
  );

  h.last().calls.length = 0;
  // 換幕與「回到前景」同時到達：這是當下的事件，照常出聲。
  h.audio.sync({ stage: 'back' });
  assert.deepEqual(h.last().calls, ['suspended:false', 'cue:transition']);
  console.log('suspension is applied before cues are judged: PASS');
}

// 22 — 保存的靜音必須在任何 source 啟動之前就讓輸出為 0。
// 手勢之前 AudioContext 的時鐘是凍結的：這時排一條 1→0 的漸變，等於把整段
// 淡出留到 CLICK 之後才跑，靜音偏好會在開場的頭幾十毫秒漏出聲音。暫停中按
// 靜音也是同一個狀況。使用者自己在播放中切換靜音時，淡入淡出仍要保留。
{
  /** 只夠檢查增益排程的假 WebAudio：時鐘要自己推進，AudioParam 會記下排程。 */
  class FakeParam {
    events: { kind: 'set' | 'ramp'; value: number; time: number }[] = [];
    #value = 1;
    get value() {
      return this.#value;
    }
    set value(v: number) {
      this.#value = v;
      this.events.push({ kind: 'set', value: v, time: 0 });
    }
    setValueAtTime(value: number, time: number) {
      this.#value = value;
      this.events.push({ kind: 'set', value, time });
    }
    linearRampToValueAtTime(value: number, time: number) {
      this.events.push({ kind: 'ramp', value, time });
    }
    cancelScheduledValues(time: number) {
      this.events = this.events.filter((e) => e.time < time);
    }
    /** 依已排程的事件求某一刻的實際增益，漸變之間線性內插。 */
    at(time: number) {
      let value = 1;
      let from = 0;
      for (const e of this.events) {
        if (e.time <= time) {
          value = e.value;
          from = e.time;
          continue;
        }
        if (e.kind !== 'ramp') break;
        const span = e.time - from;
        return span <= 0
          ? e.value
          : value + (e.value - value) * ((time - from) / span);
      }
      return value;
    }
  }
  const gains: { gain: FakeParam }[] = [];
  const contexts: FakeContext[] = [];
  /** 下一個 context 生出來時長什麼樣：Chromium 允許自動播放時它一開始就是 running。 */
  const spawn = { state: 'suspended', slowSuspend: false };
  class FakeContext {
    state = spawn.state;
    /** true 時 suspend() 不同步改 state，用來模擬意圖與實際狀態之間的空窗。 */
    slowSuspend = spawn.slowSuspend;
    currentTime = 0;
    constructor() {
      contexts.push(this);
    }
    destination = { name: 'destination' };
    createGain() {
      const node = { gain: new FakeParam(), connect() {}, disconnect() {} };
      gains.push(node);
      return node;
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() {
      if (!this.slowSuspend) this.state = 'suspended';
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  }
  const globals = globalThis as { AudioContext?: unknown };
  const realCtor = globals.AudioContext;
  globals.AudioContext = FakeContext;
  try {
    const never = (() =>
      new Promise<Response>(() => {})) as unknown as typeof fetch;

    // 沒有靜音偏好時，master 從頭到尾就是全開。
    gains.length = 0;
    createWebAudioEngine(STARLIT_AUDIO_ASSETS, never);
    const open = gains[0].gain;
    assert.equal(open.at(0), 1, 'an unmuted engine starts fully open');
    assert.equal(open.at(0.2), 1, 'and stays open');

    // 保存的靜音：任何時刻都必須是 0，不能只是「之後會降到 0」。
    gains.length = 0;
    const engine = createWebAudioEngine(STARLIT_AUDIO_ASSETS, never);
    const master = gains[0].gain;
    engine.setMuted(true);
    for (const t of [0, 0.02, 0.06, 0.1, 0.12, 0.5])
      assert.equal(
        master.at(t),
        0,
        `a stored mute is silent at ${t}s, before the gesture ever starts the clock`,
      );

    // 播放中由使用者切換靜音時，淡入淡出照舊。
    engine.unlock();
    assert.equal(master.at(0), 0, 'unlocking does not reopen a stored mute');
    engine.setMuted(false);
    assert.equal(master.at(0), 0, 'the unmute starts from silence');
    assert.ok(
      master.at(0.06) > 0 && master.at(0.06) < 1,
      'the unmute is a fade, not a jump',
    );
    assert.equal(master.at(0.2), 1, 'the unmute finishes fully open');

    // context 一開始就是 running（Chromium 允許自動播放，或重試時在已解鎖的頁面上
    // 新建 engine）：保存的靜音同樣不能只排一條漸變，否則剛開始的床音會撞進去。
    gains.length = 0;
    spawn.state = 'running';
    const running = createWebAudioEngine(STARLIT_AUDIO_ASSETS, never);
    const runningMaster = gains[0].gain;
    running.setMuted(true);
    for (const t of [0, 0.02, 0.06, 0.08, 0.12, 0.5])
      assert.equal(
        runningMaster.at(t),
        0,
        `a stored mute is silent at ${t}s even when the context starts running`,
      );
    running.setMuted(false);
    assert.ok(
      runningMaster.at(0.06) > 0 && runningMaster.at(0.06) < 1,
      'a later toggle on a running context still fades',
    );
    assert.equal(runningMaster.at(0.2), 1, 'and finishes fully open');

    // 我們已經要求暫停，但 context.state 要等非同步的 suspend() 才會跟上。
    // 這段空窗裡排的漸變會整段留到恢復那一刻才跑，所以看的是自己的意圖。
    gains.length = 0;
    spawn.slowSuspend = true;
    const seam = createWebAudioEngine(STARLIT_AUDIO_ASSETS, never);
    const seamMaster = gains[0].gain;
    const seamContext = contexts[contexts.length - 1];
    seam.setMuted(false);
    seam.unlock();
    seam.setSuspended(true);
    assert.equal(
      seamContext.state,
      'running',
      'the seam is real: state has not caught up with the intent yet',
    );
    seam.setMuted(true);
    for (const t of [0, 0.02, 0.06, 0.12])
      assert.equal(
        seamMaster.at(t),
        0,
        `muting inside the suspend seam is silent at ${t}s`,
      );
  } finally {
    globals.AudioContext = realCtor;
    spawn.state = 'suspended';
    spawn.slowSuspend = false;
  }
  console.log(
    'a stored mute is silent from before the first source, on a suspended or a running context: PASS',
  );
}
