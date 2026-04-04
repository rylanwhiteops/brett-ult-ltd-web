# Ultimate Fire Protection — Industrial Elite

## Mission

A digital resume / high-end portfolio site targeting Hamilton-based industrial and commercial clients. The design language communicates elite craftsmanship, authority, and precision — not a generic service site.

## Brand Identity

### Color Palette
- **Matte Black** `#0B0B0B` — Primary background. Deep, absorbing, serious.
- **Metallic Gold** `#D4AF37` — Accent. Conduit lines, headings, hover states, CTAs.
- **Off-White** `#F5F0E8` — Body text on dark backgrounds.
- **Charcoal** `#1A1A1A` — Secondary surfaces, cards, section dividers.

### Vibe
- Digital Resume / High-End Portfolio
- Think: luxury contractor meets industrial precision
- No clip art, no stock photos of hard hats — real work, real authority
- Animations should feel deliberate and weighty, not playful

### Typography
- Headings: sharp, geometric sans-serif (e.g. Inter, Barlow Condensed, or similar)
- Body: clean, legible at small sizes
- Gold used for headlines and key labels only

## Target Audience
- Hamilton, Ontario–based industrial and commercial clients
- Property managers, general contractors, building owners
- Decision-makers who respond to authority and track record, not flashy sales copy

## Tech Stack
- **Framework**: Astro (static site, minimal JS)
- **Styling**: Tailwind CSS v4 (CSS-first config via `@theme` in `global.css`)
- **Deployment**: TBD

## Design System Tokens (Tailwind v4 `@theme`)

```css
--color-black:   #0B0B0B;
--color-gold:    #D4AF37;
--color-gold-light: #E8C84A;
--color-charcoal: #1A1A1A;
--color-offwhite: #F5F0E8;
```

## Planned Sections
1. **Hero** — Full-bleed dark, gold conduit scroll animation
2. **Services** — Fire suppression, inspections, commercial installs
3. **Portfolio / Past Work** — Photo grid of real jobs
4. **About** — Brett's credentials, Hamilton roots
5. **Contact** — Direct, no-nonsense CTA

## Animation Philosophy — "Gold Conduit"
The hero scroll animation: a gold conduit line draws itself across the screen as the user scrolls, connecting section anchors. Weighted easing, no bouncing. Implemented with CSS scroll-driven animations or GSAP ScrollTrigger.

## Development Rules
- Dark backgrounds everywhere — never white-background sections
- Gold is an accent only — never used as a fill for large areas
- All copy must sound like a contractor who has done 500 jobs, not a marketing team
- Mobile-first, but this audience is likely desktop at time of decision
