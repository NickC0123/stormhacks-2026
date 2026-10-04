# Design & Styling Spec

> **For Cursor / AI coding agents:** This file is the source of truth for all UI styling. Follow it strictly when creating or editing frontend code.
> - Never hard-code colors, font sizes, spacing, radii, shadows, durations, or z-indexes. Always use a token.
> - If a needed value does not exist as a token, propose a new token here first. Do not invent one-off values inline.
> - Build new UI from the components in section 6 before creating new ones.
> - Values marked `TODO(brand)` are defaults. Replace them with brand values; everything else adapts automatically.

---

## 1. Design Principles

1. **Clarity over decoration.** Every element earns its place. Prefer whitespace to borders, borders to shadows.
2. **Consistency through tokens.** Same problem, same token, same result.
3. **Accessible by default.** WCAG 2.2 AA minimum. Visible focus, sufficient contrast, keyboard operable, reduced-motion respected.
4. **Responsive, mobile-first.** Base styles target small screens; enhance upward with `min-width` queries.
5. **Calm motion.** Motion explains change; it never entertains. Keep it short and subtle.

---

## 2. Token Architecture

Three layers. Components consume **only** the semantic layer.

| Layer | Purpose | Example |
|---|---|---|
| **Primitive** | Raw scale values, no meaning | `--teal-600` |
| **Semantic** | Role-based, theme-aware | `--color-bg-surface`, `--color-text-primary` |
| **Component** | Optional, per-component overrides | `--button-radius` |

**Naming convention:** `--{category}-{role|scale}-{variant?}-{state?}`
Examples: `--color-border-subtle`, `--space-4`, `--radius-md`, `--shadow-lg`, `--duration-fast`.

---

## 3. Tokens (CSS Custom Properties)

Put this in `styles/tokens.css` and import it once at the app root.

```css
:root {
  /* ============ PRIMITIVE: COLOR ============ */
  /* Neutral (TODO(brand): tune warmth/coolness) */
  --gray-0:   #ffffff;
  --gray-50:  #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e1;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-600: #475569;
  --gray-700: #334155;
  --gray-800: #1e293b;
  --gray-900: #0f172a;
  --gray-950: #020617;

  /* Brand / accent: Teal. 500 is the brand value (#00C3D0).
     The rest of the ramp is DERIVED around it; replace with designer-approved
     steps if you have them. 400 doubles as the dark-mode accent. */
  --teal-50:  #e6fafb;
  --teal-100: #bff2f5;
  --teal-200: #8ce8ee;
  --teal-300: #4ddce5;
  --teal-400: #00d2e0;
  --teal-500: #00c3d0;   /* brand accent */
  --teal-600: #00a3ae;
  --teal-700: #007a85;   /* accent-colored text/icons on light backgrounds */
  --teal-800: #005e66;
  --teal-900: #00444a;

  /* iOS system palette (optional, for a native-iOS feel).
     Values are the long-standing iOS 13-18 system colors. Newer OS releases
     may have shifted them, so verify against Apple's HIG before relying on
     exact matches. Light-mode value first, "-dark" is the dark-mode variant.
     Use these only through semantic tokens, never directly in components. */
  --ios-blue:   #007aff;  --ios-blue-dark:   #0a84ff;
  --ios-green:  #34c759;  --ios-green-dark:  #30d158;
  --ios-indigo: #5856d6;  --ios-indigo-dark: #5e5ce6;
  --ios-orange: #ff9500;  --ios-orange-dark: #ff9f0a;
  --ios-pink:   #ff2d55;  --ios-pink-dark:   #ff375f;
  --ios-purple: #af52de;  --ios-purple-dark: #bf5af2;
  --ios-red:    #ff3b30;  --ios-red-dark:    #ff453a;
  --ios-yellow: #ffcc00;  --ios-yellow-dark: #ffd60a;
  --ios-gray:   #8e8e93;  --ios-gray-dark:   #8e8e93;
  --ios-gray-2: #aeaeb2;  --ios-gray-2-dark: #636366;
  --ios-gray-3: #c7c7cc;  --ios-gray-3-dark: #48484a;
  --ios-gray-4: #d1d1d6;  --ios-gray-4-dark: #3a3a3c;
  --ios-gray-5: #e5e5ea;  --ios-gray-5-dark: #2c2c2e;
  --ios-gray-6: #f2f2f7;  --ios-gray-6-dark: #1c1c1e;

  /* Status */
  --green-50:  #f0fdf4; --green-500: #22c55e; --green-600: #16a34a; --green-700: #15803d;
  --amber-50:  #fffbeb; --amber-500: #f59e0b; --amber-600: #d97706; --amber-700: #b45309;
  --red-50:    #fef2f2; --red-500:   #ef4444; --red-600:   #dc2626; --red-700:   #b91c1c;
  --blue-50:   #eff6ff; --blue-500:  #3b82f6; --blue-600:  #2563eb; --blue-700:  #1d4ed8;

  /* ============ SEMANTIC: COLOR (light theme) ============ */
  /* Backgrounds */
  /* Page canvas: product light background #FBFCFF (cooler than gray-50). */
  --color-bg-page:        #fbfcff;
  --color-bg-surface:     var(--gray-0);
  --color-bg-surface-alt: var(--gray-100);
  --color-bg-elevated:    var(--gray-0);
  --color-bg-overlay:     rgb(15 23 42 / 0.5);
  --color-bg-inverse:     var(--gray-900);

  /* Text */
  --color-text-primary:   var(--gray-900);
  --color-text-secondary: var(--gray-600);
  --color-text-tertiary:  var(--gray-500);
  --color-text-disabled:  var(--gray-400);
  --color-text-inverse:   var(--gray-0);
  --color-text-link:      var(--teal-700);
  --color-text-link-hover:var(--teal-800);

  /* Borders */
  --color-border-subtle:  var(--gray-200);
  --color-border-default: var(--gray-300);
  --color-border-strong:  var(--gray-400);
  --color-border-focus:   var(--teal-700);

  /* Brand / interactive */
  /* Accent FILL: backgrounds of primary buttons, FABs, selected fills, etc.
     Product design (Figma) uses WHITE icons/labels on the teal fill
     (--color-on-accent). Prefer icon-only or bold marks on accent fills;
     for long text that needs WCAG AA on teal, use a darker fill or place
     the text on a neutral surface with --color-accent-strong. */
  --color-accent:         var(--teal-500);
  --color-accent-hover:   var(--teal-400);
  --color-accent-active:  var(--teal-600);
  --color-accent-subtle:  var(--teal-50);
  --color-on-accent:      var(--gray-0);     /* white on accent; same in light and dark */
  /* Accent as TEXT, ICON or thin INDICATOR on neutral backgrounds.
     Teal-500 on white is ~2.2:1 and fails; use this token instead.
     It follows the link color so it flips correctly in dark mode.
     Exception: the floating bottom nav active tab uses brand accent
     directly to match Figma. */
  --color-accent-strong:  var(--color-text-link);
  /* Floating bottom navigation (Figma Frame 5 / stormhacks-designin) */
  --color-nav-bar:           var(--ios-gray-6);
  --color-nav-item-active-bg: var(--gray-0);
  --color-nav-item-active:   var(--teal-500);
  --color-nav-item-inactive: #595959;

  /* Status */
  --color-success:        var(--green-600);
  --color-success-subtle: var(--green-50);
  --color-warning:        var(--amber-600);
  --color-warning-subtle: var(--amber-50);
  --color-danger:         var(--red-600);
  --color-danger-hover:   var(--red-700);
  --color-danger-subtle:  var(--red-50);
  --color-info:           var(--blue-600);
  --color-info-subtle:    var(--blue-50);

  /* Focus ring */
  --focus-ring-width:  2px;
  --focus-ring-offset: 2px;
  --focus-ring-color:  var(--color-border-focus);

  /* ============ TYPOGRAPHY ============ */
  /* Brand: Inter (sans / titles), Rubik (display accents), SF Pro / system for compact UI. */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --font-display: "Rubik", var(--font-sans);
  --font-ui: system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif;

  /* Size scale (rem; 1rem = 16px) */
  --text-xs:   0.75rem;   /* 12 */
  --text-sm:   0.875rem;  /* 14 */
  --text-base: 1rem;      /* 16 */
  --text-lg:   1.125rem;  /* 18 */
  --text-xl:   1.25rem;   /* 20 */
  --text-2xl:  1.5rem;    /* 24 */
  --text-3xl:  1.875rem;  /* 30 */
  --text-4xl:  2.25rem;   /* 36 */
  --text-5xl:  3rem;      /* 48 */

  --weight-regular:  400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;

  --leading-tight:   1.2;
  --leading-snug:    1.35;
  --leading-normal:  1.5;
  --leading-relaxed: 1.65;

  --tracking-tight:  -0.02em;
  --tracking-normal: 0;
  --tracking-wide:   0.04em;

  /* ============ SPACING (4px base) ============ */
  --space-0:  0;
  --space-1:  0.25rem;  /* 4 */
  --space-2:  0.5rem;   /* 8 */
  --space-3:  0.75rem;  /* 12 */
  --space-4:  1rem;     /* 16 */
  --space-5:  1.25rem;  /* 20 */
  --space-6:  1.5rem;   /* 24 */
  --space-8:  2rem;     /* 32 */
  --space-9:  2.25rem;  /* 36 — page content horizontal padding */
  --space-10: 2.5rem;   /* 40 */
  --space-12: 3rem;     /* 48 */
  --space-16: 4rem;     /* 64 */
  --space-20: 5rem;     /* 80 */
  --space-24: 6rem;     /* 96 */

  /* ============ SIZING ============ */
  --size-control-sm: 2rem;    /* 32 */
  --size-control-md: 2.5rem;  /* 40 */
  --size-control-lg: 3rem;    /* 48 */
  --size-icon-sm: 1rem;
  --size-icon-md: 1.25rem;
  --size-icon-lg: 1.5rem;
  --container-sm: 40rem;
  --container-md: 48rem;
  --container-lg: 64rem;
  --container-xl: 80rem;
  --touch-target-min: 2.75rem; /* 44px */

  /* ============ RADIUS ============ */
  /* TODO(brand): bigger = friendlier, smaller = more technical */
  --radius-none: 0;
  --radius-sm:   0.25rem;  /* 4 */
  --radius-md:   0.5rem;   /* 8 */
  --radius-lg:   0.75rem;  /* 12 */
  --radius-xl:   1rem;     /* 16 */
  --radius-full: 9999px;

  /* ============ BORDER ============ */
  --border-width: 1px;
  --border-width-thick: 2px;

  /* ============ SHADOW / ELEVATION ============ */
  --shadow-xs: 0 1px 2px 0 rgb(15 23 42 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.08);
  --shadow-md: 0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06);
  --shadow-lg: 0 10px 15px -3px rgb(15 23 42 / 0.1), 0 4px 6px -4px rgb(15 23 42 / 0.06);
  --shadow-xl: 0 20px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.08);

  /* ============ MOTION ============ */
  --duration-instant: 75ms;
  --duration-fast:    150ms;
  --duration-normal:  250ms;
  --duration-slow:    400ms;
  --ease-standard:    cubic-bezier(0.2, 0, 0, 1);
  --ease-enter:       cubic-bezier(0, 0, 0, 1);
  --ease-exit:        cubic-bezier(0.3, 0, 1, 1);

  /* ============ Z-INDEX ============ */
  --z-base:     0;
  --z-dropdown: 1000;
  --z-sticky:   1100;
  --z-overlay:  1200;
  --z-modal:    1300;
  --z-popover:  1400;
  --z-toast:    1500;
  --z-tooltip:  1600;

  /* ============ OPACITY ============ */
  --opacity-disabled: 0.5;
  --opacity-hover-overlay: 0.06;
}

/* ============ DARK THEME ============ */
/* Applies via OS preference unless the user forces light; also via data-theme="dark". */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* see block below */ }
}
:root[data-theme="dark"],
:root:not([data-theme="light"]) {
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --color-bg-page:        var(--gray-950);
    --color-bg-surface:     var(--gray-900);
    --color-bg-surface-alt: var(--gray-800);
    --color-bg-elevated:    var(--gray-800);
    --color-bg-overlay:     rgb(0 0 0 / 0.65);
    --color-bg-inverse:     var(--gray-50);

    --color-text-primary:   var(--gray-50);
    --color-text-secondary: var(--gray-300);
    --color-text-tertiary:  var(--gray-400);
    --color-text-disabled:  var(--gray-600);
    --color-text-inverse:   var(--gray-900);
    --color-text-link:      var(--teal-400);
    --color-text-link-hover:var(--teal-300);

    --color-border-subtle:  var(--gray-800);
    --color-border-default: var(--gray-700);
    --color-border-strong:  var(--gray-600);
    --color-border-focus:   var(--teal-400);

    --color-accent:         var(--teal-400);
    --color-accent-hover:   var(--teal-300);
    --color-accent-active:  var(--teal-500);
    --color-accent-subtle:  rgb(0 210 224 / 0.15);
    --color-on-accent:      var(--gray-0);
    --color-nav-bar:           var(--ios-gray-6-dark);
    --color-nav-item-active-bg: var(--gray-700);
    --color-nav-item-active:   var(--teal-400);
    --color-nav-item-inactive: var(--gray-400);

    --color-success-subtle: rgb(34 197 94 / 0.15);
    --color-warning-subtle: rgb(245 158 11 / 0.15);
    --color-danger-subtle:  rgb(239 68 68 / 0.15);
    --color-info-subtle:    rgb(59 130 246 / 0.15);

    --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.45);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.55);
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --color-bg-page:        var(--gray-950);
  --color-bg-surface:     var(--gray-900);
  --color-bg-surface-alt: var(--gray-800);
  --color-bg-elevated:    var(--gray-800);
  --color-bg-overlay:     rgb(0 0 0 / 0.65);
  --color-bg-inverse:     var(--gray-50);
  --color-text-primary:   var(--gray-50);
  --color-text-secondary: var(--gray-300);
  --color-text-tertiary:  var(--gray-400);
  --color-text-disabled:  var(--gray-600);
  --color-text-inverse:   var(--gray-900);
  --color-text-link:      var(--teal-400);
  --color-text-link-hover:var(--teal-300);
  --color-border-subtle:  var(--gray-800);
  --color-border-default: var(--gray-700);
  --color-border-strong:  var(--gray-600);
  --color-border-focus:   var(--teal-400);
  --color-accent:         var(--teal-400);
  --color-accent-hover:   var(--teal-300);
  --color-accent-active:  var(--teal-500);
  --color-accent-subtle:  rgb(0 210 224 / 0.15);
  --color-on-accent:      var(--gray-0);
  --color-nav-bar:           var(--ios-gray-6-dark);
  --color-nav-item-active-bg: var(--gray-700);
  --color-nav-item-active:   var(--teal-400);
  --color-nav-item-inactive: var(--gray-400);
  --color-success-subtle: rgb(34 197 94 / 0.15);
  --color-warning-subtle: rgb(245 158 11 / 0.15);
  --color-danger-subtle:  rgb(239 68 68 / 0.15);
  --color-info-subtle:    rgb(59 130 246 / 0.15);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.45);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.55);
}
```

> **Note for implementer:** the dark-theme duplication above exists so both OS-preference and manual `data-theme` toggling work. If the project uses a build step (Sass, PostCSS, Style Dictionary), generate the duplicate from one source map instead of hand-maintaining it.

---

## 4. Global Base Styles

Put in `styles/base.css`, after tokens.

```css
*, *::before, *::after { box-sizing: border-box; }

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text-primary);
  background: var(--color-bg-page);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 { margin: 0; font-family: var(--font-display); line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); }
p { margin: 0; }
img, svg, video { display: block; max-width: 100%; }
button, input, select, textarea { font: inherit; color: inherit; }
a { color: var(--color-text-link); text-underline-offset: 0.2em; }
a:hover { color: var(--color-text-link-hover); }

:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

::selection { background: var(--color-accent-subtle); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 5. Type Styles (Roles)

Use these roles, not raw sizes.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `pageTitle` | `--text-5xl` (48) Inter semibold | semibold | tight | -3% (−1.44px at 48) | Page hero titles (e.g. Events); often `--color-accent` |
| `display` | `--text-5xl` (`--text-4xl` on mobile) Rubik | bold | tight | tight | Marketing / display accents |
| `h1` | `--text-4xl` (`--text-3xl` mobile) | bold | tight | tight | Page title |
| `h2` | `--text-3xl` (`--text-2xl` mobile) | semibold | tight | tight | Section title |
| `h3` | `--text-2xl` (`--text-xl` mobile) | semibold | snug | tight | Subsection |
| `h4` | `--text-xl` | semibold | snug | normal | Card/panel title |
| `body-lg` | `--text-lg` | regular | relaxed | normal | Lead paragraph |
| `body` | `--text-base` | regular | normal | normal | Default text |
| `body-sm` | `--text-sm` | regular | normal | normal | Secondary text, table cells |
| `label` | `--text-sm` | medium | snug | normal | Form labels, buttons |
| `caption` | `--text-xs` | regular | normal | wide | Helper text, metadata |
| `overline` | `--text-xs` | semibold | normal | wide, uppercase | Eyebrows |
| `code` | `--text-sm` mono | regular | normal | normal | Inline/blocks of code |

Rules: max line length `65ch` for body copy. Never go below `--text-xs`. Don't use weight below 400.

---

## 6. Components

Common to **all** interactive components:
- Min hit area `--touch-target-min` on touch devices (can be met with padding or a pseudo-element).
- States required: `default`, `hover`, `focus-visible`, `active`, `disabled`, plus `loading`/`error` where relevant.
- Disabled: `opacity: var(--opacity-disabled); cursor: not-allowed; pointer-events: none` (and use the native `disabled` attribute or `aria-disabled`).
- Transitions: `color, background-color, border-color, box-shadow, transform` over `--duration-fast` with `--ease-standard`. Never `transition: all`.
- Focus: use the global `:focus-visible` ring. Never `outline: none` without a replacement.

### 6.1 Button

**Variants:** `primary`, `secondary`, `ghost`, `danger`, `link`
**Sizes:** `sm` (32px), `md` (40px, default), `lg` (48px)
**Modifiers:** `icon-only` (square), `full-width`, `loading`

| Property | sm | md | lg |
|---|---|---|---|
| Height | `--size-control-sm` | `--size-control-md` | `--size-control-lg` |
| Padding-inline | `--space-3` | `--space-4` | `--space-6` |
| Font | `--text-sm` / medium | `--text-sm` / medium | `--text-base` / medium |
| Gap (icon+label) | `--space-1` | `--space-2` | `--space-2` |
| Radius | `--radius-md` | `--radius-md` | `--radius-md` |

| Variant | Background | Text | Border | Hover | Active |
|---|---|---|---|---|---|
| primary | `--color-accent` | `--color-on-accent` | none | bg `--color-accent-hover` | bg `--color-accent-active` |
| secondary | `--color-bg-surface` | `--color-text-primary` | `--color-border-default` | bg `--color-bg-surface-alt` | bg `--color-bg-surface-alt` + border `--color-border-strong` |
| ghost | transparent | `--color-text-primary` | none | bg `--color-bg-surface-alt` | bg `--color-border-subtle` |
| danger | `--color-danger` | `--color-text-inverse`-on-red (white) | none | bg `--color-danger-hover` | darker via `filter: brightness(0.95)` |
| link | transparent | `--color-text-link` | none | underline | n/a |

**Accent contrast rule:** filled accent controls (primary buttons, FABs) use white (`--color-on-accent`) on the teal fill to match Figma. Prefer short labels or icon-only marks on accent fills. For longer copy that must meet WCAG AA against teal, place the text on a neutral surface and use `--color-accent-strong`, or darken the fill.

Loading: replace label with spinner (keep width fixed), set `aria-busy="true"`, disable pointer events.

```css
.btn {
  --btn-h: var(--size-control-md);
  --btn-px: var(--space-4);
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2);
  height: var(--btn-h); padding-inline: var(--btn-px);
  font-size: var(--text-sm); font-weight: var(--weight-medium); line-height: 1;
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer; user-select: none; white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.btn--sm { --btn-h: var(--size-control-sm); --btn-px: var(--space-3); }
.btn--lg { --btn-h: var(--size-control-lg); --btn-px: var(--space-6); font-size: var(--text-base); }
.btn--primary { background: var(--color-accent); color: var(--color-on-accent); }
.btn--primary:hover { background: var(--color-accent-hover); }
.btn--primary:active { background: var(--color-accent-active); }
.btn--secondary { background: var(--color-bg-surface); color: var(--color-text-primary); border-color: var(--color-border-default); }
.btn--secondary:hover { background: var(--color-bg-surface-alt); }
.btn--ghost { background: transparent; color: var(--color-text-primary); }
.btn--ghost:hover { background: var(--color-bg-surface-alt); }
.btn--danger { background: var(--color-danger); color: #fff; }
.btn--danger:hover { background: var(--color-danger-hover); }
.btn:disabled, .btn[aria-disabled="true"] { opacity: var(--opacity-disabled); cursor: not-allowed; pointer-events: none; }
.btn--icon { width: var(--btn-h); padding-inline: 0; }
```

### 6.2 Text Input / Textarea

- Height `--size-control-md` (textarea: min-height `6rem`, `resize: vertical`).
- Padding-inline `--space-3`; font `--text-base` (prevents iOS zoom; never below 16px on mobile).
- Background `--color-bg-surface`; border `--border-width solid --color-border-default`; radius `--radius-md`.
- Placeholder: `--color-text-tertiary`.
- Hover: border `--color-border-strong`.
- Focus: border `--color-border-focus` + `box-shadow: 0 0 0 3px var(--color-accent-subtle)`.
- Error: border `--color-danger`; ring uses `--color-danger-subtle`; error message below in `caption`, `--color-danger`, linked with `aria-describedby`; set `aria-invalid="true"`.
- Disabled: bg `--color-bg-surface-alt`, text `--color-text-disabled`.
- **Field structure:** `label` (above, `--space-2` gap) → control → helper/error text (`--space-2` gap, `caption`). Required marker: `*` in `--color-danger` plus `aria-required`.

```css
.input {
  width: 100%; height: var(--size-control-md);
  padding-inline: var(--space-3);
  background: var(--color-bg-surface);
  border: var(--border-width) solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
}
.input::placeholder { color: var(--color-text-tertiary); }
.input:hover { border-color: var(--color-border-strong); }
.input:focus-visible { outline: none; border-color: var(--color-border-focus); box-shadow: 0 0 0 3px var(--color-accent-subtle); }
.input[aria-invalid="true"] { border-color: var(--color-danger); }
.input[aria-invalid="true"]:focus-visible { box-shadow: 0 0 0 3px var(--color-danger-subtle); }
.input:disabled { background: var(--color-bg-surface-alt); color: var(--color-text-disabled); cursor: not-allowed; }
```

### 6.3 Select / Combobox
Same box model as Input. Trailing chevron icon (`--size-icon-md`, `--color-text-tertiary`). Menu: `--color-bg-elevated`, `--shadow-lg`, `--radius-lg`, border `--color-border-subtle`, padding `--space-1`, `--z-dropdown`, max-height `20rem` with scroll. Option: height `--size-control-sm`, padding-inline `--space-3`, radius `--radius-sm`; hover/keyboard-active bg `--color-bg-surface-alt`; selected shows check icon and `--weight-medium`.

### 6.4 Checkbox & Radio
Box `1.25rem`; border `--border-width-thick solid --color-border-strong`; radius `--radius-sm` (radio: `--radius-full`). Checked: bg+border `--color-accent`, check/dot in `--color-on-accent` (dark, not white). Label gap `--space-2`. Hit area expanded to the whole label. Indeterminate for checkbox supported.

### 6.5 Switch
Track `2.5rem × 1.5rem`, `--radius-full`; off `--color-border-strong`, on `--color-accent-strong` (so the track stays ≥ 3:1 against the page). Thumb `1.25rem`, white, `--shadow-xs`, translates `1rem`. Use `role="switch"` + `aria-checked`. Transition `--duration-fast`.

### 6.6 Card
- bg `--color-bg-surface`, border `--border-width solid --color-border-subtle`, radius `--radius-lg`, padding `--space-6` (`--space-4` on mobile).
- Elevation: flat by default; `interactive` variant adds `--shadow-sm` on hover and `translateY(-1px)`.
- Anatomy: `card-header` (title `h4` + optional actions) → `card-body` → `card-footer` (border-top `--color-border-subtle`, padding-top `--space-4`). Vertical gap between sections `--space-4`.

### 6.7 Badge / Tag
Height `1.5rem`, padding-inline `--space-2`, font `--text-xs` medium, radius `--radius-full`. Variants: `neutral` (bg `--color-bg-surface-alt`), `accent`, `success`, `warning`, `danger`, `info` — each uses the matching `*-subtle` bg with its strong color as text. Do not rely on color alone; include text or an icon.

### 6.8 Modal / Dialog
- Overlay: `--color-bg-overlay`, `--z-overlay`, fade `--duration-normal`.
- Panel: `--color-bg-elevated`, `--radius-xl`, `--shadow-xl`, `--z-modal`, width `min(32rem, 100% - 2 * var(--space-4))` (sizes: sm 24rem, md 32rem, lg 48rem), max-height `calc(100dvh - var(--space-8))` with internal scroll on body.
- Sections: header (title `h3`, close icon button top-right), body, footer (actions right-aligned, gap `--space-3`; primary action last). Padding `--space-6`.
- Enter: opacity 0→1, scale 0.98→1, `--duration-normal` `--ease-enter`. Exit uses `--ease-exit`, `--duration-fast`.
- A11y: `role="dialog"`, `aria-modal="true"`, labelled by title, focus trapped, `Esc` closes, focus returns to trigger, body scroll locked. On mobile (`< 40rem`) may become a bottom sheet.

### 6.9 Toast / Notification
Width `min(24rem, 100% - 2 * var(--space-4))`, bottom-right (top-center on mobile), `--z-toast`, stack gap `--space-2`. bg `--color-bg-elevated`, border `--color-border-subtle`, `--shadow-lg`, `--radius-lg`, padding `--space-4`. Left status icon (success/warning/danger/info colors). Auto-dismiss 5s (errors: persist until dismissed). `role="status"` (errors: `role="alert"`), pause timer on hover/focus.

**Success snackbar (mobile, Figma `22:3938`):** opaque mint surface `#D1FAE5`, emerald text/icon `#047857`, Inter medium 16 / −3% tracking, 16×12 padding, 10 gap, 4 radius, checkmark 24. Sits above the floating bottom nav. Open/close uses transitions.dev toast (350ms / 250ms, rise 16, scale 0.97); see `motion.toast` + `snackbar` in theme tokens.

### 6.10 Tabs
Tablist border-bottom `--color-border-subtle`. Tab: height `--size-control-md`, padding-inline `--space-4`, `label` type, color `--color-text-secondary`. Hover: `--color-text-primary`. Selected: `--color-text-primary` and 2px bottom indicator `--color-accent-strong`. Arrow-key navigation, `role="tablist|tab|tabpanel"`, roving `tabindex`.

### 6.11 Tooltip
bg `--color-bg-inverse`, text `--color-text-inverse`, `--text-xs`, padding `--space-1 var(--space-2)`, radius `--radius-sm`, `--z-tooltip`, max-width `16rem`, delay 400ms in / 0 out. Shown on hover **and** focus; `role="tooltip"` with `aria-describedby`. Never put essential info or interactive content only in a tooltip.

### 6.12 Navigation (Top bar & Sidebar)
- **Top bar:** height `4rem`, bg `--color-bg-surface`, border-bottom `--color-border-subtle`, sticky with `--z-sticky`, padding-inline `--space-4` (`--space-6` ≥ `md`).
- **Sidebar:** width `16rem` (collapsed `4rem`), bg `--color-bg-surface`, border-right `--color-border-subtle`. Item: height `--size-control-md`, padding-inline `--space-3`, radius `--radius-md`, icon `--size-icon-md`, gap `--space-3`. Active: bg `--color-accent-subtle`, text `--color-accent-strong`, `aria-current="page"`.
- Below `lg`, sidebar becomes an off-canvas drawer.

### 6.12b Floating bottom navigation (mobile)
Source: Figma `stormhacks-designin` / Frame 5. Floating bar above the home indicator; not edge-to-edge.

- **Layout:** horizontal row, `justify-content: space-between`, horizontal padding 14px (`--size-nav-padding-x`), safe-area inset bottom. Left: pill tablist. Right: circular create FAB. Gap `--space-2`.
- **Pill:** bg `--color-nav-bar`, radius `--radius-full`, padding `--space-2` / (`--space-1` + 2px), gap `--space-1`, shadow `0 4px 7.1px rgb(0 0 0 / 0.13)`.
- **Tab item:** icon + label (`label` / 13px), gap `--space-1`, padding `--space-4` / `--space-3`, min touch `--touch-target-min`, radius `--radius-full`, transparent bg. Inactive: `--color-nav-item-inactive`. Active: color `--color-nav-item-active` (brand teal per Figma).
- **Sliding active pill:** absolutely positioned behind tabs (`z-index: 0`). Animate `translateX` + `width` (and top/height if needed) over `--duration-normal` with ease `cubic-bezier(0.22, 1, 0.36, 1)`. Snap with no transition on first layout / resize. Respect `prefers-reduced-motion`. Pill fill: `--color-nav-item-active-bg`.
- **FAB:** size 52px, radius `--radius-full`, bg `--color-accent`, icon `plus` in `--color-on-accent` (white). Pressed: `--color-accent-active`. Opens the create-action alert. `accessibilityLabel` required.
- **Tabs:** Events, Expenses, Profile. Hide other destinations from this bar.

### 6.12c Create-action alert (mobile)
Source: Figma `stormhacks-designin` / Alert on Frame iPhone 17 - 5. Centered chooser opened from the FAB. Exact sizes, colors, and motion live in `apps/mobile/src/theme/tokens.ts`.

- Centered dialog over a dimmed overlay (tap outside to dismiss).
- Title: “What would you like to add?”
- Stacked actions: **Add Event** → `/events/new`, **New Expense** → add-receipt scan (same as event “Add receipt”).
- Open/close uses the transitions.dev panel reveal: translateY + opacity (+ blur where supported); see `motion.modal` in theme tokens.

### 6.13 Table
Header: `overline`-style or `label`, bg `--color-bg-surface-alt`, sticky optional. Cell padding `--space-3 var(--space-4)`, `body-sm`, row border-bottom `--color-border-subtle`. Row hover bg `--color-bg-surface-alt`. Numeric columns right-aligned with `font-variant-numeric: tabular-nums`. Wrap in a horizontally scrollable container on small screens. Provide empty and loading (skeleton) states.

### 6.14 Avatar
Sizes `1.5 / 2 / 2.5 / 3rem`, `--radius-full`, fallback initials on `--color-accent-subtle` with `--color-accent-strong` text, `object-fit: cover`.

### 6.15 Dropdown Menu / Popover
bg `--color-bg-elevated`, border `--color-border-subtle`, `--radius-lg`, `--shadow-lg`, padding `--space-1`, min-width `12rem`, `--z-dropdown` (popover: `--z-popover`). Item height `--size-control-sm`, padding-inline `--space-3`, radius `--radius-sm`; separator 1px `--color-border-subtle` with `--space-1` margin-block; destructive items use `--color-danger`.

### 6.16 Alert / Banner (inline)
Padding `--space-4`, radius `--radius-lg`, bg `*-subtle`, border `--border-width solid` at the status color with reduced opacity, icon + title (`label`) + description (`body-sm`). `role="alert"` only for urgent messages.

### 6.17 Skeleton & Spinner
Skeleton: bg `--color-bg-surface-alt` with a subtle shimmer (disabled under reduced motion), radius matches the element it replaces. Spinner: `--size-icon-md`, 2px stroke, `--color-accent`, 700ms linear rotation.

### 6.18 Empty State
Centered, max-width `24rem`, icon `3rem` in `--color-text-tertiary`, title `h4`, description `body-sm` `--color-text-secondary`, optional primary action; vertical gap `--space-3`, padding-block `--space-12`.

---

## 7. Layout

**Breakpoints** (mobile-first, `min-width`). CSS custom properties can't be used inside media queries, so use these literal values:

| Name | Min width | Typical use |
|---|---|---|
| `sm` | 40rem (640px) | Large phones / small tablets |
| `md` | 48rem (768px) | Tablets |
| `lg` | 64rem (1024px) | Laptops, sidebar appears |
| `xl` | 80rem (1280px) | Desktops |
| `2xl` | 96rem (1536px) | Wide screens |

**Container:** `width: min(100% - 2 * var(--space-4), var(--container-xl)); margin-inline: auto;` (gutter `--space-6` from `md`).

**Grid:** 4 columns on mobile, 8 on `md`, 12 on `lg`+; gap `--space-4` (`--space-6` from `lg`). Prefer CSS Grid for page/2D layout and Flexbox for 1D alignment.

**Spacing rhythm:** related items `--space-2`–`--space-4`; groups within a section `--space-6`–`--space-8`; between sections `--space-12`–`--space-20`.

**Utilities worth providing:** `stack` (vertical flow with a gap prop), `cluster` (wrapping horizontal group), `grid-auto` (`repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`), `visually-hidden`.

---

## 8. Iconography
- One icon family only (TODO(brand): e.g. Lucide). Stroke 1.5–2px, `currentColor`, sizes from `--size-icon-*`.
- Decorative icons: `aria-hidden="true"`. Meaningful standalone icons need an accessible name (`aria-label` or visually-hidden text).
- Icon-only buttons always get an `aria-label` and a tooltip.

## 9. Imagery
Use `aspect-ratio` and `object-fit: cover` to avoid layout shift. Radius `--radius-lg` for content images. Always provide `alt` (empty `alt=""` if decorative). Lazy-load below the fold.

---

## 10. Accessibility Requirements (non-negotiable)
- Contrast: text ≥ 4.5:1 (large text ≥ 3:1), UI components/focus indicators ≥ 3:1, in **both** themes.
- Every interactive element is reachable and operable by keyboard with a visible focus indicator.
- Use semantic HTML first (`button`, `a`, `label`, `nav`, `main`, `dialog`); add ARIA only where semantics are insufficient.
- Never convey meaning by color alone.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Form errors are programmatically associated and announced.
- Target size ≥ 24×24 CSS px (aim for 44×44 on touch).

---

## 11. Code Conventions

**File structure**
```
styles/
  tokens.css        # section 3
  base.css          # section 4
  utilities.css     # layout helpers (stack, cluster, visually-hidden)
components/
  Button/
    Button.tsx
    Button.css      # or Button.module.css
```

**Naming:** BEM-ish for plain CSS (`.card`, `.card__header`, `.card--interactive`); `camelCase` class keys for CSS Modules. State via attributes where possible (`[aria-expanded]`, `[aria-selected]`, `[data-state="open"]`), not extra classes.

**Rules**
- Use logical properties (`margin-inline`, `padding-block`, `inset-inline-start`) for RTL support.
- Use `rem` for type/spacing, `px` only for hairline borders and shadows.
- Use `dvh` instead of `vh` for full-height mobile layouts.
- Keep specificity low (single class selectors); no `!important` except the reduced-motion reset.
- No inline `style` for design values; dynamic values go through custom properties (`style="--progress: 40%"`).
- Components accept variant props (`variant`, `size`) mapped to modifier classes, not raw style props.
- Prefer composition: build complex components from the primitives above.

**If using Tailwind:** map tokens in config instead of using arbitrary values.
```js
// tailwind.config.js (excerpt)
theme: {
  extend: {
    colors: {
      bg: { page: 'var(--color-bg-page)', surface: 'var(--color-bg-surface)', alt: 'var(--color-bg-surface-alt)' },
      text: { primary: 'var(--color-text-primary)', secondary: 'var(--color-text-secondary)' },
      border: { subtle: 'var(--color-border-subtle)', DEFAULT: 'var(--color-border-default)' },
      accent: { DEFAULT: 'var(--color-accent)', hover: 'var(--color-accent-hover)', subtle: 'var(--color-accent-subtle)', strong: 'var(--color-accent-strong)', on: 'var(--color-on-accent)' },
      danger: 'var(--color-danger)', success: 'var(--color-success)', warning: 'var(--color-warning)',
    },
    borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)' },
    boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)' },
    fontFamily: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
  },
}
```
Do not use arbitrary values like `text-[13px]` or `bg-[#123456]`.

---

## 12. Do / Don't

| Do | Don't |
|---|---|
| `color: var(--color-text-secondary)` | `color: #64748b` |
| `padding: var(--space-4)` | `padding: 15px` |
| `transition: background-color var(--duration-fast) var(--ease-standard)` | `transition: all .2s` |
| Style states with `:hover`, `:focus-visible`, `[aria-*]` | Remove outlines with no replacement |
| Use `<button>` for actions, `<a>` for navigation | `<div onClick>` |
| Reuse a component | Copy-paste and tweak its CSS |
| Add a token when a value repeats 3+ times | Add a one-off magic number |

---

## 13. Definition of Done (checklist for any UI change)

- [ ] Uses only tokens (no raw colors, px spacing, or font sizes)
- [ ] Reuses existing components where possible
- [ ] All states implemented: hover, focus-visible, active, disabled, loading, error, empty
- [ ] Works in light and dark themes
- [ ] Responsive from 320px up with no horizontal scroll
- [ ] Keyboard operable; focus order logical; focus visible
- [ ] Contrast checked in both themes
- [ ] Respects reduced motion
- [ ] No layout shift (images sized, skeletons used)
- [ ] Naming and file placement follow section 11

---

## 14. Open Brand Decisions (fill these in)

| Item | Default in this spec | Your value |
|---|---|---|
| Accent color | Teal `#00C3D0` (provided). Ramp around it is derived. | |
| Neutral palette | Slate (iOS grays available as `--ios-gray-*`) | |
| Status colors | Tailwind-style green/amber/red/blue, tuned for contrast. iOS equivalents exist as `--ios-*` but fail contrast as text on white. | |
| Font (sans / display / ui / mono) | Inter / Rubik / SF Pro (system) / JetBrains Mono | |
| Corner style | Medium (8px controls, 12px cards) | |
| Icon library | Lucide (suggested) | |
| Density | Comfortable (40px controls) | |
| Dark mode | OS preference + manual toggle | |
| CSS approach | Plain CSS / CSS Modules (Tailwind mapping included) | |
