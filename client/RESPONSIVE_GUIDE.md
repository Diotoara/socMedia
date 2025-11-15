# Responsive Design Guide

## Breakpoints

The app uses Tailwind CSS breakpoints:

| Breakpoint | Width | Device | Columns |
|------------|-------|--------|---------|
| `default` | < 640px | Mobile | 1 |
| `sm:` | ≥ 640px | Large Mobile | 2 |
| `md:` | ≥ 768px | Tablet | 2-3 |
| `lg:` | ≥ 1024px | Desktop | 4 |
| `xl:` | ≥ 1280px | Large Desktop | 4 |

## Layout Behavior

### Mobile (< 640px)
```
┌─────────────────┐
│   Navbar        │ ← Hamburger menu
├─────────────────┤
│   Stat Card 1   │
├─────────────────┤
│   Stat Card 2   │
├─────────────────┤
│   Stat Card 3   │
├─────────────────┤
│   Stat Card 4   │
├─────────────────┤
│  Action Card 1  │
├─────────────────┤
│  Action Card 2  │
└─────────────────┘
```

### Tablet (640px - 1023px)
```
┌─────────────────────────────┐
│   Navbar with all links     │
├──────────────┬──────────────┤
│ Stat Card 1  │ Stat Card 2  │
├──────────────┼──────────────┤
│ Stat Card 3  │ Stat Card 4  │
├──────────────┼──────────────┤
│ Action Card 1│ Action Card 2│
├──────────────┼──────────────┤
│ Action Card 3│ Action Card 4│
└──────────────┴──────────────┘
```

### Desktop (≥ 1024px)
```
┌─────────────────────────────────────────────────┐
│   Logo    Dashboard  AI Post  Dual  │  User  Logout │
├──────────┬──────────┬──────────┬──────────────┤
│ Stat 1   │ Stat 2   │ Stat 3   │ Stat 4       │
├──────────┼──────────┼──────────┼──────────────┤
│ Action 1 │ Action 2 │ Action 3 │ Action 4     │
├──────────┴──────────┴──────────┴──────────────┤
│   Configuration / Automation / Logs Tabs      │
└───────────────────────────────────────────────┘
```

## Component Responsiveness

### Navbar

**Mobile (< 768px)**
- Hamburger menu icon
- Logo only (no text)
- Slide-in menu from top
- Full-width menu items
- User info in menu

**Desktop (≥ 768px)**
- All navigation links visible
- Logo with text
- User info in header
- Horizontal layout

### Dashboard Cards

**Mobile**
```jsx
className="grid grid-cols-1 gap-4"
```
- 1 column
- Full width cards
- Smaller padding (p-4)

**Tablet**
```jsx
className="grid grid-cols-1 sm:grid-cols-2 gap-4"
```
- 2 columns
- Medium padding (p-6)

**Desktop**
```jsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
```
- 4 columns
- Larger padding (p-6)
- More gap spacing

### Typography

**Mobile**
```jsx
className="text-xl sm:text-2xl"  // Heading
className="text-sm"              // Body
```

**Desktop**
```jsx
className="text-3xl sm:text-4xl" // Heading
className="text-base"            // Body
```

## Testing Responsive Design

### Browser DevTools
1. Open DevTools (F12)
2. Click device toolbar icon
3. Test these widths:
   - 375px (iPhone SE)
   - 640px (Small tablet)
   - 768px (iPad)
   - 1024px (Desktop)
   - 1440px (Large desktop)

### Common Devices

| Device | Width | Layout |
|--------|-------|--------|
| iPhone SE | 375px | Mobile (1 col) |
| iPhone 12/13 | 390px | Mobile (1 col) |
| iPhone 14 Pro Max | 430px | Mobile (1 col) |
| iPad Mini | 768px | Tablet (2 cols) |
| iPad Pro | 1024px | Desktop (4 cols) |
| MacBook Air | 1280px | Desktop (4 cols) |
| Desktop | 1920px | Desktop (4 cols) |

## Responsive Utilities

### Spacing
```jsx
// Mobile: 4, Desktop: 8
className="px-4 lg:px-8"

// Mobile: 2, Tablet: 4, Desktop: 6
className="gap-2 sm:gap-4 lg:gap-6"
```

### Display
```jsx
// Hide on mobile, show on desktop
className="hidden md:block"

// Show on mobile, hide on desktop
className="md:hidden"
```

### Flexbox
```jsx
// Stack on mobile, row on desktop
className="flex flex-col md:flex-row"

// Center on mobile, space-between on desktop
className="justify-center md:justify-between"
```

### Grid
```jsx
// 1 col mobile, 2 col tablet, 4 col desktop
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
```

## Best Practices

### 1. Mobile-First
Always design for mobile first, then add larger breakpoints:
```jsx
// ✅ Good
className="text-sm md:text-base lg:text-lg"

// ❌ Bad
className="text-lg md:text-sm"
```

### 2. Touch Targets
Ensure buttons are at least 44x44px on mobile:
```jsx
className="p-3 md:p-2"  // Larger padding on mobile
```

### 3. Readable Text
Maintain readable line lengths:
```jsx
className="max-w-full md:max-w-2xl"
```

### 4. Images
Use responsive images:
```jsx
className="w-full h-auto"
```

### 5. Navigation
Simplify navigation on mobile:
- Use hamburger menu
- Reduce menu items
- Larger touch targets

## Accessibility

### Screen Readers
```jsx
<button aria-label="Open menu" className="md:hidden">
  <MenuIcon />
</button>
```

### Focus States
```jsx
className="focus:ring-2 focus:ring-blue-500"
```

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows visual order
- Focus indicators visible

## Performance

### Mobile Optimization
- Smaller images on mobile
- Lazy loading for below-fold content
- Reduced animations on slow devices

### Code Splitting
```jsx
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Testing Checklist

- [ ] Test on real mobile device
- [ ] Test on tablet
- [ ] Test on desktop
- [ ] Test landscape orientation
- [ ] Test with browser zoom (150%, 200%)
- [ ] Test with DevTools device emulation
- [ ] Test touch interactions
- [ ] Test keyboard navigation
- [ ] Test with screen reader

## Common Issues & Solutions

### Issue: Cards too small on mobile
**Solution**: Increase padding
```jsx
className="p-4 sm:p-6"
```

### Issue: Text too small on mobile
**Solution**: Use responsive text sizes
```jsx
className="text-sm sm:text-base"
```

### Issue: Too much content on mobile
**Solution**: Hide non-essential content
```jsx
className="hidden md:block"
```

### Issue: Buttons too close together
**Solution**: Increase gap
```jsx
className="space-y-2 md:space-y-0 md:space-x-4"
```

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

---

**Remember**: Always test on real devices, not just emulators! 📱💻
