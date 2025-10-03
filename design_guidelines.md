# Creative Contest Platform Design Guidelines

## Design Approach

**Reference-Based**: Drawing inspiration from **Dribbble** (masonry grids, creator focus) and **Behance** (immersive project showcases) with custom dark theme and glass morphism aesthetic.

**Core Principles**: Bold visual hierarchy, content-first layouts, satisfying micro-interactions, celebration of creativity.

---

## Color System

### Dark Mode Palette (Primary)
- **Background Base**: 15 8% 12% (deep charcoal)
- **Background Elevated**: 15 8% 16% (cards/modals)
- **Background Subtle**: 15 8% 10% (page background)
- **Primary Purple**: 265 78% 58% (vibrant purple - #7C3CEC)
- **Purple Hover**: 265 78% 65%
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 0 0% 70%
- **Text Muted**: 0 0% 50%
- **Border Subtle**: 0 0% 25%
- **Success Green**: 142 76% 45% (voting confirmation)
- **Warning Orange**: 25 95% 60% (contest deadlines)

### Accent Application
Use purple sparingly for maximum impact: CTAs, active votes, contest badges, live indicators, and winner highlights.

---

## Typography

**Fonts**: 
- **Display/Headings**: 'Inter' (700, 800 weights) - sharp, modern
- **Body/UI**: 'Inter' (400, 500, 600) - clean readability

**Scale**:
- Hero Headline: 4xl/5xl (bold 800)
- Section Titles: 2xl/3xl (bold 700)
- Card Titles: lg/xl (semibold 600)
- Body Text: base (regular 400)
- Captions/Meta: sm (medium 500)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **4, 6, 8, 12, 16, 24** for consistency.

**Container Strategy**:
- Max-width: 7xl (1280px) for main content
- Full-width for hero and featured contest banners
- Grid gaps: 6-8 units for gallery layouts

---

## Glass Morphism Implementation

**Recipe**:
- Background: backdrop-blur-xl with bg-white/5 (dark mode)
- Border: 1px solid white/10
- Subtle shadow: shadow-2xl with purple glow (0 8px 32px rgba(124, 60, 236, 0.15))
- Apply to: Navigation, modal overlays, voting cards, submission forms

**Usage Context**: Overlay elements over images/gradients, contest cards, floating UI components.

---

## Core Components

### Navigation
Top navbar with glass effect, logo left, search center, user profile/upload right. Sticky on scroll with subtle blur increase.

### Hero Section
Full-bleed featured contest showcase: Large background image (winning submission or contest theme), glass morphism title card overlaying bottom-left, live contest countdown, primary CTA ("Submit Entry" button with purple gradient), secondary stats (entries count, time remaining).

### Contest Grid
Masonry layout (3-4 columns desktop, 2 tablet, 1 mobile): Each card shows thumbnail, title, entry count badge, voting heart icon, creator avatar. Hover: gentle scale (1.02) + purple glow border.

### Submission Cards
Large image/video preview, glass morphism overlay footer with: creator info, vote count with animated heart button, view count, timestamp. Active voted state: filled purple heart with sparkle animation.

### Voting Interface
Prominent heart button (lg size), vote count displayed adjacent, one-click voting with haptic-feel scale animation, voted state persists with color fill.

### Contest Details Page
Hero contest banner, tabbed sections (Entries, Rules, Prizes, Timeline), entry submission grid below, filtering/sorting toolbar with glass effect.

### Submission Form
Multi-step modal with glass background: Upload area (drag-drop), title/description fields, tags/category selection, preview panel, submit button with loading state.

### User Profiles
Cover image header, avatar with glass border, stats row (submissions, votes received, wins), grid of user submissions, follow button.

### Leaderboard Component
Ranked list with: position badges (1st gold, 2nd silver, 3rd bronze), entry thumbnails, vote counts, creator names. Top 3 have elevated glass cards.

---

## Animations

**Micro-interactions Only**:
- Vote button: Scale pulse on click + heart fill animation
- Card hover: Lift with subtle purple glow
- Contest countdown: Number flip animation
- Loading states: Skeleton screens with shimmer

**Performance**: Use CSS transforms and opacity only. No complex scroll animations.

---

## Images Section

### Hero Image
**Placement**: Full-width hero section (80vh height)
**Description**: Award-winning creative submission (photography/digital art) with vibrant colors and strong composition. Apply subtle gradient overlay (bottom to top, from background color to transparent) to ensure text readability.

### Contest Thumbnails
**Placement**: Throughout grid layouts and cards
**Description**: User-submitted images/videos (16:9 or 4:5 ratios). Ensure proper lazy loading and thumbnail optimization.

### Category Icons
**Placement**: Contest category filters, submission type selectors
**Description**: Photography camera, video play icon, digital art palette, design tools. Use heroicons library (outline variant, stroke-2).

### Background Textures
**Placement**: Subtle noise texture on body background
**Description**: Fine grain overlay at 3% opacity for depth without distraction.

### Profile Avatars
**Placement**: Creator attributions, comments, leaderboards
**Description**: Circular cropped user photos with purple ring border for winners/featured creators.

---

## Responsive Behavior

- **Desktop (lg+)**: Multi-column grids (3-4), sidebar filters, expanded navigation
- **Tablet (md)**: 2-column grids, collapsed sidebar to modal, maintained glass effects
- **Mobile (base)**: Single column, bottom sheet modals, simplified navigation drawer, touch-optimized voting buttons (min 44px tap target)