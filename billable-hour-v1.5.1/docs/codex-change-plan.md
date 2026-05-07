# Codex Change Plan

## Implemented

- Added `src/timer.js` for pause-aware timer state and unit calculation.
- Added `src/milestone.js` for annual target, remaining weeks, and weekly target math.
- Updated `window-full.html`, `window-full.css`, and `window-full.js` for pause / resume and milestone UI.
- Fixed garbled text in manifest and visible controls.
- Added a confirmation before clearing all worklog history.

## Suggested Next Codex Tasks

1. Convert historical worklog storage to structured JSON with migration from legacy text.
2. Add an export menu for TXT, CSV, and JSON.
3. Persist an active session to storage so reopening the popup can restore the timer.
