---
name: National Field Survey System
colors:
  surface: '#FFFFFF'
  surface-dim: '#d8dad9'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#F5F7F6'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#564337'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#897365'
  outline-variant: '#dcc1b1'
  surface-tint: '#944a00'
  primary: '#944a00'
  on-primary: '#ffffff'
  primary-container: '#e67e22'
  on-primary-container: '#502600'
  inverse-primary: '#ffb783'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#4b53bc'
  on-tertiary: '#ffffff'
  tertiary-container: '#878ffc'
  on-tertiary-container: '#191e8d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc5'
  primary-fixed-dim: '#ffb783'
  on-primary-fixed: '#301400'
  on-primary-fixed-variant: '#713700'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bfc2ff'
  on-tertiary-fixed: '#00006e'
  on-tertiary-fixed-variant: '#3239a3'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
  text-main: '#1C2620'
  ashoka-blue: '#000080'
  saffron-muted: '#E67E22'
  forest-green: '#2E7D32'
typography:
  headline-lg:
    fontFamily: Literata
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Literata
    fontSize: 32px
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
    lineHeight: '1.0'
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

This design system establishes an official, authoritative, and patriotic visual language for environmental protection and field surveying. The personality is disciplined and professional, designed to evoke a sense of national pride and civic duty through a refined interpretation of the Indian national flag's colors.

The design style is **Corporate / Modern** with a focus on **Information Density**. It leverages a "Survey-Map" aesthetic characterized by thin hairlines, data-heavy modules, and a technical layout. The interface prioritizes clarity and high-stakes situational awareness, feeling less like a consumer app and more like a high-precision government instrument. 

Key visual principles include:
- **Official & Credible:** High-contrast text and a clean white base.
- **Data-Dense:** Maximized screen real estate for technical metrics and coordinates.
- **Utilitarian Elegance:** Combining heritage-inspired colors with modern, functional UI patterns.

## Colors

The palette is a professional homage to the Indian tricolor, optimized for legibility and functional hierarchy in a light-themed environment.

- **Primary (Saffron/Ochre):** A muted, professional saffron used for critical actions, active weather alerts, and high-priority navigational elements.
- **Secondary (Green):** A deep forest green reserved for environmental health, safe trail statuses, and successful system confirmations.
- **Accents (Navy Blue):** Inspired by the Ashoka Chakra, this navy blue is used exclusively for technical data, monospace labels, and high-precision metrics.
- **Neutral & Surface:** The base is a clean, surgical white (`#FFFFFF`). Secondary containers use a subtle off-white (`#F5F7F6`) to create structural depth without the use of heavy shadows.
- **Typography:** All primary text uses a deep charcoal (`#1C2620`) to ensure maximum WCAG contrast ratios on white backgrounds.

## Typography

The system employs a rigorous tripartite typographic scale to organize varied information types:

- **Headlines (Literata):** A scholarly serif that provides an authoritative, "official document" feel. Used for page titles and major section headers.
- **Body (Hanken Grotesk):** A highly legible, modern sans-serif for descriptions, field notes, and general interface text.
- **Data & Labels (JetBrains Mono):** Monospaced fonts are used for all technical data, coordinates, timestamps, and metadata. This reinforces the survey-map aesthetic and ensures numerical alignment in data-dense tables.

On mobile, the `headline-lg` scale is reduced to 32px to maintain layout integrity.

## Layout & Spacing

The layout is governed by a **Fixed Grid** on desktop and a **Fluid Grid** on mobile, designed to mimic the structured nature of a physical field report.

- **Grid:** A 12-column grid on desktop with wide 64px margins creates a "framed" map look, emphasizing the content as a central artifact.
- **Rhythm:** Built on a 4px baseline grid. 16px is the standard padding for most modules, while 8px is used for compact data lists.
- **Dividers:** Use 1px hairlines in a light gray (`#E0E5E2`) to define space without adding visual clutter. 
- **Reflow:** On mobile, margins collapse to 16px and the grid shifts to 4 columns. Data tables should allow horizontal scrolling to maintain the integrity of monospaced metrics.

## Elevation & Depth

To maintain the "Flat Map" aesthetic, this design system rejects heavy shadows and blurs. Depth is conveyed exclusively through **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Base):** Pure White (`#FFFFFF`).
- **Level 1 (Modules/Cards):** Off-white container (`#F5F7F6`) with a 1px hairline border (`#D1D9D4`).
- **Level 2 (Pop-overs/Modals):** Pure White (`#FFFFFF`) with a slightly darker 1px border and a very subtle, tight ambient shadow (4px blur, 5% opacity) only to provide separation from Level 1.
- **Technical Overlays:** Use thin borders in Ashoka Blue (`#000080`) at 20% opacity for floating data tooltips to signal their technical nature.

## Shapes

The shape language is "Soft-Technical." A minimal corner radius ensures the UI feels modern and accessible while retaining the precision of professional surveying equipment.

- **Buttons & Inputs:** 4px (Soft) radius.
- **Status Chips:** 2px radius for a sharper, more data-oriented appearance.
- **Data Containers:** 4px radius.
- **Interactive Icons:** No circular backgrounds; use square or slightly rounded square bounding boxes to maintain the technical grid feel.

## Components

- **Buttons:** 
    - **Primary:** Saffron background with white text. 
    - **Secondary:** White background with 1px Navy Blue border and Navy Blue text.
    - **Environmental:** Green background for "Safe" or "Submit" actions.
- **Input Fields:** White background with a 1px neutral border. Labels must use `label-caps` in Navy Blue, always positioned above the field.
- **Data Cards:** Use Level 1 surfaces with a vertical accent bar on the left (Saffron for alerts, Green for status, Blue for general info).
- **Technical Tickers:** Horizontal bands at the top or bottom of the screen using Navy Blue backgrounds with White `data-mono` text for live coordinate streams.
- **Chips/Tags:** Rectangular with 2px radius. Use low-saturation versions of the tricolor palette (e.g., 10% Saffron fill with 100% Saffron text).
- **Checkboxes & Radios:** Sharp-cornered (2px radius) to match the survey aesthetic; filled with Navy Blue when active.
- **Maps:** Should utilize a custom light-mode style with reduced saturation, allowing the tricolor UI elements to pop.