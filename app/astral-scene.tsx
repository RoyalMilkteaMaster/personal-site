'use client';
import { useEffect, useRef, useState } from 'react';
import type { IntroState } from '@/lib/portrait-intro';
import { mountFantasyScene } from '@/lib/fantasy/scene.mjs';
export default function AstralScene({
  pose,
  replay,
  advance,
  onIntroState,
}: {
  pose: number;
  replay: number;
  advance: number;
  onIntroState: (state: IntroState) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    command = useRef({ pose, replay, advance, onIntroState });
  const [error, setError] = useState('');
  useEffect(() => {
    command.current = { pose, replay, advance, onIntroState };
  }, [pose, replay, advance, onIntroState]);
  useEffect(() => {
    if (error)
      onIntroState({ stage: 'done', visibleChars: 0, canAdvance: false });
  }, [error, replay, onIntroState]);
  useEffect(() => {
    if (!canvasRef.current) return;
    return mountFantasyScene(
      canvasRef.current,
      () => command.current,
      setError,
    );
  }, []);
  return (
    <>
      <canvas
        ref={canvasRef}
        className="astral-canvas"
        style={error ? { display: 'none' } : undefined}
        aria-label="持續由彩色星點構成的角色，切換主題時粒子重構"
        role="img"
      />
      {error && (
        <p className="scene-error" role="status">
          {error}
        </p>
      )}
    </>
  );
}
