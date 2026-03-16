# Impact Assessment — PRD-001: Markdown Resume Builder

**Date:** 2026-03-16
**Lead:** Erick Luna
**PRD Type:** New Feature
**PRD File:** docs/prd/PRD-001.md
**Project:** WHIZ

---

## Summary

PRD-001 introduces a client-side web tool for generating professional resumes from a structured form. It is a self-contained, static HTML/CSS/JS application with no backend dependencies. Impact is low-risk and isolated — no existing modules are affected. This is a greenfield build within the WHIZ project.

## Affected Modules

| Module | Owner | Impact Level | Action Required |
|--------|-------|--------------|-----------------|
| (New) resume-builder/ | Frontend | High | New module — create from scratch |
| WHIZ project root | Lead | Low | Add entry point / navigation link if applicable |

> Since this is a greenfield feature with no backend, no existing modules are modified. All work is net-new.

## Context MDs to Update

| File | Last Verified Sprint | Required Update |
|------|---------------------|-----------------|
| (None exist) | — | Create `resume-builder.context.md` after build |

> ⚠️ No context MDs currently exist for the WHIZ project. Recommend creating a base ARCHITECTURE.md and module-level context MDs as part of this sprint.

## Skills to Rebuild

- No existing Skills are affected (greenfield feature)
- **New Skill recommended:** `resume-builder` context Skill after v1 ships — captures template structure, form fields, and print CSS patterns for future maintenance

## Estimated Jira Cards

| Role | Estimated Cards | Sizes |
|------|----------------|-------|
| Frontend | 4 | S, S, M, XS |
| QA | 2 | S, S |
| DevOps | 1 | XS |

**Total: 7 cards**

### Card Breakdown

| # | Title | Role | Size | Description |
|---|-------|------|------|-------------|
| 1 | [FE] Resume form — input fields and validation | Frontend | M | Build the structured form with dynamic add/remove for experience and education. Required field validation. Responsive layout. |
| 2 | [FE] Resume template — HTML/CSS layout | Frontend | S | Single professional template with clean typography, proper spacing, section hierarchy. Must look polished in browser. |
| 3 | [FE] PDF export — print CSS and download | Frontend | S | Implement `@media print` styles, `window.print()` trigger, page break handling with `break-inside: avoid`. Test cross-browser. |
| 4 | [FE] Live preview — real-time form-to-template binding | Frontend | XS | Wire form inputs to template preview. Update preview as user types. |
| 5 | [QA] Form validation and edge cases | QA | S | Test required field validation, empty states, very long content, special characters, multiple experience/education entries. |
| 6 | [QA] PDF output — cross-browser testing | QA | S | Verify PDF matches HTML preview in Chrome, Firefox, Safari. Check page breaks, margins, font rendering. |
| 7 | [DevOps] Hosting and deployment | DevOps | XS | Deploy static files to hosting environment. Confirm accessible on internal network. |

> Cards are XS, S, or M only. No L/XL cards needed — scope is well-contained.

## Dependency & Cross-Project Risks

| Risk | Severity | Affected Projects | Notes |
|------|----------|------------------|-------|
| No cross-project dependencies | Low | WHIZ only | Self-contained static app, no shared modules |
| Browser print CSS inconsistency | Medium | WHIZ | Chrome is baseline; Firefox/Safari may render differently. QA card covers this. |
| No ARCHITECTURE.md exists | Low | WHIZ | Recommend creating one this sprint to support future assessments |

## Open Questions

- [ ] Should resume data persist in localStorage for returning users? (Deferred to v2 if yes)
- [ ] Is there a preferred MMI brand color/font for the template? (Blocks card #2 — template design)
- [ ] Where will this be hosted — standalone URL, or embedded within an existing WHIZ app? (Blocks card #7 — DevOps)
