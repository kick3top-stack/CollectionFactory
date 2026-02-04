# NFT Marketplace — Design system

All UI styling is driven by two files. **Do not scatter colors or spacing in components.**

## 1. `theme.css` — Design tokens

CSS custom properties. Change once here to update the whole app.

| Token group | Examples |
|-------------|----------|
| **Backgrounds** | `--app-bg`, `--app-surface`, `--app-surface-elevated` |
| **Borders** | `--app-border`, `--app-border-focus` |
| **Brand** | `--app-primary`, `--app-primary-hover`, `--app-primary-muted` |
| **Text** | `--app-text`, `--app-text-muted`, `--app-text-dim`, `--app-text-inverse` |
| **Status** | `--app-success`, `--app-error`, `--app-warning`, `--app-auction`, etc. |
| **Layout** | `--app-nav-height`, `--app-container-max`, `--app-page-padding-*`, `--app-gap*` |
| **Radii** | `--app-radius`, `--app-radius-lg`, `--app-radius-xl` |
| **A11y** | `--app-touch-min`, `--app-touch-min-lg` |
| **Motion** | `--app-transition`, `--app-transition-fast` |
| **Skeleton** | `--app-skeleton-base`, `--app-skeleton-shine`, `--app-skeleton-duration` |

## 2. `components.css` — Semantic component classes

Use these in JSX instead of long Tailwind strings. Layout (flex/grid) can still use Tailwind.

| Area | Classes |
|------|--------|
| **Layout** | `.app-shell`, `.app-container`, `.app-page`, `.app-page-title`, `.app-section`, `.app-section-title` |
| **Nav** | `.app-nav`, `.app-nav-inner`, `.app-nav-logo`, `.app-nav-item`, `.app-nav-item--active`, `.app-wallet-badge`, `.app-btn-connect`, `.app-nav-mobile`, `.app-nav-mobile-item`, `.app-nav-mobile-connect` |
| **Buttons** | `.app-btn`, `.app-btn--primary`, `.app-btn--secondary`, `.app-btn--ghost`, `.app-btn--danger` |
| **Cards** | `.app-card`, `.app-card--clickable`, `.app-card-image`, `.app-card-body`, `.app-card-title`, `.app-card-desc`, `.app-card-meta`, `.app-meta-label` |
| **Form** | `.app-label`, `.app-input`, `.app-select`, `.app-textarea` |
| **Modal** | `.app-modal-overlay`, `.app-modal-box`, `.app-modal-header`, `.app-modal-title`, `.app-modal-close`, `.app-modal-body` |
| **Badges** | `.app-badge`, `.app-badge--auction`, `.app-badge--listed`, `.app-badge--unlisted`, `.app-badge--sale`, etc. |
| **States** | `.app-empty`, `.app-empty-title`, `.app-empty-desc`, `.app-loading-block`, `.app-spinner`, `.app-loading-text`, `.app-connect-prompt`, `.app-connect-prompt-inner`, `.app-connect-prompt-title`, `.app-connect-prompt-desc` |
| **Skeleton** | `.app-skeleton` (automatic pulse + shine animation) |
| **Tables** | `.app-table-wrap`, `.app-table` |
| **Price** | `.app-price`, `.app-price--spend`, `.app-price--neutral` |
| **Hero** | `.app-hero`, `.app-hero-content`, `.app-hero-title`, `.app-hero-desc`, `.app-hero-actions` |

## Usage in components

- Prefer **semantic classes** for look (colors, borders, padding, radius): `app-card`, `app-btn--primary`.
- Use **Tailwind** only for layout and responsiveness: `flex`, `grid`, `gap-4`, `md:flex`, `hidden`, `max-w-7xl`.
- For one-off spacing that matches the system, use theme vars in Tailwind: `gap-[var(--app-gap)]`.

## Changing the look later

1. **Brand color** → Edit `--app-primary` and `--app-primary-hover` in `theme.css`.
2. **All cards** → Edit `.app-card` and `.app-card--clickable` in `components.css`.
3. **All primary buttons** → Edit `.app-btn--primary` in `components.css`.
4. **Page padding** → Edit `--app-page-padding-*` in `theme.css`.
5. **Skeleton animation** → Edit `--app-skeleton-base`, `--app-skeleton-shine`, `--app-skeleton-duration` in `theme.css`, or `.app-skeleton` animation in `components.css`.
