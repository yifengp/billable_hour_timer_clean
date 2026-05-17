# UI Content Architecture

## Principle

The main screen should answer the user's immediate work questions first: whether the timer is active, how much pace is needed, what this week expects, and how the current quarter is doing. Low-frequency setup and explanatory details belong in the top-right details menu.

## Main Screen

- Keep title, date, time, status, main timer image button, and pause/resume visible.
- Show the key annual guidance directly under the timer controls: long-term daily base.
- Keep the weekday planning row visible because it affects near-term work behavior.
- Show only the current quarter summary on the main page.
- Keep Last Session, worklog history, clear history, and footer in their existing lower-page positions.

## Details Menu

- Use the top-right menu button as the entry for low-frequency information.
- Keep unit length at the top of the menu as a setup-level timer preference.
- Keep annual setup inputs in the menu: target annual hours, current completed hours, and allocation controls.
- Open the menu automatically when required annual setup values are empty.
- Open the menu automatically after a stored goal year falls behind the current year so the user can review the annual target.
- Keep secondary milestone details in the menu: total progress, annual remaining, remaining workdays, week planned, and the feedback message.
- Keep the full Q1-Q4 quarter list in the menu, with the current quarter still highlighted.

## Calculation Defaults

- Treat January 1 of the current year as the annual baseline.
- Calculate remaining workdays from today through the end of the year.
- Use current completed hours plus allocation mode to describe historical work already completed before the app tracked it.
- Lock unit length while a session is running, paused, or waiting to be saved.

## Later Design Work

This architecture intentionally avoids final visual-theme decisions. Theme exploration can later change colors, typography, surfaces, and icon treatment while preserving this content hierarchy.
