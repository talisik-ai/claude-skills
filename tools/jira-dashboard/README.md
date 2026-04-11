# Jira Session Sprint Dashboard

Internal dashboard for IT Team Leads to measure session-based sprint system performance.

## Setup

1. `cp config.example.json config.json`
2. Edit `config.json` — add your Jira base URL and board IDs for each project
3. `npm install`
4. `node server.js`
5. Open [http://localhost:3000](http://localhost:3000)

## Usage

Enter your Jira email and API token on first load. Credentials are stored in your browser session only and cleared when the tab closes.

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
