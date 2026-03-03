/**
 * Test Utilities
 *
 * Provides test helpers for components that use i18n
 */

import { render, RenderOptions } from '@testing-library/preact';

/**
 * Custom render function for components that use i18n
 *
 * Note: preact-i18next is mocked globally in test-setup.ts to return
 * translation keys as-is, avoiding the complexity of setting up I18nextProvider.
 *
 * @example
 * import { renderWithI18n } from '../test-utils';
 * renderWithI18n(<MyComponent />);
 */
export function renderWithI18n(ui: Parameters<typeof render>[0], options?: RenderOptions) {
  return render(ui, options);
}
