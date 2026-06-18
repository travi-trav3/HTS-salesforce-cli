# Club Pilot — Design System

Brand + content design system powering Club Pilot's **organic content engine** — LinkedIn and
Instagram first, with flexibility for ad variations and one-off marketing assets. **This is not a
product, portal, or app UI system** (though it includes a faithful recreation of the SMS Platform
dashboard for reference/context).

The mandate is to **codify** the existing brand as it appears on clubpilot.com and in the attached
Figma file — not to redesign, modernize, or reinterpret it.

---

## What Club Pilot is

A **mobile-first member communication platform for private clubs** — country clubs, golf clubs, yacht
clubs, and luxury resorts. Three connected channels (the **Triad of Power**) let clubs reach members
the way members actually communicate:

1. **Conversational SMS** — text messaging with a 98% open rate (within 3 minutes).
2. **AI Assist** — an AI concierge named **Aimi** that answers routine member questions and frees staff.
3. **Member App** — the product lives on the member's phone.

**Positioning:** intelligent club communication — premium and member-first. The brand leans on
*"intelligent communication"* rather than putting *"AI"* front and center.

**Audience:** club decision-makers — general managers, directors of member services, member
communications managers at private/luxury clubs. Premium buyers; ease and member-experience win the
deal, not price.

**Proof points to feature in content:**
- 98% text open rate (within 3 minutes)
- AI Assist concierge "Aimi"
- PGA Show 2026 — #2 Booth overall
- Featured in Golf Digest, Golf Bizz Review, CMAA
- Real member clubs: Pine Brook, Eugene Country Club, Shenorock, Mosswood Meadows, Grayson Valley,
  Salem Country Club, Sleepy Hollow, Worcester, Lost City, Willowbend, Breakers West, Essex County Club.

---

## Sources

- **Figma:** `Club Pilot.fig` (attached, mounted read-only). A marketing/social working file —
  Page-1 holds ~392 frames: website page mockups (`HOMEPAGE*`, 1920-wide), social post drafts
  (`Group-3xxx`), antithesis headline texts, the SMS Platform dashboard mockup, and the club-logo row.
  Single typeface throughout: **Montserrat**.
- **Live site:** clubpilot.com — confirmed the dark canvas (`#030712`), the orange/azure CTA gradients,
  and the wordmark colors.
- Token values below are extracted from the file; live-site values are the confirmed fallback where
  the file is silent.

---

## CONTENT FUNDAMENTALS

**The signature device is the contrast / antithesis headline** — a short tension, then the resolution.
This *is* the brand's voice; retain it, don't smooth it out:

> "Emails get ignored. Text messages — opened."
> "Phone calls are taxing. AI Assist is liberating."
> "Conversations engage. Communication should too."
> "Replace calls. Outperform email." → "Unlock text communication."

- **Em dashes are house style.** They carry the pivot in the antithesis ("Text messages — opened.").
  Use the real em dash `—`, not hyphens.
- **Tone:** confident, modern, premium, energetic — plainspoken. Tech-forward but member-first.
- **Lead with the member-experience outcome, not the feature.** "Intelligent communication" over "AI."
  Avoid "AI-first" loudness; the brand is pivoting toward *intelligent communication*.
- **Person:** speaks to "clubs" / "members" / "you" (the operator). Confident "we" for Club Pilot.
- **Casing:** Headlines in **Title Case** or sentence case with a Capitalized resolution line. Eyebrow
  labels and button labels are **UPPERCASE**, tracked (e.g. `TEXT MESSAGING`, `BOOK A DEMO`,
  `LEARN MORE`). Stat labels are uppercase.
- **Numbers carry weight:** "98%", "3 minutes", "$100M a year", "#2 Booth". Stat cards make the numeral
  the hero.
- **No emoji.** None appear in the brand. Energy comes from color and the antithesis, not emoji.
- **Word count per asset is low** — carousels read in seconds. Hook → support → mark.

**Two-color headline pattern:** the resolution word/line flips to **brand green** (or occasionally
**orange** for the action emphasis) while the tension sits in white. e.g. "Replace calls. Outperform
email." (white) / "Unlock text communication." (green).

---

## VISUAL FOUNDATIONS

**Canvas.** Dark is core. `#030712` near-black with a faint cool cast is the default background; most
templates are light-on-dark. An elevated card surface uses `#101828`; the footer panel `#0d1117`.
**Never lighten the system into a generic light-mode SaaS look.**

**Color discipline (the most common mistake is collapsing roles):**
- **One dominant accent per composition.** Orange = primary action, azure = secondary action,
  emerald green = brand. Don't let them fight.
- Three greens, kept distinct: **emerald `#04ae4d`** (brand — wordmark, dots, dividers),
  **confirmation `#0acb40`** (checks, send, benefit bullets), **acid `#45ff16` / lime `#d9ef15`**
  (energy seasoning only — step markers, punctuation; never large fills or body text). *If a slide
  looks neon, it's wrong.*
- Two blues, kept distinct: **azure CTA `#009ee8→#006fa7`** (bright, saturated, a button) vs. **slate
  messaging `#435267`** (a calm conversation surface — never used where you'd reach for the azure).

**Typography.** Montserrat only. Oversized display headlines (SemiBold 600) that survive a mobile
thumbnail; a confident eyebrow level (Medium 500, green, uppercase); clean Medium body. Numerals get a
deliberate high-impact treatment (Bold 700, up to 120px). Light 300 only for large airy statements.

**Backgrounds.** Flat dark canvas — no busy gradients, no textures. Imagery is full-bleed or
cut-out-on-dark (the Aimi concierge, golfers mid-swing cut out with no background). Real luxury-club
photography, warm/natural but set against the dark; a protection scrim (`--cp-overlay`) sits over
photos when text overlaps.

**Motif & graphic language:**
- **The Triad** — three connected speech bubbles (green smile = AI Assist/Aimi, orange two-dots = SMS,
  green outline = App), often shown sprouting from a golf hole like a plant. This is the brand's
  signature mark and ties to the "Triad of Power." Treat it as a reusable graphic element — **don't
  redraw or restyle it freely.**
- **Chat bubbles** — rounded speech bubbles with a tail (`assets/icons/chat-bubble.svg`) are the
  conversation motif: orange filled ("What time does the range close?"), orange/green outline, azure
  incoming, slate surfaces.
- **Organic "swiggle"** — soft connective squiggle/petal shapes; an approved decorative family.
- **Numbered step clusters** — the site's "how it works" flow; a recognized, templatable pattern.

**Buttons.** Fully pill-shaped (`border-radius: 999px`). Primary = vertical **orange gradient**
(`#ed5901→#b83c00`) with a soft orange glow; secondary = vertical **azure gradient**; "Learn More" /
"Book a Demo" labels uppercase + tracked + white. A green pill appears for in-product/confirm actions.

**Corners & cards.** Generous rounding — cards `16–24px`, chat bubbles `~28px`, buttons full pill.
Cards on the dark canvas are usually borderless, separated by surface lift (`#101828`) and a deep soft
shadow (`0 25px 50px rgba(3,7,18,.65)`); hairline dividers are `rgba(255,255,255,.12)`.

**Hover / press.** Subtle. Hover lifts brightness slightly and the shadow grows; press shrinks ~2%
(`scale(.98)`) and deepens the gradient. No bouncy/elastic motion — transitions are short eases
(150–220ms). Decorative loops are avoided on content.

**Layout & safe zones (social).** Generous safe margins; **nothing critical in the bottom 12–15%**
(caption/feed UI overlap). One clear focal hierarchy per asset: **hook → support → mark**. The wordmark
is consistently placed (usually a corner) and never crowded — keep `--logo-clearspace` around it.

---

## ICONOGRAPHY

- **No general-purpose icon font.** The brand's icon language is the **speech-bubble family** — the
  three Triad bubbles and the tailed chat bubble (`assets/icons/chat-bubble.svg`), drawn as rounded
  filled or outline shapes. These double as both icons and graphic motif.
- Small UI glyphs inside the dashboard (sidebar nav, checklist circles, send) are simple line/fill
  icons in the brand greens and slate. Where a generic UI glyph is genuinely needed and the file has
  none, substitute **Lucide** (CDN, matching ~2px rounded stroke) and flag it — but prefer the
  bubble motif wherever a brand-specific icon will read.
- **No emoji. No unicode-as-icon.** Energy comes from color and the bubble shapes.
- Brand image assets live in `assets/img/` (wordmark, Aimi concierge, dashboard mockup, club-logo row).

---

## Color & type quick reference

| Role | Token | Value |
|---|---|---|
| Canvas | `--cp-canvas` | `#030712` |
| Card surface | `--cp-surface` | `#101828` |
| Brand green | `--cp-green-brand` | `#04ae4d` |
| Confirmation green | `--cp-green-confirm` | `#0acb40` |
| Acid green | `--cp-acid` | `#45ff16` |
| CTA orange | `--cp-orange-top → bottom` | `#ed5901 → #b83c00` |
| Azure CTA | `--cp-azure-top → bottom` | `#009ee8 → #006fa7` |
| Slate messaging | `--cp-slate` | `#435267` |
| Display / body | `--font-display` | Montserrat |

---

## Repository index

**Foundations / global CSS**
- `styles.css` — global entry point (`@import` manifest only). Consumers link this one file.
- `tokens/colors.css` · `tokens/typography.css` · `tokens/spacing.css` · `tokens/fonts.css` — tokens
  (base values + semantic aliases) and the Montserrat webfont import.

**Specimen cards** (`guidelines/`, shown in the Design System tab)
- Colors: surfaces, greens, action gradients, slate & neutrals.
- Type: display & headline, eyebrow & body, stat numeral, two-color headline pattern.
- Spacing: scale, radii, shadows & glow.
- Brand: wordmark, member club logos, imagery (Aimi).

**Components** (`components/`, bundled to `window.ClubPilotDesignSystem_*`)
- `core/` — `Button` (primary orange / secondary azure / brand green / outline), `Eyebrow`, `Stat`, `Badge`.
- `brand/` — `Wordmark`, `ChatBubble`, `TriadMark` (signature three-bubble mark), `LogoRow`.

**Templates** (`templates/`, editable social Design Components)
- Instagram (1080×1350): `ig-hero`, `ig-carousel`, `ig-stat`, `ig-quote`, `ig-press`, `ig-cta`.
- LinkedIn: `li-insight` (1200×1500), `li-square` (1080×1080), `founder-byron` (1200×1500).
- Flex: `ad-square` (1080×1080 static ad), `announcement` (1080×1350 event promo).

**UI kit** (`ui_kits/`)
- `sms-platform/` — interactive recreation of the SMS Platform dashboard + Communication Center.

**Assets** (`assets/`)
- `img/wordmark-clubpilot.png`, `img/aimi-concierge.png`, `img/dashboard-laptop.png`,
  `img/club-logos.png`; `icons/chat-bubble.svg`.

**Skill**
- `SKILL.md` — Agent-Skills-compatible entry point.

---

### Caveats / substitutions
- **Fonts:** Montserrat is loaded from Google Fonts (`tokens/fonts.css`) — the file's binaries weren't
  extractable here. For production/offline, self-host the Montserrat `.woff2` files and swap the import
  for local `@font-face` rules.
- **Wordmark:** `wordmark-clubpilot.png` was cropped + background-keyed from the footer lockup; a clean
  vector wordmark from the brand team would be preferable.
- **TriadMark:** a faithful SVG reproduction of the file's signature three-bubble motif (glyphs: smile /
  two dots / ring). If the brand team has the master vector, drop it in over the component.
