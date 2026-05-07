(function() {
  const STORAGE_KEYS = {
    unitLength: 'unitLength',
    history: 'floating_counter_history',
    milestone: 'billable_milestone_settings'
  };

  const iconURL = chrome.runtime.getURL('icon1.png');
  const iconCountingURL = chrome.runtime.getURL('icon2.png');

  const timerTools = window.BillableTimer;
  const milestoneTools = window.BillableMilestone;

  const elements = {
    unitLengthInput: document.getElementById('unitLengthInput'),
    dateLine: document.getElementById('dateLine'),
    currentTime: document.getElementById('currentTime'),
    unitDisplay: document.getElementById('unitDisplay'),
    startStopButton: document.getElementById('startStopButton'),
    pauseResumeButton: document.getElementById('pauseResumeButton'),
    overlay: document.getElementById('overlay'),
    lastSessionTitle: document.getElementById('lastSessionTitle'),
    lastSessionInfo: document.getElementById('lastSessionInfo'),
    viewHistoryButton: document.getElementById('viewHistoryButton'),
    historyArea: document.getElementById('historyArea'),
    historyDisplay: document.getElementById('historyDisplay'),
    clearHistoryButton: document.getElementById('clearHistoryButton'),
    modal: document.getElementById('inputModal'),
    clientInput: document.getElementById('clientInput'),
    notesInput: document.getElementById('notesInput'),
    confirmSaveButton: document.getElementById('confirmSaveButton'),
    targetHoursInput: document.getElementById('targetHoursInput'),
    startingHoursInput: document.getElementById('startingHoursInput'),
    milestoneSummary: document.getElementById('milestoneSummary')
  };

  let timerInterval = null;
  let clockInterval = null;
  let timerState = timerTools.createTimerState(Date.now());
  let unitLength = 6;
  let sessionHistory = [];
  let sessionIndex = 1;
  let pendingSession = null;
  let milestoneSettings = {
    targetHours: '',
    startingHours: ''
  };

  init();

  function init() {
    elements.startStopButton.style.backgroundImage = `url('${iconURL}')`;
    bindEvents();
    startClock();
    restoreSettingsAndHistory();
  }

  function bindEvents() {
    elements.unitLengthInput.addEventListener('change', handleUnitLengthChange);
    elements.startStopButton.addEventListener('click', handleStartStopClick);
    elements.pauseResumeButton.addEventListener('click', handlePauseResumeClick);
    elements.confirmSaveButton.addEventListener('click', handleConfirmSave);
    elements.viewHistoryButton.addEventListener('click', handleToggleHistory);
    elements.clearHistoryButton.addEventListener('click', handleClearHistory);
    elements.targetHoursInput.addEventListener('change', handleMilestoneChange);
    elements.startingHoursInput.addEventListener('change', handleMilestoneChange);
  }

  function startClock() {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayNames[now.getDay()];
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    elements.dateLine.textContent = `${day} ${dateStr}`;
    elements.currentTime.textContent = timeStr;
  }

  function restoreSettingsAndHistory() {
    chrome.storage.local.get([STORAGE_KEYS.unitLength, STORAGE_KEYS.history, STORAGE_KEYS.milestone], (result) => {
      unitLength = clampUnitLength(result[STORAGE_KEYS.unitLength] || 6);
      elements.unitLengthInput.value = unitLength;

      sessionHistory = parseHistory(result[STORAGE_KEYS.history] || '');
      sessionIndex = sessionHistory.length + 1;

      milestoneSettings = {
        targetHours: result[STORAGE_KEYS.milestone]?.targetHours ?? '',
        startingHours: result[STORAGE_KEYS.milestone]?.startingHours ?? ''
      };
      elements.targetHoursInput.value = milestoneSettings.targetHours;
      elements.startingHoursInput.value = milestoneSettings.startingHours;

      renderLastSession();
      renderMilestone();
    });
  }

  function handleUnitLengthChange(event) {
    unitLength = clampUnitLength(event.target.value);
    elements.unitLengthInput.value = unitLength;
    chrome.storage.local.set({ [STORAGE_KEYS.unitLength]: unitLength });
    renderCurrentSession();
    renderMilestone();
  }

  function handleStartStopClick() {
    if (timerState.status === 'idle') {
      startSession();
      return;
    }

    if (timerState.status === 'running' || timerState.status === 'paused') {
      stopSession();
    }
  }

  function startSession() {
    const now = new Date();
    timerState = timerTools.startTimerState(now);
    pendingSession = null;
    startTimerInterval();
    showOverlay('Start!', { fontSize: '32px', fontWeight: '900' });
    elements.startStopButton.style.backgroundImage = `url('${iconCountingURL}')`;
    elements.startStopButton.classList.remove('is-paused');
    elements.pauseResumeButton.disabled = false;
    elements.pauseResumeButton.textContent = 'Pause';
    renderCurrentSession();
  }

  function stopSession() {
    const now = new Date();
    timerState = timerTools.stopTimerState(timerState, now.getTime());
    stopTimerInterval();

    const activeElapsedMs = timerTools.getActiveElapsedMs(timerState, now.getTime());
    const pausedElapsedMs = timerTools.getPausedElapsedMs(timerState, now.getTime());
    const units = timerTools.getUnitCount(activeElapsedMs, unitLength);

    pendingSession = {
      startTime: timerState.startTime,
      endTime: now,
      units,
      activeMinutes: timerTools.minutesFromMs(activeElapsedMs),
      pausedMinutes: timerTools.minutesFromMs(pausedElapsedMs),
      unitLength
    };

    elements.pauseResumeButton.disabled = true;
    elements.pauseResumeButton.textContent = 'Pause';
    elements.startStopButton.style.backgroundImage = `url('${iconURL}')`;
    elements.startStopButton.classList.remove('is-paused');
    elements.modal.style.display = 'flex';
    showOverlay('End', { fontSize: '32px', fontWeight: '900' });
  }

  function handlePauseResumeClick() {
    const nowMs = Date.now();

    if (timerState.status === 'running') {
      timerState = timerTools.pauseTimerState(timerState, nowMs);
      stopTimerInterval();
      elements.pauseResumeButton.textContent = 'Resume';
      elements.startStopButton.classList.add('is-paused');
      showOverlay('Pause', { fontSize: '28px', fontWeight: '900' });
      renderCurrentSession();
      return;
    }

    if (timerState.status === 'paused') {
      timerState = timerTools.resumeTimerState(timerState, nowMs);
      startTimerInterval();
      elements.pauseResumeButton.textContent = 'Pause';
      elements.startStopButton.classList.remove('is-paused');
      showOverlay('Resume', { fontSize: '24px', fontWeight: '900' });
      renderCurrentSession();
    }
  }

  function startTimerInterval() {
    stopTimerInterval();
    timerInterval = setInterval(renderCurrentSession, 1000);
  }

  function stopTimerInterval() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function renderCurrentSession() {
    if (timerState.status !== 'running' && timerState.status !== 'paused') return;

    const nowMs = Date.now();
    const activeMs = timerTools.getActiveElapsedMs(timerState, nowMs);
    const pausedMs = timerTools.getPausedElapsedMs(timerState, nowMs);
    const units = timerTools.getUnitCount(activeMs, unitLength);
    const label = timerState.status === 'paused' ? 'Paused' : 'Running';

    elements.unitDisplay.textContent = `${label}: ${units} Units`;
    elements.unitDisplay.style.display = 'block';
    elements.lastSessionTitle.textContent = 'Current Session';
    renderTable(elements.lastSessionInfo, [
      ['Start', formatTimeWithMonthDay(timerState.startTime)],
      ['End', timerState.status === 'paused' ? 'Paused' : ''],
      ['Units', String(units)],
      ['Active Minutes', String(timerTools.minutesFromMs(activeMs))],
      ['Paused Minutes', String(timerTools.minutesFromMs(pausedMs))]
    ], true);
  }

  function handleConfirmSave() {
    if (!pendingSession) return;

    const clientText = elements.clientInput.value.trim();
    const notesText = elements.notesInput.value.trim();
    const record = buildSessionRecord(pendingSession, clientText, notesText);

    saveSessionRecord(record, (allHistory) => {
      renderLastSession(record);
      downloadHistory(allHistory, pendingSession.startTime);
      resetAfterSave();
      renderMilestone();
    });
  }

  function buildSessionRecord(session, clientText, notesText) {
    return [
      `No. ${sessionIndex}`,
      `Start: ${formatTimeWithMonthDay(session.startTime)}`,
      `End: ${formatTimeWithMonthDay(session.endTime)}`,
      `Units: ${session.units}`,
      `Unit Length Minutes: ${session.unitLength}`,
      `Active Minutes: ${session.activeMinutes}`,
      `Paused Minutes: ${session.pausedMinutes}`,
      `Client / Project ID: ${clientText}`,
      `Notes: ${notesText}`,
      '=====',
      ''
    ].join('\n');
  }

  function saveSessionRecord(record, callback) {
    chrome.storage.local.get([STORAGE_KEYS.history], (result) => {
      const currentHistory = result[STORAGE_KEYS.history] || '';
      const allHistory = currentHistory + record;
      chrome.storage.local.set({ [STORAGE_KEYS.history]: allHistory }, () => {
        sessionHistory = parseHistory(allHistory);
        sessionIndex = sessionHistory.length + 1;
        callback(allHistory);
      });
    });
  }

  function resetAfterSave() {
    elements.clientInput.value = '';
    elements.notesInput.value = '';
    elements.modal.style.display = 'none';
    elements.unitDisplay.textContent = 'Idle';
    elements.unitDisplay.style.display = 'block';
    elements.lastSessionTitle.textContent = 'Last Session';
    elements.startStopButton.style.backgroundImage = `url('${iconURL}')`;
    elements.startStopButton.classList.remove('is-paused');
    elements.pauseResumeButton.disabled = true;
    elements.pauseResumeButton.textContent = 'Pause';
    timerState = timerTools.createTimerState(Date.now());
    pendingSession = null;
  }

  function renderLastSession(optionalRecord) {
    const record = optionalRecord || sessionHistory[sessionHistory.length - 1];
    elements.lastSessionTitle.textContent = 'Last Session';

    if (!record) {
      elements.lastSessionInfo.textContent = '';
      return;
    }

    renderRecordTable(elements.lastSessionInfo, record);
  }

  function handleToggleHistory() {
    if (elements.historyArea.style.display === 'none') {
      renderHistory();
      elements.historyArea.style.display = 'block';
      elements.viewHistoryButton.textContent = 'Close All History';
    } else {
      elements.historyArea.style.display = 'none';
      elements.viewHistoryButton.textContent = 'Show All Worklog';
    }
  }

  function renderHistory() {
    elements.historyDisplay.innerHTML = '';

    if (sessionHistory.length === 0) {
      elements.historyDisplay.textContent = 'No Worklog History';
      return;
    }

    sessionHistory.forEach((record, index) => {
      if (index > 0) elements.historyDisplay.appendChild(document.createElement('hr'));
      elements.historyDisplay.appendChild(createRecordTable(record));
    });
  }

  function handleClearHistory() {
    const shouldClear = window.confirm('Clean all saved worklog history? This cannot be undone.');
    if (!shouldClear) return;

    sessionHistory = [];
    chrome.storage.local.remove([STORAGE_KEYS.history], () => {
      elements.historyDisplay.textContent = '';
      elements.lastSessionInfo.textContent = '';
      sessionIndex = 1;
      renderMilestone();
    });
  }

  function handleMilestoneChange() {
    milestoneSettings = {
      targetHours: elements.targetHoursInput.value.trim(),
      startingHours: elements.startingHoursInput.value.trim()
    };
    chrome.storage.local.set({ [STORAGE_KEYS.milestone]: milestoneSettings });
    renderMilestone();
  }

  function renderMilestone() {
    const historyHours = milestoneTools.getHistoryHours(sessionHistory, unitLength);
    const result = milestoneTools.calculateMilestone(
      milestoneSettings.targetHours,
      milestoneSettings.startingHours,
      historyHours,
      new Date()
    );

    elements.milestoneSummary.innerHTML = '';
    appendMilestoneItem('Total progress', `${formatHours(result.total)} hrs (${Math.round(result.progress)}%)`);
    appendMilestoneItem('Remaining hours', `${formatHours(result.remaining)} hrs`);
    appendMilestoneItem('Weeks left', String(result.weeksLeft));
    appendMilestoneItem('Needed per week', `${formatHours(result.neededPerWeek)} hrs`);

    const feedback = document.createElement('div');
    feedback.className = 'full';
    feedback.textContent = result.message;
    elements.milestoneSummary.appendChild(feedback);
  }

  function appendMilestoneItem(label, value) {
    const item = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label;
    item.appendChild(strong);
    item.appendChild(document.createElement('br'));
    item.appendChild(document.createTextNode(value));
    elements.milestoneSummary.appendChild(item);
  }

  function renderRecordTable(container, record) {
    container.innerHTML = '';
    container.appendChild(createRecordTable(record));
  }

  function createRecordTable(record) {
    const rows = recordToRows(record);
    const table = document.createElement('table');
    table.className = 'session-table';
    const body = document.createElement('tbody');

    rows.forEach(([key, value]) => {
      const tr = document.createElement('tr');
      const keyCell = document.createElement('td');
      const valueCell = document.createElement('td');
      keyCell.className = getKeyClass(key);
      valueCell.className = 'session-value';
      keyCell.textContent = key;
      valueCell.textContent = value;
      tr.appendChild(keyCell);
      tr.appendChild(valueCell);
      body.appendChild(tr);
    });

    table.appendChild(body);
    return table;
  }

  function renderTable(container, rows, isCurrent) {
    const table = document.createElement('table');
    table.className = `session-table${isCurrent ? ' current-session-table' : ''}`;
    const body = document.createElement('tbody');

    rows.forEach(([key, value]) => {
      const tr = document.createElement('tr');
      const keyCell = document.createElement('td');
      const valueCell = document.createElement('td');
      keyCell.className = getKeyClass(key);
      valueCell.className = 'session-value';
      keyCell.textContent = key;
      valueCell.textContent = value;
      tr.appendChild(keyCell);
      tr.appendChild(valueCell);
      body.appendChild(tr);
    });

    table.appendChild(body);
    container.innerHTML = '';
    container.appendChild(table);
  }

  function recordToRows(record) {
    return record
      .replace(/={2,}/g, '')
      .trim()
      .split('\n')
      .map((line) => {
        const [key, ...rest] = line.split(':');
        return rest.length > 0 ? [key.trim(), rest.join(':').trim()] : null;
      })
      .filter(Boolean);
  }

  function getKeyClass(key) {
    let className = 'session-key';
    if (key === 'Start') className += ' start-key';
    if (key === 'End') className += ' end-key';
    return className;
  }

  function downloadHistory(allHistory, startTime) {
    const blob = new Blob([allHistory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `${formatDate(startTime)}-billable-hour.txt`,
      conflictAction: 'overwrite'
    }, () => {
      URL.revokeObjectURL(url);
    });
  }

  function showOverlay(text, options = {}) {
    elements.overlay.textContent = text;
    elements.overlay.style.fontSize = options.fontSize || '18px';
    elements.overlay.style.fontWeight = options.fontWeight || 'bold';
    elements.overlay.style.opacity = '1';

    setTimeout(() => {
      elements.overlay.style.opacity = '0';
      elements.overlay.style.fontSize = '18px';
      elements.overlay.style.fontWeight = 'bold';
    }, 800);
  }

  function parseHistory(historyText) {
    return historyText
      .split('=====\n')
      .filter((record) => record.trim().length > 0)
      .map((record) => `${record.trim()}\n=====\n`);
  }

  function clampUnitLength(value) {
    let parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) parsed = 1;
    if (parsed > 30) parsed = 30;
    return parsed;
  }

  function formatTimeWithMonthDay(time) {
    return `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;
  }

  function formatDate(time) {
    return `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
  }

  function formatHours(value) {
    return milestoneTools.roundHours(value).toFixed(1);
  }

  window.addEventListener('beforeunload', () => {
    stopTimerInterval();
    if (clockInterval) clearInterval(clockInterval);
  });
})();
