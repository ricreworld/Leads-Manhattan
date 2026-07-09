# Reworld Market Watch — DESIGN.md

Single source of truth for the tool's visual system. Merged from the Reworld brand kit
(color palettes extracted from reworldwaste.com) and four style references:
**Hellotime** (monochrome editorial command center), **Workflow** (editorial manuscript),
**Mode** (sunlit greenhouse editorial), and **Relate** (cool dawn product canvas).

**Merge rule (fixed):** the **brand kit wins on colors and fonts**; the **references win
on layout and feel**. Where the references disagree with each other, the choice and its
reasoning go in the Decision Log at the bottom of this file. Every future design choice
gets a log entry too — no silent changes.

**The synthesized feel:** an editorial command center. Flat, shadowless surfaces;
hairline borders; typographic weight doing the hierarchy work; one brand-blue accent
used as punctuation, never decoration; dense, scannable lead cards on a calm neutral
canvas. A printed morning briefing, not a SaaS dashboard.

---

## 1. Colors

All hues come from the brand palettes. Role assignments follow the references'
one-accent, near-monochrome discipline.

### Core neutrals (light theme)

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas | `#EDEEEE` | `--canvas` | Page background — the brand light gray, replaces sterile white (Mode pattern) |
| Card | `#FFFFFF` | `--card` | Lead cards, facility cards, panels — lifts off canvas without shadow |
| Wash | `#F6F7F7` | `--wash` | Hover fills, input backgrounds, quiet section tints (derived from Canvas) |
| Ink | `#27292A` | `--ink` | Primary text, icon strokes — the brand near-black |
| Ink Soft | `#62737F` | `--ink-soft` | Secondary/muted text, metadata, timestamps — the brand slate |
| Hairline | `#D9DBDC` | `--hairline` | Card borders, dividers, tab bar rule (derived between Canvas and Ink Soft) |
| Charcoal | `#27292A` | `--charcoal` | The only dark surface: primary action fill and inverted blocks |

### Brand accent

| Name | Value | Token | Role |
|------|-------|-------|------|
| Reworld Blue | `#2527DA` | `--accent` | THE accent: links, active tab underline, focus rings, source-record links, "view the government record ↗", key stat highlights. Used as punctuation — never as a button fill, card background, or large surface (Hellotime discipline) |
| Blue Deep | `#1F597E` | `--accent-deep` | Secondary blue for charts/routing distance emphasis where `--accent` would be too loud |

### Semantic / status colors (extended brand palette)

| Name | Value | Token | Role |
|------|-------|-------|------|
| Hot | `#B26A4B` | `--hot` | HOT score badge, the orange left-border on "physical product needs destruction now" cards, overdue-adjacent warmth |
| Warm | `#AB921C` | `--warm` | WARM score badge, "held" status tint |
| Cool | `#6FABBD` | `--cool` | COOL score badge, informational chips, watchlist "rescannable" tag |
| Alarm | `#992920` | `--alarm` | Overdue follow-ups ("this lead is cooling"), failed scan lines, Dead status |
| Live | `#3DD4C5` | `--live` | Scan-success ticks, "fresh in last 24h" dot, Qualified status accent |

Rules:
- One saturated accent moment per component. A card may show a hot border **or** a blue
  link emphasis as its loudest element — the rest stays neutral (all four references).
- Status colors appear as **dots, left borders, badge tints, and text** — never as full
  card fills or large washes (Relate status-dot pattern).
- Body text is always Ink on Canvas/Card — status never colors sentences.

### Dark theme (derived — see D-010)

| Token | Light | Dark |
|-------|-------|------|
| `--canvas` | `#EDEEEE` | `#1B1D1E` |
| `--card` | `#FFFFFF` | `#242627` |
| `--wash` | `#F6F7F7` | `#2B2D2F` |
| `--ink` | `#27292A` | `#EDEEEE` |
| `--ink-soft` | `#62737F` | `#9AA6AD` |
| `--hairline` | `#D9DBDC` | `#3A3D3F` |
| `--charcoal` (primary btn) | `#27292A` fill, `#FFFFFF` text | `#EDEEEE` fill, `#1B1D1E` text |
| `--accent` | `#2527DA` | `#6C6CE5` (brand palette periwinkle — `#2527DA` fails contrast on dark) |
| `--hot` / `--warm` / `--cool` / `--alarm` / `--live` | as above | same hues, +10–15% lightness where contrast requires |

---

## 2. Typography

**Open item (D-002):** the brand kit contained no typography and reworldwaste.com is
unreachable from this environment. Until the official brand font is supplied, the system
uses the references' consensus pair below. Swapping the brand font in later only changes
`--font-sans` — the scale holds.

| Token | Family | Role |
|-------|--------|------|
| `--font-sans` | `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Everything: headlines, body, UI, buttons. Hierarchy comes from weight and size, not from a second family (Hellotime/Relate grotesque-only discipline — see D-006) |
| `--font-mono` | `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace` | Data voice: timestamps, scan status lines, score numbers, distances, facility specs (TPD/MW), source citations. The command-center texture (Relate's mono-for-numbers pattern; continuity with the old tool) |

### Type scale (app-calibrated — see D-009)

References run display type at 56–96px; this is a working tool, not a landing page.
The editorial size-contrast survives at app scale:

| Role | Size / line-height | Weight | Tracking | Use |
|------|--------------------|--------|----------|-----|
| display | 34px / 1.1 | 700 | -0.8px | Territory H1 (one per tab) |
| heading | 22px / 1.2 | 650 | -0.3px | Section H2s ("Today's hottest leads…") |
| heading-sm | 17px / 1.3 | 600 | — | Card titles, facility names |
| body | 15px / 1.5 | 400 | — | Copy blocks, card descriptions, notes |
| caption | 13px / 1.45 | 400–500 | — | Metadata, source lines, helper text (Ink Soft) |
| micro | 11px / 1.4 | 500 | +0.4px, uppercase | Eyebrow labels, badge text, status toggles (Mode eyebrow pattern) |
| mono-data | 12–13px / 1.4 | 400–500 | — | Scan bar, timestamps, routing distance |

Rules:
- Weight 700 appears only on `display` and score badges. Body never exceeds 500.
- Opening lines under each H1 set at body 15px/400 in Ink Soft, max-width 68ch —
  the "subtext in Smoke" pattern from Hellotime.
- Never center body text; center nothing except empty-state blocks.

---

## 3. Spacing & shape

**Base unit: 8px** (Hellotime). Two densities on one page (see D-009):
- **Page rhythm — comfortable:** 48–64px between sections, 24px section-title-to-content.
- **Card internals — compact:** 16px card padding, 8–12px between rows inside a card,
  10px gaps in card grids. A morning feed must fit many leads above the fold (Relate).

| Token | Value |
|-------|-------|
| `--space-1…-8` | 4, 8, 12, 16, 24, 32, 48, 64px |
| `--page-max` | 1200px, centered, single column, no sidebars |
| `--card-pad` | 16px (lead cards) / 24px (reference & routing cards) |

### Radii (one system — see D-008)

| Element | Radius |
|---------|--------|
| Badges, score chips, status toggles | 4px |
| Buttons, inputs, routing box, callouts | 8px |
| Cards, panels, proof bar | 12px |
| Pills (filter chips, watchlist tags) | 9999px |

### Elevation: none

Shadowless by design. Hellotime and Mode are strictly flat; Workflow's shadows barely
register (rgba ≤0.06); Relate is the only reference that leans on soft shadow stacks —
the flat camp wins (see D-007). Separation = 1px Hairline borders + Card-on-Canvas
surface contrast. The only "elevation" cue is the Charcoal filled button inverting the
page's lightness. No box-shadows, no glows — and no gradients: Hellotime's electric-blue
gradient highlight is deliberately not carried over (see D-014); the brand blue always
appears flat.

---

## 4. Components

### Tab bar (territory nav)
Sticky top bar on Canvas, 1px Hairline bottom border. Wordmark left: "Reworld Market
Watch" 17px/600 Ink, with "Market Watch" in `--accent`. Five tabs center-left: micro-caps
13px/500, Ink Soft at rest, Ink + 2px `--accent` underline when active (Workflow tab
pattern). Right: last-scan stamp in mono 12px Ink Soft + theme toggle (ghost button).

### Proof bar
Directly under the header: full-width strip on Wash, 12px radius, 12px×16px padding.
The COPY.md proof line set in mono 12px/500 Ink, stats (`>1,100°C`, `99%+`, `17M`)
emphasized in `--accent-deep`. One line, wraps gracefully.

### Lead card (the workhorse)
Card surface, 1px Hairline border, 12px radius, 16px padding, shadowless. 10px vertical
gap between cards. Hot-physical-product cards get a 3px `--hot` left border.

Anatomy, top to bottom:
1. **Header row:** score badge + company name (17px/600) + freshness dot (`--live` if <24h)
   + date in mono 12px Ink Soft, right-aligned.
2. **Score badge:** 4px radius chip, micro-caps + mono number — `HOT 85` = `--hot` tint
   (12% opacity fill, full-strength text), `WARM 62` = `--warm`, `COOL 34` = `--cool`.
   Tooltip carries the COPY.md scoring text.
3. **Body:** description at body 15px, location + source line at caption 13px Ink Soft;
   "view the government record ↗" is an `--accent` link — the card's one blue moment.
4. **Routing box:** inset panel on Wash, 8px radius, 12px padding, 1px Hairline border.
   Micro-caps eyebrow `ROUTES TO`, then facility + distance in mono 13px/500 Ink
   (`Hempstead — 12 mi`), fit note in caption Ink Soft. No-fit variant swaps eyebrow
   color to `--warm` ("No direct fit — partner network. Note the reason and hold.").
5. **Action row:** **📞 Call now** = the single filled Charcoal button (white text,
   13px/600, 8px radius, 8×16px padding — Hellotime primary CTA). Google · Email ·
   LinkedIn · Map it = ghost buttons (transparent, 1px Hairline border, Ink text).
   One filled button per card, ever.
6. **Rep strip:** status toggles (New/Called/Qualified/Held/Dead) as 4px-radius
   micro-caps chips — active chip fills Charcoal with Card text, except Qualified
   (`--live` tint) and Dead (`--alarm` tint). Follow-up date in mono; overdue state
   renders in `--alarm` 500 with the COPY.md "cooling" line. Notes = borderless
   textarea on Wash with the COPY.md placeholder.

### Watchlist card
Same body as the lead card (notes/pins/status carry over). Section header adds the
subtitle convention in caption Ink Soft italic: "no feed — work steadily" or a
`--cool`-tinted pill "rescannable".

### Scan status bar
Mono 12px strip on Wash at the top of each feed: `FDA 07:41 ✓` with ✓ in `--live`;
failed source renders source name + "Retry" link in `--alarm`. "Refresh now" is an
`--accent` text link. This bar is the tool's heartbeat — always visible, never loud.

### Qualification strip
Bottom of every feed: Wash panel, 12px radius, 24px padding, 3px `--accent-deep` left
border. COPY.md text verbatim; the three rules as a numbered list, body 15px; the
PFAS exception line at 500 weight.

### Callout box (NJ routing-first note, CT in-state advantage)
Card surface, 1px Hairline border, 8px radius, 16px padding, micro-caps eyebrow in
`--accent`. Sits directly under the feed H2. Quiet — no fill color.

### Facility routing card (reference section)
Card, 24px padding. Facility name heading-sm + address in caption; specs line
(TPD · MW · hours) in mono 13px; acceptance list as body text with hard-no items at
500 weight in `--alarm`; staff names in caption Ink Soft. The Union TTF DEA ⚠ note
renders as a `--warm`-tinted inline block, wording verbatim from COPY.md.

### Empty state
Centered block, 48px vertical padding: heading-sm "Nothing new in the last scan." +
COPY.md body text in Ink Soft, max-width 52ch. No illustration, no color — calm.

### Buttons (summary)
| Kind | Spec |
|------|------|
| Primary (Call now, Refresh) | Charcoal fill, Card text, 13px/600, 8px radius, 8×16px pad. Hover: pure `#151619`-equivalent darkening |
| Ghost | Transparent, 1px Hairline border, Ink text 13px/500. Hover: Wash fill |
| Text link | `--accent`, no underline at rest, underline on hover |
| Pill filter | 9999px radius, micro-caps; active = Charcoal fill (stream filter bar) |

### Inputs
Wash background, 1px Hairline border, 8px radius, 10px×12px padding, body 15px.
Focus: 1.5px `--accent` border (no glow ring — shadowless system).

---

## 5. Do's and Don'ts

### Do
- Keep `#2527DA` to punctuation: links, active-tab underline, focus, one emphasis per view.
- Let weight and size carry hierarchy; reach for color last.
- Use mono for anything a rep will scan as data: times, distances, scores, specs.
- Keep every surface flat: Hairline borders and Card-on-Canvas contrast only.
- Hold the two-density rhythm: airy between sections, dense inside cards.
- Keep the one-filled-button rule: Call now is the only filled action in any component.
- Render both themes from the same tokens; test every status color on both canvases.

### Don't
- Don't fill buttons, cards, or large surfaces with brand blue — ever (D-004).
- Don't add box-shadows, glows, or gradients (D-007).
- Don't introduce hues outside the brand palettes in §1.
- Don't use serif or display faces (D-006) or Inter weights above 700.
- Don't color body sentences for status — dots, borders, badges, and single words only.
- Don't use radii outside 4/8/12/9999 (D-008).
- Don't center body text; don't let marketing-scale type (>40px) into the tool.

---

## 6. Decision Log

Every design decision gets a row — including reversals. Newest at the bottom.
Status: ✅ decided · 🔶 open · ↩️ reversed (link the superseding row).

| ID | Date | Decision | Rationale | Status |
|----|------|----------|-----------|--------|
| D-001 | 2026-07-09 | Merge rule: brand kit wins colors + fonts; references win layout + feel | Set by Ricardo in the merge request | ✅ |
| D-002 | 2026-07-09 | Interim typography = Inter + IBM Plex Mono; brand font unknown | Brand kit images carry colors only; reworldwaste.com blocked (403) from the build environment. Inter is primary or named substitute in all four references; Plex Mono continues the old tool's data voice. **Swap `--font-sans` when the official brand font arrives** | 🔶 |
| D-003 | 2026-07-09 | Neutrals from the Color Thief palette: `#EDEEEE` canvas, `#27292A` ink, `#62737F` muted | Direct brand values; Mode's warm-canvas-not-white pattern justifies `#EDEEEE` as page background with white cards above it | ✅ |
| D-004 | 2026-07-09 | `#2527DA` is the single accent, used as punctuation only; primary buttons are filled Charcoal, never blue | Brand supplies the hue; Hellotime supplies the discipline ("never a button fill, never a large surface"). Keeps Call now visually calm and the blue meaningful | ✅ |
| D-005 | 2026-07-09 | Status ramp from the extended Colorcube palette: hot `#B26A4B`, warm `#AB921C`, cool `#6FABBD`, alarm `#992920`, live `#3DD4C5` | The tool needs HOT/WARM/COOL scores, overdue, and scan-health states; all five hues exist in the brand extraction, so no foreign colors enter the system | ✅ |
| D-006 | 2026-07-09 | Grotesque-only; no serif headlines | References split 2–2 (Workflow/Mode serif vs Hellotime/Relate sans). Brand kit shows no serif, and a data-dense daily tool favors the command-center voice over the manuscript voice | ✅ |
| D-007 | 2026-07-09 | Shadowless, flat elevation: hairline borders + surface contrast | References split: Hellotime + Mode strictly flat, Workflow near-zero (≤0.06 alpha), Relate uses soft shadow stacks. Flat wins — it matches the editorial command-center voice, and a dense lead feed reads cleaner with borders than with forty overlapping shadows | ✅ |
| D-008 | 2026-07-09 | Radii system 4 / 8 / 12 / 9999px | References conflict (Hellotime 16, Workflow 12, Mode 16/4, Relate pills). 12px cards reads editorial without going marketing-soft; 4/8 for controls follows Workflow/Mode | ✅ |
| D-009 | 2026-07-09 | 8px base unit; two-density layout (comfortable sections, compact cards); type capped at 34px display | Marketing references run 56–96px display and airy density; a prospecting feed must surface many leads per screen (Relate's compact density) while keeping editorial section rhythm | ✅ |
| D-010 | 2026-07-09 | Dark theme derived from the same tokens; accent swaps to `#6C6CE5` in dark | All references are light-only, but the tool ships light/dark (carried over from old version). `#2527DA` fails contrast on dark canvases; `#6C6CE5` comes from the brand's Colorcube extraction | ✅ |
| D-011 | 2026-07-09 | 1200px max-width, centered single column, no sidebars or overlaps | Hellotime/Relate layout; matches the tab-panel SPA structure from COPY.md | ✅ |
| D-012 | 2026-07-09 | "Physical product needs destruction now" cards get a 3px `--hot` left border | COPY.md requires an orange marker; terracotta `#B26A4B` is the brand palette's orange, applied as a border per the no-color-flood rule | ✅ |
| D-013 | 2026-07-09 | Emoji glyph 📞 kept on Call now buttons | COPY.md specifies "📞 Call now" verbatim; copy wins over icon-system purity | ✅ |
| D-014 | 2026-07-09 | No gradients anywhere — Hellotime's electric-blue gradient keyword highlight is not carried over | The brand kit supplies flat hexes only; Relate's own rule caps gradients at two stops and the other references have none. Brand blue as flat punctuation is more durable than a marketing-page gradient trick inside a daily working tool | ✅ |
| D-015 | 2026-07-09 | This file adopted into the repo as the single source of truth; D-007 rationale corrected (references were not unanimous on shadows) and the gradient omission made explicit as D-014 | Merged draft verified against the three brand palette images (Color Thief, Colorcube, Vibrant.js) — every hue in §1 traces to a brand extraction. Corrections logged rather than silently edited, per the no-silent-changes rule | ✅ |
| D-016 | 2026-07-09 | No webfont fetch: `--font-sans`/`--font-mono` keep Inter and IBM Plex Mono first in the stack but load nothing external; system fallbacks render otherwise | Build requirement is a fully self-contained static page (GitHub Pages, zero external dependencies). Google Fonts would be a network dependency; the D-002 swap plan is unaffected — the token still changes in one place when the brand font arrives | ✅ |
| D-017 | 2026-07-09 | Map view dropped from this build; every card keeps its "Map it" Google Maps link | The old tool's map used Leaflet from a CDN, which breaks the no-external-dependency rule, and COPY.md's confirmed site structure has no map section. Revisit as a dependency-free inline SVG if the map earns its way back | 🔶 |
| D-018 | 2026-07-09 | `noindex, nofollow` robots meta retained from the old tool | Internal sales tool carrying facility staff names in the routing reference; the search-phrase copy still serves reps' in-page search. Flip only with an explicit decision to publish | ✅ |
| D-019 | 2026-07-09 | Environmental bids sections render from an overnight `leads.json` only; the scan bar lists bids as "overnight scan", never a live fetch | COPY.md states it verbatim: "Populates from the overnight scan — no live browser feed for this one." The old tool's live bid-board scrapes were CORS-fragile anyway | ✅ |
| D-020 | 2026-07-09 | No estimated deal value shown on live-feed cards, and no $-value filter | The public feeds (FDA, Socrata, ArcGIS, ECHO) carry no dollar data; inventing an estimate would violate the facts-from-CONTEXT rule. The $10K rule lives in the qualification strip; revisit when a real value model exists | 🔶 |
| D-021 | 2026-07-09 | Signal-watch sections double as filtered views of the live feed (recalls in the recall section, PFAS-tagged hits in the PFAS watch, registry hits in the state-DB watch), with curated watchlist cards beneath | Keeps COPY.md's section structure while making every live card appear in a workable context — the old tool's per-section scan results, restructured under the new spine | ✅ |
| D-022 | 2026-07-09 | Pin affordance carried over from the old tool: a ghost 📌 toggle in the rep strip; pinned cards sort first in their section, marker rendered in Ink | Reps relied on pins in the old tool; DESIGN had no pin spec. Ink marker + ghost chip respects the one-accent and no-color-flood rules | ✅ |
| D-023 | 2026-07-09 | Hempstead routing-box fit note reads "no steel drums" — deviating from COPY.md's illustrative example line "Hempstead — … drums OK" | CONTEXT_1.md (fact authority) lists steel drums as a Hempstead hard no; the COPY line was an "e.g." illustration, not verbatim page copy. Facts win per the authority order | ✅ |
| D-024 | 2026-07-09 | Live scans auto-run on first open of each tab; "Refresh now"/"Retry" re-run them; last scan results cached in localStorage so the page opens populated | The scan bar is "the tool's heartbeat" — a rep should never land on a dead page. Cache stamped as "Cached [time]" in the header until a fresh scan completes | ✅ |

| D-025 | 2026-07-09 | Overnight scanner (`scan.js`) ported to the five-territory model and run nightly by a GitHub Action; `leads.json` gains a `territories` schema while the page still reads the old `ny`/`nj` shape (old `nj` maps to North Jersey). Overnight leads merge into the live feeds, deduped by name+date with live results winning | The old scanner reached sources the browser can't (CORS): NYC DOB, FDNY, Title V, TRI, CBS, bankruptcies, CPSC, SEC EDGAR ZWTL, and the bid boards. Reused rather than rebuilt; backward compatibility keeps the existing leads.json rendering until the first new scan runs | ✅ |
| D-026 | 2026-07-09 | Board-hygiene rules carried from the old scanner into both scanner and page: sewage/wastewater never hits the board; ECHO violators feed dropped in favor of the LQG-filtered generator feed; blank-status retail/realty generators dropped; invasive-plant hits get the haul-and-destroy + never-Babylon (APHIS) note | These were deliberate curation decisions in the old scan.js (its comments say the violators feed "floods the board with dry cleaners / realty LLCs"); silently losing them in the rebuild would degrade lead quality | ✅ |
| D-027 | 2026-07-09 | streams.js waste-stream classifier reused to backfill signal tags on any untagged lead; no second stream-filter bar — the signal pill row remains the single filter. PFAS "foam" keyword tightened to word-boundary so "styrofoam" no longer scores as PFAS; lead coordinates outside plausible Northeast-US degrees are discarded (some ArcGIS layers carry Web-Mercator meters in the lat/lon fields) | One filter row per DESIGN's calm-surface discipline; the two data fixes correct false HOT scores and absurd routing distances observed while testing against the real leads.json | ✅ |

*Add new rows below as decisions are made during the build.*
