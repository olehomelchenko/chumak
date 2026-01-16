# Debugging Guide

This document describes the debugging features available during development.

## CSS Module Class Names

### Development Mode

In development (`npm run dev`), CSS Module class names are enhanced to include component file names for easier debugging:

- **Format**: `ComponentName__className___hash`
- **Example**: `DataTable__cell___a1b2c`

This makes it easy to identify which component a CSS class belongs to when inspecting the DOM.

### Production Mode

In production builds (`npm run build`), class names are optimized for bundle size:

- **Format**: `hash` (8-character base64 hash)
- **Example**: `a1b2c3d4`

## Component Identification

### Using `devProps` Helper

Add `data-component` attributes to your component root elements in development mode:

```tsx
import { devProps } from '../utils/dev-helpers';
import styles from './MyComponent.module.css';

export function MyComponent(props: MyComponentProps) {
  return (
    <div {...devProps('MyComponent', { class: styles.container })}>{/* component content */}</div>
  );
}
```

In development, this will render:

```html
<div data-component="MyComponent" class="MyComponent__container___abc12"></div>
```

In production, the `data-component` attribute is omitted.

### Using `devClass` Helper

Add debug class prefixes in development mode:

```tsx
import { devClass } from '../utils/dev-helpers';
import styles from './MyComponent.module.css';

export function MyComponent() {
  return <div class={devClass('MyComponent', styles.container)}>{/* component content */}</div>;
}
```

In development, this will render:

```html
<div class="[MyComponent] MyComponent__container___abc12"></div>
```

## CSS Source Maps

CSS source maps are automatically enabled in development mode, allowing you to:

- See original file names and line numbers in browser DevTools
- Debug CSS directly in your source files
- Use browser DevTools to identify which component styles are applied

## Browser DevTools Tips

1. **Inspect Element**: Right-click any element and select "Inspect" to see:
   - Component name in `data-component` attribute (if using `devProps`)
   - CSS class names with component prefixes
   - Original source file locations in the Styles panel

2. **Component Tree**: Use Preact DevTools (if installed) to see the component hierarchy

3. **Styles Panel**: In Chrome/Firefox DevTools, you can see:
   - Which CSS file each rule comes from
   - Original line numbers (thanks to source maps)
   - Computed styles and overrides

## Example: Finding a Component in the Codebase

If you see a class name like `DataTable__cell___abc12` in the DOM:

1. The component file is likely `src/app/components/DataTable.tsx`
2. The CSS file is `src/app/components/DataTable.module.css`
3. The class name in the CSS file is `.cell`

This makes it easy to navigate from DOM inspection to source code.
