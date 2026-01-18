# Custom Icon Library Setup for Chumak

This guide outlines how to transform hand-drawn SVGs into a production-ready, tree-shakable icon library that works with Preact and Vite, enabling gradual replacement of Iconify icons.

## 1. Directory Structure

Maintain a clear separation between raw iPad exports and generated Preact components.

```text
chumak/
├── public/
│   └── icons/           # Drop your hand-drawn .svg files here
├── src/
│   └── app/
│       └── components/
│           └── ui/
│               └── icons/  # SVGR will generate components here
│                   ├── template.js
│                   └── index.ts  # Auto-generated barrel file
└── package.json
```

**Note**: Using `public/icons/` keeps SVGs out of the build and makes them easy to access for SVGR.

## 2. Dependencies

Install the SVGR CLI to handle the transformation:

```bash
npm install -D @svgr/cli
```

## 3. The Transformation Command

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "icons:build": "npx @svgr/cli --out-dir src/app/components/ui/icons --typescript --preact --icon --replace-attr-values '#000=currentColor' --index-template ./src/app/components/ui/icons/template.js ./public/icons"
  }
}
```

### Key Flags Explained:

- `--typescript`: Generates `.tsx` files with TypeScript types
- `--preact`: Generates Preact-compatible components (not React)
- `--icon`: Sets width/height to `1em` for easy scaling via CSS
- `--replace-attr-values`: Swaps drawing color (e.g., `#000`) for `currentColor` so icons adapt to themes

**Note**: We don't use `--memo` here since Preact's memo API differs from React. You can add memoization later if needed.

## 4. Automation: The Index Template

Create `src/app/components/ui/icons/template.js` to auto-generate the barrel file:

```javascript
// src/app/components/ui/icons/template.js
const path = require('path');

function defaultIndexTemplate(filePaths) {
  const exportEntries = filePaths.map(({ path: filePath }) => {
    const basename = path.basename(filePath, path.extname(filePath));
    // Handle filenames starting with numbers (SVGR requirement)
    const exportName = /^\d/.test(basename) ? `Svg${basename}` : basename;
    return `export { default as ${exportName} } from './${basename}'`;
  });
  return exportEntries.join('\n');
}

module.exports = defaultIndexTemplate;
```

## 5. Icon Wrapper Component (For Gradual Migration)

Create a wrapper component that supports both custom icons and Iconify fallbacks:

```typescript
// src/app/components/ui/icons/Icon.tsx
import { ComponentProps } from 'preact';
import styles from './Icon.module.css';

interface IconProps {
  name?: string; // Iconify icon name (e.g., "carbon:filter")
  component?: preact.ComponentType<ComponentProps<'svg'>>; // Custom icon component
  size?: number | string;
  class?: string;
  style?: string | Record<string, string>;
}

export function Icon({ name, component: IconComponent, size, class: className, style, ...props }: IconProps) {
  const sizeStyle = size
    ? typeof size === 'number'
      ? `width: ${size}px; height: ${size}px; font-size: ${size}px;`
      : `width: ${size}; height: ${size}; font-size: ${size};`
    : '';

  // If custom component provided, use it
  if (IconComponent) {
    return (
      <span
        class={`${styles.icon} ${className || ''}`}
        style={sizeStyle || style}
        {...props}
      >
        <IconComponent />
      </span>
    );
  }

  // Fallback to Iconify
  if (name) {
    return (
      <span
        class={`iconify ${styles.icon} ${className || ''}`}
        data-icon={name}
        style={sizeStyle || style}
        {...props}
      />
    );
  }

  return null;
}
```

```css
/* src/app/components/ui/icons/Icon.module.css */
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
  stroke: currentColor;
}
```

## 6. Usage Patterns

### Pattern A: Direct Custom Icon Import (Recommended for New Code)

```tsx
import { Filter } from '../ui/icons';
import styles from './RibbonToolbar.module.css';

function RibbonButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} class={styles.button}>
      <Filter class={styles.icon} /> {/* Custom icon component */}
      <span>Filter</span>
    </button>
  );
}
```

### Pattern B: Gradual Migration with Icon Wrapper

```tsx
import { Icon } from '../ui/icons/Icon';
import { Filter } from '../ui/icons'; // Import custom when ready

function RibbonButton({ onClick }: { onClick: () => void }) {
  // Gradually switch from name to component prop
  return (
    <button onClick={onClick} class={styles.button}>
      <Icon name="carbon:filter" size="32px" /> {/* Old: Iconify */}
      {/* <Icon component={Filter} size="32px" /> */} {/* New: Custom icon */}
      <span>Filter</span>
    </button>
  );
}
```

### Pattern C: Icon Mapping (For Functions Like `getTypeIcon`)

Create an icon registry for programmatic access:

```typescript
// src/app/components/ui/icons/registry.ts
import { String, Integer, Number, Boolean, Date, Calendar } from './index';

export const iconRegistry: Record<string, preact.ComponentType<any>> = {
  'ix:data-type-string': String,
  'ix:data-type-integer': Integer,
  'ix:data-type-double': Number,
  'ix:data-type-boolean': Boolean,
  'ix:calendar': Calendar,
  // ... more mappings
};

export function getIconComponent(iconifyName: string): preact.ComponentType<any> | null {
  return iconRegistry[iconifyName] || null;
}
```

Update `getTypeIcon` usage:

```typescript
// In helper-handlers.ts or DataTable.tsx
import { getIconComponent } from '../components/ui/icons/registry';
import { Icon } from '../components/ui/icons/Icon';

// In component:
const iconName = getTypeIcon(column);
const IconComponent = getIconComponent(iconName);

<span>
  {IconComponent ? (
    <Icon component={IconComponent} />
  ) : (
    <Icon name={iconName} />
  )}
</span>
```

## 7. Migration Strategy

### Phase 1: Setup Infrastructure

1. Create `public/icons/` directory
2. Add `template.js` and `Icon.tsx` wrapper
3. Add `icons:build` script to `package.json`
4. Test with one icon (e.g., `filter.svg`)

### Phase 2: Replace High-Visibility Icons

Start with icons users see most:

- Ribbon toolbar buttons (`RibbonToolbar.tsx`)
- Sidebar actions (`Sidebar.tsx`)
- Header buttons (`AppHeader.tsx`)

### Phase 3: Replace Dialog Icons

- Transform dialog icons (`*Dialog.tsx` components)
- Type menu icons (`TypeMenu.tsx`)
- Data table icons (`DataTable.tsx`)

### Phase 4: Complete Migration

- Update helper functions (`getTypeIcon`, `getNotificationIcon`, etc.)
- Remove Iconify script from `index.html` once all icons are replaced
- Clean up old `data-icon` usages

## 8. Current Icon Usage in Chumak

### Iconify Icon Sets Used:

- **Carbon Design**: `carbon:*` (most common)
  - Examples: `carbon:filter`, `carbon:upload`, `carbon:edit`
- **Material Symbols Light**: `material-symbols-light:*`
  - Examples: `material-symbols-light:pivot-table-chart-rounded`
- **Codicon**: `codicon:*`
  - Examples: `codicon:replace`
- **Iconify Extended**: `ix:*`
  - Examples: `ix:calendar`, `ix:data-type-string`

### Common Icon Locations:

- `src/app/components/RibbonToolbar.tsx` - Main toolbar (30+ icons)
- `src/app/components/ColumnToolbar.tsx` - Column actions
- `src/app/components/Sidebar.tsx` - Import/source actions
- `src/app/components/DataTable.tsx` - Type indicators
- `src/app/handlers/helper-handlers.ts` - `getTypeIcon()` function

## 9. SVG Optimization Tips

Before dropping SVGs in `public/icons/`, ensure they're optimized:

1. **Remove metadata**: SVGR will handle this, but you can pre-optimize
2. **Single color**: Use `#000` for stroke/fill; SVGR replaces with `currentColor`
3. **Consistent viewBox**: Ensure all icons use similar viewBox dimensions
4. **Stroke width**: Aim for 1.5-2px stroke width for consistency

You can batch optimize using [SVGO](https://github.com/svg/svgo):

```bash
npm install -D svgo
npx svgo -f public/icons -r
```

## 10. CSS Styling for Hand-Drawn Icons

Since you're drawing manually, stroke widths might vary. Add this to your global CSS or component CSS:

```css
/* Ensure consistent stroke weight for hand-drawn icons */
.custom-icon path {
  vector-effect: non-scaling-stroke;
  stroke-width: 1.5px;
}
```

Apply the `custom-icon` class to your Icon wrapper or individual icon components as needed.

## 11. Testing Your Icons

After running `npm run icons:build`:

1. Check `src/app/components/ui/icons/index.ts` was generated
2. Verify TypeScript compilation: `npm run typecheck`
3. Import an icon in a component and verify it renders
4. Check that `currentColor` inheritance works with your theme

---

**Next Steps**: Start with one icon (e.g., `filter.svg`) in `public/icons/`, run `npm run icons:build`, and test the migration pattern before replacing all icons.
