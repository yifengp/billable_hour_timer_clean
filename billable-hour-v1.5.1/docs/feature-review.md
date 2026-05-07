# Billable Hour Machine Feature Review

## Current Features

- Opens a floating Chrome extension popup from the toolbar action.
- Tracks a billable work session by configurable billing unit length.
- Saves worklog history to `chrome.storage.local`.
- Prompts for Client / Project ID and Notes at save time.
- Shows the current or last session as a table.
- Shows all saved worklog entries and can clear history after confirmation.
- Downloads a text worklog after each saved session.
- Tracks annual billable-hour milestone progress.

## Notable Risks Addressed

- Pause / resume now excludes paused time from billable unit calculation.
- Save and download now happen after storage has been updated.
- User-provided Client / Notes text is rendered with DOM text nodes instead of raw `innerHTML`.
- Garbled UI text was replaced with ASCII text.
- Remote Google Font usage was removed.

## Remaining Future Improvements

- Migrate worklog storage from text records to a JSON array while preserving legacy text import.
- Persist in-progress timer state so a running session can survive popup closure or browser restart.
- Add CSV export for accounting workflows.
