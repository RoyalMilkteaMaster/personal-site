'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createStarlitAudio,
  type StarlitAudio,
  type StarlitAudioInput,
  type StarlitAudioOptions,
  type StarlitAudioSnapshot,
} from './starlit-audio';

/** 全部是已綁定的閉包，可以安全解構後交給事件處理器。 */
export type StarlitAudioControl = StarlitAudioSnapshot & {
  /**
   * 開場 CLICK 與其鍵盤等價操作。務必在 onClick／onKeyDown 裡同步呼叫，
   * 瀏覽器才會解鎖音訊；這是唯一會啟動聲音的入口。
   */
  start: () => void;
  /**
   * 一般控制的按下音（語言、品牌、章節、重試）。不會啟動聲音，在還沒走進
   * 星空的等待幕裡也完全不出聲。移過按鈕不要呼叫，hover 才會維持無聲。
   */
  click: () => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  retry: () => void;
};

const INITIAL: StarlitAudioSnapshot = {
  status: 'idle',
  unlocked: false,
  muted: false,
  error: '',
};

/**
 * 把外部真實事件接到聲音核心。stage／paused 來自 scene 回報的 intro state，
 * hidden 來自 visibilitychange，pose／replay 來自頁面既有的章節與重播狀態；
 * 這個 hook 自己不推進任何幕。
 */
export function useStarlitAudio(
  input: StarlitAudioInput,
  options?: StarlitAudioOptions,
): StarlitAudioControl {
  const [audio, setAudio] = useState<StarlitAudio | null>(null);
  const [state, setState] = useState(INITIAL);
  const { stage, paused, hidden, pose, replay } = input;
  // 選項只在掛載時取用，之後改變不重建音訊。
  const setup = useRef(options);

  useEffect(() => {
    // 在效果裡建立，於 SSR 與 StrictMode 重掛載時都不會留下孤兒 AudioContext。
    const instance = createStarlitAudio(setup.current);
    const update = () => setState(instance.getSnapshot());
    const unsubscribe = instance.subscribe(update);
    update(); // 帶入已保存的靜音偏好
    setAudio(instance);
    return () => {
      unsubscribe();
      instance.dispose();
      setAudio(null);
      setState(INITIAL);
    };
  }, []);

  useEffect(() => {
    audio?.sync({ stage, paused, hidden, pose, replay });
  }, [audio, stage, paused, hidden, pose, replay]);

  const start = useCallback(() => audio?.start(), [audio]);
  const click = useCallback(() => audio?.click(), [audio]);
  const setMuted = useCallback(
    (muted: boolean) => audio?.setMuted(muted),
    [audio],
  );
  const toggleMute = useCallback(() => audio?.toggleMute(), [audio]);
  const retry = useCallback(() => audio?.retry(), [audio]);

  return { ...state, start, click, setMuted, toggleMute, retry };
}
