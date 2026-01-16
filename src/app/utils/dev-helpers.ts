/**
 * Development helpers for better debugging experience
 */

/**
 * Returns props object with data-component attribute in development mode
 * This helps identify components in the DOM during debugging
 *
 * @param componentName - Name of the component (usually the file name)
 * @param additionalProps - Additional props to merge in
 * @returns Props object with data-component attribute in dev mode
 *
 * @example
 * ```tsx
 * export function MyComponent(props: MyComponentProps) {
 *   return <div {...devProps('MyComponent', props)}>...</div>;
 * }
 * ```
 */
export function devProps<T extends Record<string, any>>(
  componentName: string,
  additionalProps: T = {} as T
): T & { 'data-component'?: string } {
  if (import.meta.env.DEV) {
    return {
      ...additionalProps,
      'data-component': componentName,
    };
  }
  return additionalProps;
}

/**
 * Returns a className string with component name prefix in development mode
 * Useful for adding debug classes that don't interfere with CSS Modules
 *
 * @param componentName - Name of the component
 * @param className - Additional className to append
 * @returns className string with debug prefix in dev mode
 *
 * @example
 * ```tsx
 * <div class={devClass('MyComponent', styles.container)}>...</div>
 * ```
 */
export function devClass(componentName: string, className: string = ''): string {
  if (import.meta.env.DEV) {
    return `[${componentName}] ${className}`.trim();
  }
  return className;
}
