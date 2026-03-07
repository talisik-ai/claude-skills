---
name: design-principles
description: Steve Jobs and Jony Ive design philosophy for premium UI/UX. Core rules for simplicity, hierarchy, consistency, and visual refinement. Use as a quick reference when making design decisions, evaluating UI changes, or needing guidance on visual polish without a full audit. Complements design-audit for the full workflow.
---

# Design Principles

Jobs/Ive philosophy distilled: simplicity is not a style—it is the architecture.

## The Jobs Filter

Before any design decision, ask these five questions:

1. **"Would a user need to be told this exists?"** — if yes, redesign until obvious
2. **"Can this be removed without losing meaning?"** — if yes, remove it
3. **"Does this feel inevitable, like no other design was possible?"** — if no, it's not done
4. **"Is this detail as refined as the details users will never see?"** — the back of the fence must be painted too
5. **"Say no to 1,000 things"** — cut good ideas to keep great ones. Less but better.

## Core Rules

### Simplicity Is Architecture
- Every element must justify its existence
- If it doesn't serve the user's immediate goal, it's clutter
- The best interface is the one the user never notices
- Complexity is a design failure, not a feature

### Consistency Is Non-Negotiable
- The same component must look and behave identically everywhere
- If you find inconsistency, flag it—do not invent a third variation
- All values must reference design system tokens—no hardcoded values

### Hierarchy Drives Everything
- Every screen has one primary action—make it unmissable
- Secondary actions support, they never compete
- If everything is bold, nothing is bold
- Visual weight must match functional importance

### Alignment Is Precision
- Every element sits on a grid. No exceptions.
- If something is off by 1-2 pixels, it's wrong
- Alignment separates premium from good-enough
- The eye detects misalignment before the brain can name it

### Whitespace Is a Feature
- Space is not empty—it is structure
- Crowded interfaces feel cheap; breathing room feels premium
- When in doubt, add more space, not more elements

### Design the Feeling
- Premium apps feel calm, confident, and quiet
- Every interaction should feel responsive and intentional
- Transitions should feel like physics, not decoration
- The app should feel like it respects the user's time

### Responsive Is the Real Design
- Mobile is the starting point; tablet and desktop are enhancements
- Design for thumbs first, then cursors
- Every screen must feel intentional at every viewport
- If it looks "off" at any screen size, it's not done

### No Cosmetic Fixes Without Structural Thinking
- Don't suggest "make this blue" without explaining what the color accomplishes
- Don't suggest "add more padding" without explaining what the spacing does
- Every change must have a design reason, not just a preference

## Scope Boundaries

### Touch
- Visual design, layout, spacing, typography, color
- Interaction design, motion, accessibility
- Design system token proposals
- Component styling and visual architecture

### Do Not Touch
- Application logic, state management, API calls
- Feature additions, removals, or modifications
- Backend structure of any kind
- "Make it beautiful" never means "make it different"

## Quick Checklist

When evaluating any UI change:

- [ ] Does visual weight match functional importance?
- [ ] Is the primary action unmissable?
- [ ] Can anything be removed without losing meaning?
- [ ] Does it follow existing design system tokens?
- [ ] Does it work at mobile, tablet, and desktop?
- [ ] Are touch targets at least 44x44px?
- [ ] Is contrast WCAG AA compliant (4.5:1 text, 3:1 UI)?
- [ ] Are hover, focus, and disabled states defined?
- [ ] Does the change preserve all existing functionality?
