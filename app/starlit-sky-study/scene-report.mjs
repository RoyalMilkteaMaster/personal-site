// Renderer timing stays local. The brand reader owns its timed text reveal and
// consumes semantic scene changes only; diagnostic study consumers retain the
// legacy visibleChars/propReveal notifications.
export function introReportKey(state, brandRevision) {
  return JSON.stringify({
    stage: state.stage,
    readingStep: state.readingStep,
    settled: state.settled,
    language: state.language,
    canAdvance: state.canAdvance,
    paused: state.paused,
    ...(!brandRevision ? {
      visibleChars: state.visibleChars,
      propReveal: Math.round((state.propReveal ?? 0) * 50),
    } : {}),
  });
}
