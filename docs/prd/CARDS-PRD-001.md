# Cards for PRD-001: Markdown Resume Builder

**Project:** WHIZ
**Generated:** 2026-03-16
**Source:** docs/prd/IMPACT-ASSESSMENT-PRD-001.md

## Summary

| # | Card Title | Role | Size | Depends On |
|---|-----------|------|------|------------|
| 1 | [FE] Resume form — input fields and validation | Frontend | M | — |
| 2 | [FE] Resume template — HTML/CSS layout | Frontend | S | — |
| 3 | [FE] Live preview — real-time form-to-template binding | Frontend | XS | #1, #2 |
| 4 | [FE] PDF export — print CSS and download | Frontend | S | #2 |
| 5 | [QA] Form validation and edge cases | QA | S | #1, #3 |
| 6 | [QA] PDF output — cross-browser testing | QA | S | #4 |
| 7 | [DevOps] Hosting and deployment | DevOps | XS | #4 |

**Totals:** 7 cards (4 FE, 2 QA, 1 DevOps) | 1 M, 4 S, 2 XS

---

## Card Details

### Card 1: [PRD-001] [FE] Resume form — input fields and validation

**Type:** Task
**Size:** M
**Labels:** `ai-assisted`, `PRD-001`

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Build the structured resume input form with dynamic sections and validation.

**Scope:**
- `resume-builder/index.html` — form markup
- `resume-builder/form.js` — form logic, dynamic add/remove, validation

**Do Not Touch:**
- Template/preview code (Card #2)
- PDF export logic (Card #4)

**Acceptance Criteria:**
- [ ] Form includes fields: name, title, email, phone, summary, experience (multiple), education (multiple), skills
- [ ] User can add/remove multiple experience entries (company, role, dates, description)
- [ ] User can add/remove multiple education entries (institution, degree, year)
- [ ] Required fields validated: name, title, at least one experience entry
- [ ] Validation errors shown inline with clear messages
- [ ] Form is responsive on desktop (min 1024px)

**Context:** No existing context MD — greenfield build

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

### Card 2: [PRD-001] [FE] Resume template — HTML/CSS layout

**Type:** Task
**Size:** S
**Labels:** `ai-assisted`, `PRD-001`

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Create the single professional resume template in HTML/CSS.

**Scope:**
- `resume-builder/template.html` or template section in `index.html`
- `resume-builder/styles.css` — resume layout styles

**Do Not Touch:**
- Form logic (Card #1)
- Print/PDF styles (Card #4)

**Acceptance Criteria:**
- [ ] Clean, professional layout with proper typography hierarchy
- [ ] Sections: header (name, title, contact), summary, experience, education, skills
- [ ] Proper spacing and visual rhythm between sections
- [ ] Looks polished in Chrome, Firefox, Safari

**Context:** No existing context MD — greenfield build

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

### Card 3: [PRD-001] [FE] Live preview — real-time form-to-template binding

**Type:** Task
**Size:** XS
**Labels:** `ai-assisted`, `PRD-001`
**Blocked by:** Card #1, Card #2

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Wire form inputs to the template preview so it updates in real-time as the user types.

**Scope:**
- `resume-builder/preview.js` — binding logic between form and template

**Do Not Touch:**
- Form validation logic (Card #1)
- Template CSS (Card #2)

**Acceptance Criteria:**
- [ ] Preview updates as user types in any form field
- [ ] Dynamic entries (experience, education) reflect in preview immediately when added/removed
- [ ] Preview shows placeholder text for empty optional fields
- [ ] No visible lag or flicker during updates

**Context:** No existing context MD — greenfield build

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

### Card 4: [PRD-001] [FE] PDF export — print CSS and download

**Type:** Task
**Size:** S
**Labels:** `ai-assisted`, `PRD-001`
**Blocked by:** Card #2

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Implement PDF download via browser print with dedicated print CSS.

**Scope:**
- `resume-builder/print.css` — @media print styles
- `resume-builder/export.js` — window.print() trigger and download UX

**Do Not Touch:**
- Screen display CSS (Card #2)
- Form logic (Card #1)

**Acceptance Criteria:**
- [ ] "Download PDF" button triggers `window.print()` with print-optimized styles
- [ ] `@media print` hides form, navigation, and non-resume elements
- [ ] `break-inside: avoid` prevents sections from splitting across pages
- [ ] PDF output matches HTML preview layout
- [ ] Works in Chrome (baseline), Firefox, and Safari

**Context:** No existing context MD — greenfield build

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

### Card 5: [PRD-001] [QA] Form validation and edge cases

**Type:** Task
**Size:** S
**Labels:** `ai-assisted`, `PRD-001`
**Blocked by:** Card #1, Card #3

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Test form validation, edge cases, and data handling.

**Scope:**
- All form-related functionality from Cards #1 and #3

**Do Not Touch:**
- No code changes — testing only

**Acceptance Criteria:**
- [ ] Required field validation triggers on empty submit
- [ ] Very long text (500+ chars in summary) doesn't break layout
- [ ] Special characters (&, <, >, quotes) render correctly in preview
- [ ] Adding 10+ experience entries doesn't break form or preview
- [ ] Empty optional fields don't show blank sections in preview
- [ ] Form works on Chrome, Firefox, Safari (desktop)

**Context:** No existing context MD

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

### Card 6: [PRD-001] [QA] PDF output — cross-browser testing

**Type:** Task
**Size:** S
**Labels:** `ai-assisted`, `PRD-001`
**Blocked by:** Card #4

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Verify PDF output quality and consistency across browsers.

**Scope:**
- PDF export functionality from Card #4

**Do Not Touch:**
- No code changes — testing only

**Acceptance Criteria:**
- [ ] PDF matches HTML preview in Chrome
- [ ] PDF matches HTML preview in Firefox (acceptable minor differences)
- [ ] PDF matches HTML preview in Safari (acceptable minor differences)
- [ ] Page breaks don't cut through section content
- [ ] Fonts render correctly in PDF
- [ ] Multi-page resumes (long experience list) paginate cleanly
- [ ] Margins are consistent across browsers

**Context:** No existing context MD

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

### Card 7: [PRD-001] [DevOps] Hosting and deployment

**Type:** Task
**Size:** XS
**Labels:** `ai-assisted`, `PRD-001`
**Blocked by:** Card #4

#### Description

**PRD Reference:** docs/prd/PRD-001.md
**Task:** Deploy the static resume builder to the team's hosting environment.

**Scope:**
- `resume-builder/` directory — static files deployment
- Hosting configuration (server, CDN, or internal URL)

**Do Not Touch:**
- Application code (Cards #1–4)

**Acceptance Criteria:**
- [ ] Static files deployed and accessible on internal network
- [ ] URL confirmed and shared with team
- [ ] HTTPS enabled if externally accessible

**Context:** No existing context MD

#### Measurement
- **AI-assisted:** Y
- **Rework required:** _(fill on card close)_
- **Session count:** _(fill on card close)_

---

## Dependency Chain

```
Card #1 (Form) ──────┐
                      ├──→ Card #3 (Preview) ──→ Card #5 (QA: Form)
Card #2 (Template) ──┤
                      ├──→ Card #4 (PDF) ──────→ Card #6 (QA: PDF)
                      │                   └────→ Card #7 (DevOps)
```

**Recommended sprint order:**
1. Cards #1 and #2 can start in parallel (no dependencies)
2. Cards #3 and #4 follow once #1 and #2 are done
3. Cards #5, #6, #7 are the final wave

## Notes for Lead

- All cards are M or smaller — no splits needed
- **Open question:** MMI brand colors/fonts need to be decided before Card #2 starts
- **Open question:** Hosting target needs to be confirmed before Card #7 starts
- Recommend creating `resume-builder.context.md` after v1 ships
