# Raquel Palis — Portfolio Project

## Project Overview
Personal UX/UI portfolio website for job applications. Single-page HTML/CSS/JS, no frameworks.
Target: Senior Product Designer, Lead UX/UI, and AI-focused roles.

## Active Skills

### code-reviewer
Activate when: reviewing any HTML, CSS, or JS changes in this project.
- Run quality checks: `python ~/.claude/skills/code-reviewer/scripts/code_quality_checker.py .`
- Generate review report: `python ~/.claude/skills/code-reviewer/scripts/review_report_generator.py --analyze`
- References: `~/.claude/skills/code-reviewer/references/`

Automatically apply the code review checklist and coding standards when:
- New sections are added to `index.html`
- CSS is modified
- JS interactions are updated
- Accessibility (WCAG) needs to be verified

## Skills Pending Installation (resume after `gh auth login`)
- `browser-use/claude-skill` — for browser-based testing and preview
- `remotion/agent-skills` — for motion/animation work
- `anthropics/claude-code-skill frontend-design` — for frontend design guidance
- `valyuai/skills valyu-best-practices` — for best practices enforcement
- `antigravity-awesome-skills` — advanced agent skills

## Code Conventions
- Single file: `index.html` (all CSS and JS inline)
- No frameworks, no build tools
- Google Fonts: Inter (400, 700, 900)
- Design tokens in `:root` CSS variables
- Comment every section: `/* --- SECTION NAME --- */`

## Design System
- Background: `#0A0A0A`
- Text: `#FFFFFF`
- Muted: `rgba(255,255,255,0.45)`
- Dividers: `rgba(255,255,255,0.12)`
- Hover rows: `rgba(255,255,255,0.03)`
- Font weight headings: 900, ALL CAPS
- Hero size: `clamp(72px, 10vw, 140px)`, line-height 0.9
- Section labels: `• LABEL` — 12px, letter-spacing 0.12em, muted

## Responsive Breakpoints
- Tablet: 768px
- Mobile: 480px (24px padding, single column)
