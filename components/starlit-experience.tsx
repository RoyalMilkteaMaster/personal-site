'use client';
import { Menu } from '@base-ui/react/menu';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import StarlitShell, { StarlitReader } from '@/components/starlit-shell';
import { mountFantasyScene } from '@/lib/fantasy/scene.mjs';
import { createIntro } from '@/lib/fantasy/starlit-intro.mjs';
import {
  applyDocumentLanguage,
  copy,
  readLanguage,
  saveLanguage,
  type Language,
} from '@/lib/site-copy';
import styles from '@/app/starlit-preview/preview.module.css';

/**
 * What the scene reports. `readingStep` and `settled` belong to the reading
 * interface 07 owns (work/starlit-implementation/visual-revision/interface.md);
 * they are optional here so this page compiles before and after that lands,
 * and a missing `settled` simply means no words are shown yet.
 */
type Progress = ReturnType<ReturnType<typeof createIntro>['state']> & {
  readingStep?: number;
  settled?: boolean;
  /**
   * The brand-opening contract with the scene: the scene sets this once it is
   * painting the orthographic 3D 「Royal Milktea Master」 above the figure, and
   * the reader then stops showing its own heading for that word. Absent — as
   * it is until the 3D brand lands — the readable heading stays on, so the
   * opening is never blank and the word is never shown twice.
   */
  brandIn3D?: boolean;
};
const loading = (): Progress => ({
  ...createIntro().state(),
  stage: 'loading',
  text: '',
  settled: false,
});

export default function StarlitExperience({ mountScene = mountFantasyScene, study = false }: { mountScene?: typeof mountFantasyScene; study?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [intro, setIntro] = useState<Progress>(loading);
  // Starts Chinese so the server and the first client render agree; the stored
  // preference of this browser is applied right after mount.
  const [language, setLanguage] = useState<Language>('zh');
  const [switched, setSwitched] = useState(false);
  // The beat the visitor scrolled to, and whether the chapters are open. Both
  // are commands to the scene; nothing is queued, the scene always sees the
  // latest target.
  const [step, setStep] = useState(0);
  const [contentOpen, setContentOpen] = useState(false);
  const [pose, setPose] = useState(0),
    [replay, setReplay] = useState(0);
  const [attempt, setAttempt] = useState(0),
    [failed, setFailed] = useState(false),
    [hidden, setHidden] = useState(false);
  const command = useRef({
    pose,
    replay,
    language,
    readingStep: step,
    contentOpen,
    onIntroState: setIntro,
  });
  useEffect(() => {
    command.current = {
      pose,
      replay,
      language,
      readingStep: step,
      contentOpen,
      onIntroState: setIntro,
    };
  }, [pose, replay, language, step, contentOpen]);
  useEffect(() => {
    // The stored choice of this browser, applied once the client is running.
    // oxlint-disable-next-line react/react-compiler
    setLanguage(readLanguage());
  }, []);
  // The tab title and `lang` follow the chosen language, and are handed back
  // untouched when the language changes again or the route goes away.
  useEffect(() => applyDocumentLanguage(document, language), [language]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!canvas.current) return;
    try {
      return mountScene(
        canvas.current,
        () => command.current,
        () => setFailed(true),
        { starlit: true },
      );
    } catch {
      // A synchronous WebGL mount failure must reach the retry UI.
      // oxlint-disable-next-line react/react-compiler
      setFailed(true);
    }
  }, [attempt, mountScene]);
  // 本輪不含音訊（Spec 2026-09-14 範圍修訂）。閱讀由原生捲動決定，開場沒有
  // 自動換段，所以這裡也沒有倒數或提前繼續的按鍵處理。
  const restart = () => {
    setContentOpen(false);
    setPose(0);
    setStep(0);
    setReplay((n) => n + 1);
  };
  // The closing beat: the shooting star has already passed, so open the chapter
  // the visitor chose. The canvas stays mounted throughout.
  const enter = useCallback((chapter: number) => {
    setPose(chapter);
    setContentOpen(true);
  }, []);
  const switchLanguage = (next: Language) => {
    setLanguage(next);
    saveLanguage(next);
    setSwitched(true);
  };
  const t = copy(language);
  const open = contentOpen && !failed;
  // 07 reports the beat it is actually showing; before it does, the scroll
  // position this page owns is the only answer.
  const shown = intro.readingStep ?? step;
  return (
    <div
      className={styles.preview}
      data-stage={failed ? 'error' : intro.stage}
      data-paused={hidden || intro.paused}
      data-language={language}
    >
      <StarlitShell
        introComplete={open}
        active={String(pose)}
        onActiveChange={(value) => setPose(Number(value))}
        onReplay={restart}
        language={language}
        controls={
          <div
            role="presentation"
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Menu.Root>
              <Menu.Trigger className={styles.language} aria-label="Language">
                <Globe size={22} aria-hidden="true" />
                <span lang="en">Language</span>
                <ChevronDown size={18} aria-hidden="true" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Backdrop className={styles.languageBackdrop} />
                <Menu.Positioner align="end" sideOffset={8} className={styles.languagePositioner}>
                  <Menu.Popup className={styles.languagePopup}>
                    <Menu.RadioGroup value={language} onValueChange={switchLanguage}>
                      {(['zh', 'en'] as const).map((value) => (
                        <Menu.RadioItem key={value} value={value} closeOnClick className={styles.languageItem}
                          lang={value === 'zh' ? 'zh-Hant' : 'en'}>
                          {value === 'zh' ? '繁體中文' : 'English'}
                          <Menu.RadioItemIndicator><Check size={16} aria-hidden="true" /></Menu.RadioItemIndicator>
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        }
        stage={
          <canvas
            key={attempt}
            ref={canvas}
            data-variant={study ? 'E' : undefined}
            data-opening-study={study ? 'true' : undefined}
            data-playing={study ? 'true' : undefined}
            data-speed={study ? '1' : undefined}
            className={styles.canvas}
            aria-label={t.preview.canvas}
            // WebGL requires canvas; an img cannot represent this live scene.
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
            role="img"
          />
        }
      >
        {failed ? (
          <div role="alert" className={styles.failure}>
            <p>{t.preview.error}</p>
            <button
              className={styles.retry}
              onClick={() => {
                setFailed(false);
                setIntro(loading);
                setPose(0);
                setStep(0);
                setContentOpen(false);
                setAttempt((n) => n + 1);
              }}
            >
              {t.preview.retry}
            </button>
          </div>
        ) : (
          <StarlitReader
            language={language}
            step={step}
            text={intro.text || ''}
            settled={Boolean(intro.settled) && shown === step}
            // Away or paused, the words hold where they are instead of reading
            // themselves out to an empty room.
            paused={hidden || Boolean(intro.paused)}
            onStepChange={setStep}
            onEnter={enter}
            replay={replay}
            brandIn3D={Boolean(intro.brandIn3D)}
          />
        )}
        {/* Frameless status line; it never advances anything on its own. */}
        <output className={styles.status}>
          {intro.paused
            ? t.preview.statusPaused
            : intro.stage === 'loading'
              ? t.preview.statusLoading
              : intro.settled
                ? ' '
                : t.preview.statusMoving}
        </output>
      </StarlitShell>
      {/* Announces the switch without moving anyone's place in the opening. */}
      {switched ? (
        <output className={styles.announce}>{t.languageStatus}</output>
      ) : null}
    </div>
  );
}
