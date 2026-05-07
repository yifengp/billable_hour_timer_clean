(function() {
  function createTimerState(nowMs) {
    return {
      status: 'idle',
      startTime: null,
      lastStartedAtMs: nowMs,
      activeElapsedMs: 0,
      pausedElapsedMs: 0,
      pausedAtMs: null
    };
  }

  function startTimerState(now) {
    return {
      status: 'running',
      startTime: now,
      lastStartedAtMs: now.getTime(),
      activeElapsedMs: 0,
      pausedElapsedMs: 0,
      pausedAtMs: null
    };
  }

  function pauseTimerState(state, nowMs) {
    if (state.status !== 'running') return state;
    return {
      ...state,
      status: 'paused',
      activeElapsedMs: getActiveElapsedMs(state, nowMs),
      pausedAtMs: nowMs
    };
  }

  function resumeTimerState(state, nowMs) {
    if (state.status !== 'paused') return state;
    return {
      ...state,
      status: 'running',
      lastStartedAtMs: nowMs,
      pausedElapsedMs: state.pausedElapsedMs + Math.max(0, nowMs - state.pausedAtMs),
      pausedAtMs: null
    };
  }

  function stopTimerState(state, nowMs) {
    const activeElapsedMs = getActiveElapsedMs(state, nowMs);
    const pausedElapsedMs = getPausedElapsedMs(state, nowMs);

    return {
      ...state,
      status: 'stopping',
      activeElapsedMs,
      pausedElapsedMs,
      pausedAtMs: null
    };
  }

  function getActiveElapsedMs(state, nowMs) {
    if (state.status === 'running') {
      return state.activeElapsedMs + Math.max(0, nowMs - state.lastStartedAtMs);
    }

    return state.activeElapsedMs;
  }

  function getPausedElapsedMs(state, nowMs) {
    if (state.status === 'paused' && state.pausedAtMs !== null) {
      return state.pausedElapsedMs + Math.max(0, nowMs - state.pausedAtMs);
    }

    return state.pausedElapsedMs;
  }

  function getUnitCount(elapsedMs, unitLengthMinutes) {
    const minutes = Math.floor(elapsedMs / 60000);
    const unitLength = Math.max(1, Number(unitLengthMinutes) || 1);
    return Math.max(1, Math.floor(minutes / unitLength) + 1);
  }

  function minutesFromMs(ms) {
    return Math.round((Math.max(0, ms) / 60000) * 10) / 10;
  }

  window.BillableTimer = {
    createTimerState,
    startTimerState,
    pauseTimerState,
    resumeTimerState,
    stopTimerState,
    getActiveElapsedMs,
    getPausedElapsedMs,
    getUnitCount,
    minutesFromMs
  };
})();
