# Design prompt — paste this into a design-focused Claude session

Attach both files (`Reworld-Verified-Impact-Report.html` and
`Reworld-Impact-Report-How-It-Works.html`) and paste everything below the line.

---

You are doing a **visual-design-only pass** on two finished, working, single-file
HTML tools for Reworld (waste-to-energy sustainability company). The math and
behavior are verified and locked — your job is to make them look like a
world-class B2B product: confident, premium, credible enough to put in front of
a Fortune-500 sustainability director.

## Files

1. **`Reworld-Verified-Impact-Report.html`** — an interactive offline calculator.
   Sales reps drop in a customer's waste-delivery spreadsheet; it produces a
   customer-facing sustainability impact report (energy, GHG avoided, metals,
   landfill comparison). It is printed to PDF and handed to customers.
2. **`Reworld-Impact-Report-How-It-Works.html`** — a static explainer/logic
   diagram of the tool (pipeline → equation → toggles → expectations → steps),
   emailed to executives.

## HARD CONSTRAINTS — violating any of these ruins the deliverable

- **Do not touch any JavaScript logic.** No changes to formulas, constants,
  functions, element `id`s, `name` attributes, state keys, localStorage key,
  event wiring, or the file-import code. CSS and cosmetic HTML (wrappers,
  classes, copy layout) only. If you restructure markup, every existing `id`
  and `name` must survive in place.
- **Do not change any number, factor, or claim in the copy.** The GHG figures
  reproduce Reworld's third-party-verified LCA; wording that distinguishes
  "verified" from "modeled" is legally deliberate. You may re-typeset copy,
  never reword the caveats or values.
- **Single self-contained file, fully offline.** No CDN links, no Google Fonts,
  no external images, no fetch. The calculator already embeds Inter, Poppins,
  and IBM Plex Mono as base64 — reuse those. The explainer uses system fonts;
  you may keep that or embed the same faces.
- **Print is a first-class output.** The calculator's print view IS the customer
  deliverable; the explainer gets printed/attached as PDF. Preserve and improve
  `@media print`: clean page breaks (`break-inside: avoid` on cards/tables),
  hide interactive chrome (`.no-print`), ink-friendly backgrounds, sensible
  margins at US Letter.
- **After styling, verify nothing broke:** open the file, confirm zero console
  errors, type a delivery row, toggle GWP 20↔100, switch facility, drag a dummy
  .csv in, hit Reset, print-preview. All must behave exactly as before.

## Brand system

- Core: indigo `#2A1DBF` (primary), teal `#22D9C4` (accent), deep teal
  `#159C8D` (positive/success), ink `#15152B`, secondary ink `#5B5B78`,
  hairline `#E3E4F0`, panel `#F7F8FC`.
- Semantic (keep consistent — this is load-bearing): **teal/green = credits /
  avoided emissions / benefits**, **rose/red `#C2185B`-family = debits /
  emitted CO₂ / net-negative**, **amber on `#FFF4E5` = "modeled estimate"
  caveats**, **green on `#E9FBF7` = "verified" provenance**. Never swap these.
- Type: Poppins (display/headings), Inter (body/UI), IBM Plex Mono (labels,
  eyebrow captions, numerals). Tabular numerals for all figures.
- Voice: quantified, calm, audit-grade. No marketing gloss, no gradients-for-
  gradients'-sake, no emoji in customer-facing surfaces.

## What to improve — calculator (`Reworld-Verified-Impact-Report.html`)

1. **Hierarchy.** The page is long; give it a scannable spine: a slim sticky
   section nav or clear numbered section headers (Account → Deliveries → Impact
   → GHG Analysis → Landfill Comparison → Stream Factors).
2. **Hero metrics.** The four headline metric cards (energy, GHG, metal, homes)
   deserve stat-tile treatment: big tabular numerals, small-caps mono captions,
   one accent rule — not four identical gray boxes.
3. **GHG analysis panel is the centerpiece.** Design the credits/debits flow as
   a visual waterfall or ledger: plus-terms stack (teal), minus-terms stack
   (rose), reconciliation line reading `gross − debits = net` with the net as
   the single largest number on screen. Keep the existing element ids.
4. **Tables.** Delivery table and stream-factor table: tighter row rhythm,
   right-aligned numerals, sticky header on scroll, zebra only if subtle,
   highlighted rows (streams present in the load) should read instantly.
5. **The two "basis/GWP" toggles** should look like proper segmented controls,
   with the active option visibly selected and the verified factor (2.4 / 0.65)
   shown in the control itself.
6. **Dropzone** should feel like a modern uploader (dashed border, hover state,
   success state with filename + parsed period).
7. **Print stylesheet:** the printed report should look like a designed PDF —
   Reworld header band with logo-type, page numbers if possible, no dead
   whitespace from hidden controls, GHG panel and landfill table never split
   across pages.
8. **Empty states.** Before data is entered, panels should show quiet, branded
   empty states, not zeros that look broken.
9. **Responsive:** usable at 768px; tables scroll inside their own containers,
   the page never scrolls horizontally.

## What to improve — explainer (`Reworld-Impact-Report-How-It-Works.html`)

1. Make it feel like a **one-page executive brief**: stronger masthead (title,
   one-liner, verification badges: "ISO 14040/44", "ISO 14067",
   "Third-party verified — WAP"), generous whitespace, crisp 3–4 printed pages.
2. **Pipeline diagram:** upgrade the three-lane inputs→engine→outputs flow with
   real connecting arrows (inline SVG, no libraries), consistent card heights,
   and a visual emphasis path from "Waste deliveries" through "GHG path" to
   "GHG analysis panel" — the money path.
3. **Equation section:** style the six terms as a horizontal waterfall bar
   (pure CSS/SVG) from +2.72 down to the 2.4 net, in the semantic
   credit/debit colors, in addition to (or replacing) the term cards.
4. **Expectations table:** the two GHG-negative rows (plastics, tires) should
   read as deliberate honesty, not errors — e.g. a subtle rose left-border and
   the shared explanation cell clearly attached.
5. **Print:** section per page where natural; the pipeline and the table must
   each fit a page without splitting.

## Deliverables

Return both files with the same filenames, still single-file and offline.
List every change you made in a short changelog comment at the top of each
file's `<style>` block. Then run this QA list and report results:

- [ ] zero console errors on load and after each interaction
- [ ] GWP toggle, basis toggle, facility switch, Reset all update UI + math
- [ ] a typed delivery row recalculates everything
- [ ] localStorage persistence across reload intact (same storage key)
- [ ] print preview: no split panels, no hidden-control gaps, both files
- [ ] no external network requests (check DevTools Network tab = empty)
- [ ] all element ids/names present: `ghgAvoidedVal, ghgMethane, ghgEnergy,
      ghgMetalCr, ghgSteam, ghgStack, ghgBio, ghgNetVal, ghgGross, ghgDebits,
      facilitySel, facilityKwh, gridKg, annualTons, lfBody, pitBody,
      streamBody, ghgStreamBody, summaryBody, ghg, energy, metal, homes,
      ytdGhg, ytdEnergy, ytdMetal, ytdHomes, btn-print, btn-excel, btn-reset,
      btn-add, dropzone, file-input, ghgmode radios, gwp radios`
