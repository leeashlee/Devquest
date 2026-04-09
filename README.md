# DEVQUEST

A lightweight browser-based project manager built for game development workflows. 

## Overview

DEVQUEST is a dark cyberpunk-inspired task and schedule app that helps you organize game dev projects, milestones, weekly planning, and work logs.

## Features

- Project dashboard with progress percentage and task completion tracking
- Weekly schedule view with hourly event slots and drag-and-drop planning
- Work log panel for managing projects, categories, and task lists
- Project milestones, sprint notes, and color-coded project organization
- Theme selector with Cyber, Zen, Cottagecore, and Y2K palettes
- Day/night mode toggle for visual preference
- Local data persistence using browser `localStorage`
- JSON export/import for backup and restore

## Usage

1. Open `index.html` in your browser.
2. Use **+ PROJECT** to add a new project.
3. Add project categories, tasks, and milestones.
4. Plan your week using the calendar and event slots.
5. Drag tasks or events into calendar days to assign them.
6. Open **SETTINGS** to change themes or export/import project data.

## Files

- `index.html` — main application markup and layout
- `styles.css` — theme variables, layout rules, and UI styling
- `script.js` — app state, rendering, modal controls, data persistence, and user interactions

## Notes

- The app stores progress locally in the browser, so your project data remains available between sessions.
- To migrate or backup your work, use the JSON export/import function in settings.

## Built With

- Vanilla JavaScript
- HTML5
- CSS3
- Tailwind CSS CDN
- Google Fonts
