# Meal Planner MVP - Design Specification

## Design Philosophy
- **Mobile-First**: Designed primarily for mobile web, then enhanced for larger screens
- **Minimal & Clean**: Focus on speed and clarity, minimal decision fatigue
- **Touch-Optimized**: Large touch targets, thumb-friendly navigation
- **Fast**: Generate a full plan in under 5 seconds
- **Clear Visual Hierarchy**: Important actions are prominent, information is scannable
- **Apple Notes Aesthetic**: Clean, simple, with good use of whitespace

## Color Palette
- **Primary**: Blue (#2563eb) for primary actions
- **Success**: Green (#10b981) for approved states
- **Neutral**: Gray scale for text and backgrounds
- **Background**: White (#ffffff) with subtle gray (#f9fafb) for sections
- **Text**: Dark gray (#111827) for primary text, medium gray (#6b7280) for secondary

## Typography
- **Headings**: System font stack, bold, 24px-32px
- **Body**: System font stack, regular, 16px
- **Small Text**: 14px for labels and secondary info
- **Monospace**: For code-like outputs (grocery lists, recipe packets)

## User Flow & Screen Descriptions

### Screen 1: Recipe Selection & Category Filter
**Purpose**: Load recipes from Paprika and allow category filtering

**Mobile Layout (Primary)**:
- Header: "Meal Planner" title (sticky, compact)
- Section 1: Category Selection
  - Heading: "Filter Recipes (Optional)"
  - Subtext: "Select categories or use all recipes"
  - Full-width multi-select dropdown/accordion showing all user's Paprika categories
  - "Use All Recipes" toggle switch at top (large, easy to tap)
  - Selected categories shown as chips/badges below selector
- Section 2: Recipe List Preview
  - Heading: "[count] Recipes Available"
  - Vertical card list (one per row, full width):
    - Recipe name (bold, 16px)
    - Categories (small tags below name)
  - Loading state: Full-screen spinner with "Loading recipes..."
  - Empty state: Centered message with icon

**Desktop Enhancements**:
- Two-column layout: Categories sidebar (left), Recipe list (right)
- Recipe cards in grid (2-3 columns)

**Actions**:
- "Load Recipes" button (full-width on mobile, auto-width on desktop)
- Category selection updates recipe list in real-time

**Visual Notes**:
- Mobile: Full-width components, vertical stacking
- Categories displayed as small rounded badges/tags
- Recipe list is scrollable with pull-to-refresh feel
- Clear visual separation between sections

---

### Screen 2: Week Selection
**Purpose**: Select which days of the upcoming week need dinners

**Mobile Layout (Primary)**:
- Header: "Select Days" (compact)
- Subheader: Date range (e.g., "Jan 12-18, 2025") - smaller text
- Day Grid: Vertical stack of 7 day cards (full width)
  - Each card shows:
    - Day name and date (e.g., "Sunday, Jan 12")
    - Large toggle switch on the right (thumb-friendly)
    - Selected: Blue background (#dbeafe), checkmark icon
    - Unselected: White background, gray border
  - Cards have padding (16px), rounded corners, subtle shadow when selected
- Summary: "X days selected" (sticky footer or above button)
- "Continue to Planning" button (full-width, fixed bottom on mobile, disabled if 0 days)

**Desktop Enhancements**:
- Horizontal grid: 7 columns in a row
- Compact day cards (smaller, side-by-side)
- Button inline with summary

**Actions**:
- Tap/click day card to toggle
- Large toggle switch for easy thumb interaction
- "Continue to Planning" button (disabled if 0 days selected)

**Visual Notes**:
- Mobile: Vertical stack, large touch targets (min 60px height per card)
- Selected days have clear visual feedback (blue background, checkmark)
- Current day (if in the week) subtly highlighted with different border color

---

### Screen 3: Meal Plan Generation
**Purpose**: Generate and display suggested meal plan

**Mobile Layout (Primary)**:
- Header: "Your Meal Plan" (compact)
- Loading State (brief):
  - Full-screen centered spinner with "Generating plan..."
  - Progress indicator if possible
- Generated Plan: Vertical list of day cards (one per row, full width)
  - Each card shows:
    - Day name and date (header, bold)
    - Recipe name (large, clickable)
    - Recipe categories (small badges below name)
    - Action buttons (full-width, stacked vertically):
      - "Approve" (primary, green when approved)
      - "Replace" (secondary)
      - "Choose Manually" (tertiary, opens bottom sheet)
  - Approved cards: Green checkmark icon, light green background (#d1fae5)
  - Pending cards: White background, all action buttons visible
- "Regenerate All" button (full-width, secondary style)
- "Finalize Plan" button (full-width, fixed bottom, primary, disabled until all approved)

**Desktop Enhancements**:
- Table layout: Columns for Day | Recipe | Actions
- Action buttons inline (horizontal button group)
- Recipe details on hover (tooltip)

**Actions**:
- Tap "Approve" - Marks recipe as approved (green checkmark, card updates)
- Tap "Replace" - Regenerates suggestion for that day only (loading state on card)
- Tap "Choose Manually" - Opens bottom sheet (mobile) or dropdown (desktop) with all recipes
- "Regenerate All" - Regenerates entire plan (keeps approved items)
- "Finalize Plan" button (only enabled when all days have approved recipes)

**Visual Notes**:
- Mobile: Card-based layout, easy to scroll and tap
- Approved vs pending states are visually distinct
- Recipe names are tappable (opens modal/bottom sheet with full recipe details)
- Bottom sheet (mobile) slides up from bottom for recipe selection

---

### Screen 4: Final Output - Grocery List & Recipes
**Purpose**: Display formatted grocery list and recipe packet for copying

**Mobile Layout (Primary)**:
- Header: "Ready to Copy" (compact)
- Tabs or Segmented Control: "Grocery List" | "Recipes" (swipeable)
  
  **Tab 1: Grocery List**
  - Heading: "Grocery List"
  - Text area (read-only, full-width, scrollable) showing formatted list:
    ```
    WEEK OF JAN 12 — GROCERY LIST
    
    Produce
    • 3 bell peppers
    • 1 bunch cilantro
    
    Meat/Fish
    • 2 lb chicken thighs
    
    [... etc ...]
    ```
  - "Copy Grocery List" button (full-width, fixed bottom, primary style)
  
  **Tab 2: Recipe Packet**
  - Heading: "Recipe Packet"
  - Text area (read-only, full-width, scrollable) showing formatted recipes:
    ```
    SUNDAY - Spaghetti Squash Parmesan
    Ingredients:
    • 2 spaghetti squash
    • 1 cup parmesan cheese
    [...]
    
    Instructions:
    1. Preheat oven to 400°F
    [...]
    
    MONDAY - One-Pot Chicken and Rice
    [...]
    ```
  - "Copy Recipe Packet" button (full-width, fixed bottom, primary style)

- "Start New Plan" button (full-width, secondary style, below tabs)

**Desktop Enhancements**:
- Two-column side-by-side layout
- Both text areas visible simultaneously
- Copy buttons inline below each text area

**Actions**:
- Tap "Copy Grocery List" - Copies to clipboard, shows toast "Copied!"
- Tap "Copy Recipe Packet" - Copies to clipboard, shows toast "Copied!"
- Swipe between tabs (mobile) or click tab headers
- "Start New Plan" - Returns to Screen 2 (week selection)

**Visual Notes**:
- Mobile: Tab-based navigation, one section at a time
- Text areas are monospace font, readable, with proper padding
- Clear section headers in the text
- Copy buttons are prominent, full-width on mobile
- Success toast appears briefly after copying (bottom of screen on mobile)

---

## Component Specifications

### DaySelector Component
- **Type**: Interactive list/grid of 7 day cards
- **Mobile (Primary)**:
  - Vertical stack of full-width cards
  - Each card: min 60px height, 16px padding
  - Large toggle switch on right (thumb-friendly)
  - Day name and date on left
- **Desktop**: Horizontal grid, compact cards (~100px wide)
- **States**: 
  - Default: White background, gray border
  - Selected: Blue background (#dbeafe), blue border (#2563eb), checkmark icon
  - Active/Tap: Slight scale animation
- **Content**: Day name, date number, toggle switch

### RecipeCard Component
- **Type**: Card displaying recipe information
- **Layout**: 
  - Recipe name (bold, 18px)
  - Category badges (small, rounded, colored)
  - Optional: Recipe image thumbnail (if available from Paprika)
- **States**: Default, Hover (slight shadow), Selected (blue border)

### PlanReviewTable Component
- **Type**: Card list (mobile) or data table (desktop)
- **Mobile (Primary)**:
  - Vertical stack of full-width cards
  - Each card: Day header, Recipe name, Categories, Action buttons (stacked)
  - Cards have padding, rounded corners, subtle shadow
- **Desktop**: Table layout with columns
- **Row/Card States**:
  - Pending: White background
  - Approved: Light green background (#d1fae5), checkmark icon
- **Actions**: 
  - Mobile: Full-width buttons stacked vertically
  - Desktop: Inline button group
  - "Approve" (primary, green when approved), "Replace" (secondary), "Choose" (tertiary)
  - Icons: Checkmark, Refresh, Dropdown

### CategorySelector Component
- **Type**: Multi-select dropdown or checkbox list
- **Options**: 
  - "Use All Recipes" checkbox (at top)
  - List of all user categories (checkboxes)
- **State**: Selected categories highlighted, count shown

### GroceryListOutput Component
- **Type**: Read-only textarea with copy button
- **Mobile (Primary)**:
  - Full-width textarea (fills viewport width minus padding)
  - Fixed bottom button (sticky, full-width)
  - Textarea scrollable, max-height: calc(100vh - 200px)
- **Desktop**: Inline layout, button below textarea
- **Styling**: 
  - Monospace font (Courier, Monaco, or system monospace)
  - Light gray background (#f9fafb)
  - Padding: 16px
  - Border: 1px solid #e5e7eb
  - Font size: 14px (mobile), 16px (desktop)
- **Button**: "Copy Grocery List" - Blue, full width (mobile), auto width (desktop)

### RecipePacketOutput Component
- **Type**: Read-only textarea with copy button
- **Mobile (Primary)**: Same mobile layout as GroceryListOutput
- **Desktop**: Same desktop layout as GroceryListOutput
- **Styling**: Same as GroceryListOutput
- **Button**: "Copy Recipe Packet" - Blue, full width (mobile), auto width (desktop)

### Toast/Notification Component
- **Type**: Temporary success message
- **Mobile (Primary)**: 
  - Position: Bottom-center (above fixed buttons)
  - Full-width with side margins (16px)
  - Large touch-friendly size
- **Desktop**: Top-right corner, compact size
- **Content**: "✓ Copied to clipboard!"
- **Animation**: Slide up from bottom (mobile) or slide in from right (desktop), fade out after 2 seconds
- **Styling**: Green background (#10b981), white text, rounded corners, shadow, padding 16px

---

## Responsive Breakpoints (Mobile-First)
- **Mobile (Primary)**: < 640px
  - Single column layouts
  - Full-width components
  - Vertical stacking
  - Large touch targets (min 44px, prefer 60px)
  - Fixed/sticky bottom buttons for primary actions
  - Bottom sheets for modals
  - Swipeable tabs/sections
  
- **Tablet**: 640px - 1024px
  - Some 2-column layouts where appropriate
  - Larger touch targets maintained
  - Side-by-side components where space allows
  
- **Desktop**: > 1024px
  - Multi-column layouts
  - Hover states and tooltips
  - Inline actions and buttons
  - Side-by-side content (grocery list + recipes)

## Loading States
- **Spinner**: Circular, blue, centered
- **Skeleton Loaders**: For recipe lists and tables
- **Progress Indicators**: For long operations (recipe fetching, plan generation)

## Error States
- **Error Messages**: Red text, clear icon, actionable message
- **Empty States**: Friendly message with illustration or icon
- **Network Errors**: "Failed to connect to Paprika. Please check your credentials."

## Accessibility Requirements
- **Touch Targets**: Minimum 44x44px (mobile), prefer 60px for primary actions
- **Keyboard Navigation**: All interactive elements keyboard accessible (desktop)
- **Focus States**: Clear focus indicators (blue outline, 2px)
- **ARIA Labels**: Proper labels for screen readers
- **Color Contrast**: WCAG AA compliant (4.5:1 for text)
- **Mobile Gestures**: Support swipe for tabs, pull-to-refresh where appropriate
- **Screen Reader**: Announce state changes (e.g., "Recipe approved", "Copied to clipboard")

## Animation & Transitions
- **Page Transitions**: Smooth fade/slide (200-300ms)
- **Button Hover**: Subtle scale or color change
- **Loading**: Smooth spinner rotation
- **Toast**: Slide in from top (300ms ease-out)

## Icon Usage
- **Checkmark**: Approved/complete states
- **Refresh/Reload**: Regenerate actions
- **Copy**: Copy to clipboard actions
- **Calendar**: Week/day selection
- **Recipe**: Recipe-related actions
- **Shopping Cart**: Grocery list

## Content Guidelines
- **Button Labels**: Action-oriented ("Generate Plan", "Approve Recipe", "Copy List")
- **Headings**: Clear and descriptive ("Your Weekly Meal Plan", "Select Days")
- **Help Text**: Brief, contextual (tooltips or small text below inputs)
- **Error Messages**: Specific and actionable ("No recipes found. Try selecting different categories.")

---

## Implementation Notes for AI UI Generator
- **Mobile-First Approach**: Design for mobile screens first, then enhance for larger screens
- Use TailwindCSS utility classes with mobile-first breakpoints (default: mobile, md: tablet, lg: desktop)
- Components should be reusable and composable
- Follow Next.js App Router patterns (client components marked with "use client")
- Use system fonts for performance
- Ensure all text is readable and properly sized (minimum 14px on mobile)
- Maintain consistent spacing (4px, 8px, 16px, 24px, 32px scale)
- Use subtle shadows and borders for depth
- Keep color palette minimal and consistent
- **Mobile-Specific**:
  - Full-width buttons for primary actions
  - Fixed/sticky bottom navigation for key actions
  - Bottom sheets instead of modals
  - Large touch targets (min 44px, prefer 60px)
  - Vertical stacking by default
  - Swipeable sections where appropriate

