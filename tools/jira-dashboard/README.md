# Jira Session Sprint Dashboard

Internal dashboard for IT Team Leads to measure session-based sprint system performance.

## Setup

1. `cp config.example.json config.json`
2. Edit `config.json` — set your Jira base URL (e.g. `https://yourorg.atlassian.net`)
3. `npm install`
4. `node server.js`
5. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter your Jira email and API token on first load. Credentials are stored in your browser session only and cleared when the tab closes.
2. After connecting, use the **Projects & Board IDs** section to add your projects. Each project needs its Jira project key and Scrum board ID. Projects are saved in your browser (`localStorage`) and persist across sessions.

## Custom Field Names

The dashboard resolves three Jira custom fields by their exact display names:
- `AI-assisted`
- `Rework required`
- `Session count`

If your fields have different display names, update the `find()` calls in `server.js` (lines near `fieldCache =`).

## Running Tests

```bash
npm test
```

Tests cover `metrics.js` and `traces.js` (pure computation modules).
