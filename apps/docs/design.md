# Design Specifications
Derived from Stitch Project: **Student Productivity Dashboard** (`projects/8402084230462315140`)

## Color Palette

### Brand Colors
- **Indigo Brand**: `#6366f1` (Primary Action / Gradient Start)
- **Violet Brand**: `#a855f7` (Secondary Accent / Gradient End)
- **Gradient**: `bg-gradient-to-r from-[#6366f1] to-[#a855f7]`

### Backgrounds
- **Dark Background**: `#0b0a1a` (Main Page Background)
- **Glass Card**: `rgba(255, 255, 255, 0.05)` (Inter: `bg-white/5`)
- **Glass Hover**: `rgba(255, 255, 255, 0.1)` (Inter: `hover:bg-white/10`)

### Text
- **Headings**: `#ffffff` (White)
- **Body**: `#e2e8f0` (Slate-200)
- **Muted**: `#94a3b8` (Slate-400)
- **Gradient Text**: `bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#a855f7]`

### Borders
- **Glass Border**: `rgba(255, 255, 255, 0.1)` (Inter: `border-white/10`)
- **Dashed Border**: `rgba(255, 255, 255, 0.2)` (Inter: `border-white/20`)

## Typography

### Font Family
- **Primary**: `Inter` (sans-serif)

### Weights
- **Light**: 300
- **Regular**: 400
- **Medium**: 500
- **SemiBold**: 600
- **Bold**: 700

## Layout & Spacing

### Productivity Widgets
- **Grid Gap**: `12px` (`gap-3`)
- **Internal Padding**: `16px` (`p-4`)
- **Border Radius**: 
    - Standard Widgets: `12px` (`rounded-xl`)
    - Cards: `16px` (`rounded-card`)

### Global Spacing
- **Container**: Max width usually constrained or fluid with padding.
- **Section Spacing**: `20px` - `32px` (implied from standard dashboard layouts).

## Effects

### Glassmorphism
- **Backdrop Blur**: `20px` (`backdrop-blur-xl`)
- **Shadow**: `shadow-xl`

### Background Glows
- **Indigo Glow**: `bg-indigo-brand/10` with `blur-[120px]`
- **Violet Glow**: `bg-violet-brand/10` with `blur-[100px]`
