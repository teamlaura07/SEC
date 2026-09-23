---
name: Field Survey & Protection Interface
colors:
  surface: '#0c1510'
  surface-dim: '#0c1510'
  surface-bright: '#313c35'
  surface-container-lowest: '#07100b'
  surface-container-low: '#141e18'
  surface-container: '#18221c'
  surface-container-high: '#222c26'
  surface-container-highest: '#2d3731'
  on-surface: '#dae5dc'
  on-surface-variant: '#d6c3b6'
  inverse-surface: '#dae5dc'
  inverse-on-surface: '#29332c'
  outline: '#9e8e82'
  outline-variant: '#51443a'
  surface-tint: '#fbb981'
  primary: '#fbb981'
  on-primary: '#4c2700'
  primary-container: '#c08552'
  on-primary-container: '#442200'
  inverse-primary: '#855324'
  secondary: '#aad0ae'
  on-secondary: '#15371f'
  secondary-container: '#2c4e34'
  on-secondary-container: '#99be9e'
  tertiary: '#ffb4aa'
  on-tertiary: '#61120e'
  tertiary-container: '#e07164'
  on-tertiary-container: '#590b09'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc2'
  primary-fixed-dim: '#fbb981'
  on-primary-fixed: '#2e1500'
  on-primary-fixed-variant: '#693c0f'
  secondary-fixed: '#c5ecc9'
  secondary-fixed-dim: '#aad0ae'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#2c4e34'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#802921'
  background: '#0c1510'
  on-background: '#dae5dc'
  surface-variant: '#2d3731'
typography:
  headline-lg:
    fontFamily: Literata
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Literata
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Literata
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is built for high-stakes environmental monitoring and public safety in the North-East Indian wilderness. The visual language adopts an **Expedition/Survey-Map** aesthetic, prioritizing data density, legibility under varied lighting conditions, and a rugged, authoritative presence. 

The personality is professional and utilitarian, reflecting a government-grade tool designed for forest rangers and experienced trekkers. It avoids decorative flourishes in favor of structural clarity. The interface utilizes a **Modern-Minimalist** approach with subtle **Tactile** influences through topographic textures and high-precision data markers. The emotional response is one of calm, focused situational awareness.

## Colors

The palette is strictly desaturated and earthy, mirroring the deep canopy and soil of the North-East region.

*   **Base Layer:** The background uses a deep moss-charcoal. A low-opacity topographic contour line texture (Parchment color at 5% opacity) should be overlaid globally to reinforce the map aesthetic.
*   **Surfaces:** Interactive or elevated containers use a slightly lifted moss tone to provide subtle contrast without relying on shadows.
*   **Typography:** Primary information uses a warm parchment for maximum readability against dark backgrounds. Secondary labels and metadata use dusty sage.
*   **Functional Accents:** 
    *   **Ochre:** Used for permits, weather advisories, and navigational guidance.
    *   **Moss Green:** Reserved for trail status, safety confirmations, and environmental health.
    *   **Brick Red:** Strictly for danger zones, disaster alerts, and critical hardware failures.

## Typography

This design system uses a tripartite typographic scale to separate narrative, information, and technical data.

*   **Headlines (Literata):** A refined, authoritative serif used for section titles and site headers. It provides a traditional, literary feel that signals credibility.
*   **Body (Hanken Grotesk):** A clean, contemporary sans-serif used for all long-form reading and descriptions. It is selected for its high legibility in low-light environments.
*   **Data & Labels (JetBrains Mono):** Monospaced fonts are used for all coordinates, time-stamps, weather metrics, and ticker-tape information. This emphasizes the "survey-map" nature of the application.

On mobile devices, `headline-lg` should be reduced to 32px to ensure word-wrap integrity.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop (12-column) to maintain the feel of a structured technical report, transitioning to a **Fluid Grid** on mobile (4-column).

*   **Rhythm:** Based on a 4px baseline grid. Components use consistent 16px (md) internal padding.
*   **Margins:** Generous outer margins on desktop (64px) create a "framed" map look.
*   **Dividers:** Use 1px hairlines in Parchment (#E8E4D8) at 15% opacity to separate data modules without adding visual weight.
*   **Information Density:** Content-heavy areas (like trail lists or sensor logs) should use the `sm` (8px) spacing unit to maximize the amount of visible data on one screen.

## Elevation & Depth

Elevation is achieved through **Tonal Layering** and **Hairline Outlines** rather than traditional shadows, which would interfere with the "flat map" aesthetic.

1.  **Level 0 (Base):** Background (#1C2620) with topographic lines.
2.  **Level 1 (Cards/Modules):** Surface color (#243027) with a 1px border (#E8E4D8 at 10% opacity).
3.  **Level 2 (Modals/Pop-overs):** Surface color (#243027) with a more prominent 1px border (#E8E4D8 at 30% opacity).

No blurs or glassmorphism are permitted; the interface must feel solid and opaque, like heavy-duty physical equipment.

## Shapes

The shape language is "Soft-Technical." Elements have a small 0.25rem (4px) corner radius to prevent the UI from feeling overly aggressive (Brutalist), while remaining sharp enough to look professional and precise.

*   **Buttons & Inputs:** 4px radius.
*   **Status Tags:** 2px radius (near-sharp).
*   **Data Containers:** 4px radius.

## Components

*   **Buttons:** Primary buttons use the Clay Ochre background with dark charcoal text. Secondary buttons are ghost-style with a Parchment hairline border. Hover states should slightly increase border opacity.
*   **Inputs:** Dark background (#1C2620) with a 1px Parchment border. Labels must always use `label-caps` in Dusty Sage, positioned above the field.
*   **Trail Cards:** Use the Surface color. Include a vertical "Status Accent" bar on the left edge (Moss Green or Brick Red) to communicate safety at a glance.
*   **Data Tickers:** A horizontal strip at the top or bottom of the viewport using `data-mono` typography, displaying live GPS or weather feeds.
*   **Chips/Tags:** Small, rectangular labels with `data-mono` text. Backgrounds should be low-opacity versions of the accent colors (e.g., Brick Red at 20% opacity).
*   **Checkboxes/Radios:** Square-shaped to match the technical aesthetic. When active, they should fill with the Primary Ochre color.