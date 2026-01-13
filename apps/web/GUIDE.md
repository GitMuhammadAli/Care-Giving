# Pixel-Perfect UI Migration Guide

This document details the UI migration from `apps/pixel-perfect` design to `apps/web` while preserving all existing business logic.

## Component Mapping

### UI Components (Reused & Styled)

| Pixel-Perfect Component | Web Component | Status |
|------------------------|---------------|--------|
| `ui/button.tsx` | `ui/button.tsx` | ✅ Migrated - Added editorial, sage, terracotta variants |
| `ui/card.tsx` | `ui/card.tsx` | ✅ Migrated - Added variant prop with pixel-perfect styling |
| `ui/input.tsx` | `ui/input.tsx` | ✅ Migrated - Merged features from both |
| `ui/label.tsx` | `ui/label.tsx` | ✅ Created - New component |
| `ui/dialog.tsx` | `ui/dialog.tsx` | ✅ Created - New component with pixel-perfect styling |
| `ui/textarea.tsx` | `ui/textarea.tsx` | ✅ Created - New component |
| `ui/badge.tsx` | `ui/badge.tsx` | ✅ Migrated - Updated with sage/terracotta colors |
| `ui/avatar.tsx` | `ui/avatar.tsx` | ✅ Migrated - Updated color scheme |

### Layout Components

| Pixel-Perfect Component | Web Component | Status |
|------------------------|---------------|--------|
| `Header.tsx` | `layout/header.tsx` | ✅ Created - Editorial navigation style |
| `Footer.tsx` | `layout/footer.tsx` | ✅ Created - Matching footer layout |
| N/A | `layout/sidebar.tsx` | ✅ Updated - Pixel-perfect color scheme |
| N/A | `layout/mobile-nav.tsx` | ✅ Updated - Pixel-perfect color scheme |
| N/A | `layout/app-shell.tsx` | ✅ Updated - Pixel-perfect colors |
| N/A | `layout/page-header.tsx` | ✅ Updated - Editorial typography |

### Page Mapping

| Pixel-Perfect Page | Web Page | Status |
|-------------------|----------|--------|
| `pages/Index.tsx` | `app/page.tsx` | ✅ Rebuilt - Editorial hero, features, testimonials |
| `pages/SignIn.tsx` | `app/(auth)/login/page.tsx` | ✅ Rebuilt - Pixel-perfect auth UI |
| `pages/SignUp.tsx` | `app/(auth)/register/page.tsx` | ✅ Rebuilt - With benefits sidebar |
| `pages/Dashboard.tsx` | `app/(app)/dashboard/page.tsx` | ✅ Updated - Tabbed interface, quick actions |

## Design Tokens

### Color Palette

The migration introduces the CareCircle editorial design system:

```css
/* Primary Colors */
--background: 40 33% 97%;     /* Warm cream #F9F6F1 */
--foreground: 0 0% 12%;       /* Ink black */
--sage: 92 10% 67%;           /* Soft sage #A8B5A0 - primary accent */
--terracotta: 30 30% 64%;     /* Terracotta #C4A484 - warm accent */
--slate: 208 13% 48%;         /* Muted slate #6B7B8C - secondary */
```

### Typography

Two font families are used:
- **Editorial (Headlines)**: Libre Baskerville - serif
- **Body**: Source Sans 3 - sans-serif

New utility classes:
- `.font-editorial` - Serif font for headlines
- `.font-body` - Sans-serif for body text  
- `.label-caps` - Uppercase tracking labels

## Business Logic Preserved

The following existing functionality was preserved:

### Authentication
- ✅ Login/Register flow (routes unchanged)
- ✅ Auth state management via `useAuth` hook
- ✅ Protected routes via `(app)` layout

### API Integration
- ✅ React Query for data fetching
- ✅ API client (`lib/api/client.ts`)
- ✅ All API endpoints unchanged

### Real-time Features
- ✅ WebSocket connection via `useWebSocket`
- ✅ Offline sync via `useOfflineSync`
- ✅ Push notifications provider

### State Management
- ✅ Zustand stores unchanged
- ✅ React Query cache preserved
- ✅ Local storage for offline data

## Regression Checklist

### Critical Paths (Must Test)

- [ ] **Authentication Flow**
  - [ ] User can navigate to login page
  - [ ] User can log in with valid credentials
  - [ ] User is redirected to dashboard after login
  - [ ] User can navigate to register page
  - [ ] User can create new account
  - [ ] Password strength indicator works
  - [ ] Forgot password link is accessible
  - [ ] User can log out

- [ ] **Dashboard**
  - [ ] Dashboard loads for authenticated users
  - [ ] Greeting displays correct time of day
  - [ ] Current date displays correctly
  - [ ] Care recipient information loads from API
  - [ ] Quick actions are clickable
  - [ ] Tab navigation works (Overview, Medications, Contacts, Documents)
  - [ ] Recent updates display from timeline API
  - [ ] Notifications dropdown opens/closes

- [ ] **Navigation**
  - [ ] Desktop sidebar shows all menu items
  - [ ] Active route is highlighted
  - [ ] Mobile bottom nav shows on small screens
  - [ ] All navigation links work correctly
  - [ ] Logo link goes to dashboard (app) or landing (public)

- [ ] **Landing Page**
  - [ ] Hero section displays correctly
  - [ ] Scroll animations work
  - [ ] All CTA buttons link correctly
  - [ ] Mobile menu opens/closes
  - [ ] Footer links work

### Visual Verification

- [ ] **Typography**
  - [ ] Headlines use serif font (Libre Baskerville)
  - [ ] Body text uses sans-serif (Source Sans 3)
  - [ ] Font sizes are readable on all devices

- [ ] **Colors**
  - [ ] Background has warm cream tone
  - [ ] Sage green used for primary accents
  - [ ] Terracotta used for warm accents
  - [ ] Sufficient contrast for accessibility

- [ ] **Components**
  - [ ] Buttons have correct variants
  - [ ] Cards have proper shadows and borders
  - [ ] Forms have proper spacing and labels
  - [ ] Badges display correct colors

### Responsive Design

- [ ] **Mobile (< 640px)**
  - [ ] Bottom navigation visible
  - [ ] Sidebar hidden
  - [ ] Content readable
  - [ ] Touch targets adequate (44px min)

- [ ] **Tablet (640px - 1024px)**
  - [ ] Layout adapts appropriately
  - [ ] Sidebar may be collapsible

- [ ] **Desktop (> 1024px)**
  - [ ] Full sidebar visible
  - [ ] Three-column dashboard layout

### Accessibility

- [ ] Focus states visible on all interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader announces page changes
- [ ] Forms have proper labels

## Files Changed

### New Files
- `src/components/layout/header.tsx`
- `src/components/layout/footer.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/textarea.tsx`

### Modified Files
- `src/styles/globals.css` - Complete redesign with pixel-perfect tokens
- `tailwind.config.ts` - Extended with pixel-perfect theme
- `src/components/ui/button.tsx` - Added new variants
- `src/components/ui/card.tsx` - Added variant prop
- `src/components/ui/input.tsx` - Updated styling
- `src/components/ui/badge.tsx` - Updated colors
- `src/components/ui/avatar.tsx` - Updated colors
- `src/components/layout/sidebar.tsx` - Updated styling
- `src/components/layout/mobile-nav.tsx` - Updated styling
- `src/components/layout/app-shell.tsx` - Updated styling
- `src/components/layout/page-header.tsx` - Updated styling
- `src/app/layout.tsx` - Updated theme color
- `src/app/(auth)/layout.tsx` - Updated to match pixel-perfect
- `src/app/(auth)/login/page.tsx` - Rebuilt with pixel-perfect UI
- `src/app/(auth)/register/page.tsx` - Rebuilt with pixel-perfect UI
- `src/app/page.tsx` - Rebuilt landing page

### Unchanged Files (Business Logic)
- `src/hooks/*` - All hooks preserved
- `src/lib/api/*` - All API functions preserved
- `src/lib/websocket.ts` - WebSocket logic preserved
- `src/lib/offline-storage.ts` - Offline logic preserved
- `src/components/providers/*` - All providers preserved
- `src/components/care/*` - Care components preserved
- `src/components/modals/*` - Modal logic preserved

## Quick Start Testing

1. Start the development server:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. Open http://localhost:3000

3. Verify landing page matches pixel-perfect design:
   - Editorial hero with sage accent
   - Warm cream background
   - Serif headlines

4. Navigate to /login and verify:
   - Heart logo in sage color
   - Centered card layout
   - Editorial typography

5. Test authentication flow (if backend available)

6. Verify dashboard:
   - Tabbed interface
   - Quick action buttons
   - Care circle sidebar

