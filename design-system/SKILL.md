---
name: club-pilot-design
description: Use this skill to generate well-branded interfaces and assets for Club Pilot, either for production or throwaway prototypes/mocks/social content. Contains essential design guidelines, colors, type, fonts, assets, social templates and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (social posts, slides, mocks, throwaway prototypes, etc), copy assets out
of `assets/` and create static HTML files for the user to view. If working on production code, you can
copy assets and read the rules here to become an expert in designing with this brand.

Club Pilot is a **dark-surface-primary** brand for premium private clubs. The essentials:
- **Canvas** `#030712`, light-on-dark. Never lighten into generic light-mode SaaS.
- **Brand green** `#04ae4d`; **confirmation green** `#0acb40`; **acid** `#45ff16` (seasoning only).
- **Primary CTA** = orange gradient `#ed5901→#b83c00`; **secondary** = azure gradient `#009ee8→#006fa7`.
- **Slate messaging** `#435267` is a calm conversation surface — never an accent. Keep the two blues
  and three greens in their separate roles.
- **Type:** Montserrat only (SemiBold display, Medium body, Bold stat numerals).
- **Voice:** the antithesis headline with an em dash — "Emails get ignored. Text messages — opened."
- **Motif:** the Triad (three connected speech bubbles) and the chat-bubble conversation shapes.

Key files:
- `styles.css` + `tokens/` — the full token system (link `styles.css`).
- `guidelines/` — foundation specimen cards.
- `components/` — React primitives (Button, Eyebrow, Stat, Badge, Wordmark, ChatBubble, TriadMark, LogoRow).
- `templates/` — ready-to-edit social Design Components (Instagram, LinkedIn, ad, founder, announcement).
- `ui_kits/sms-platform/` — interactive product dashboard recreation.
- `assets/img/` — wordmark, Aimi concierge, dashboard mockup, member-club logos.

If the user invokes this skill without other guidance, ask what they want to build, ask a few
questions, and act as an expert designer who outputs HTML artifacts _or_ production code as needed.
