/**
 * PreactBridge - Mounts Preact components inside Alpine-controlled modal shells
 *
 * Usage:
 *   1. Alpine opens modal and exposes a container element
 *   2. Call mountComponent(container, Component, props)
 *   3. On modal close, call unmountComponent(container)
 */

import { render, ComponentType, VNode } from 'preact';

// Track mounted components for cleanup
const mountedContainers = new WeakMap<Element, boolean>();

/**
 * Mount a Preact component into a container element
 */
export function mountComponent<P extends object>(
  container: Element,
  Component: ComponentType<P>,
  props: P
): void {
  if (mountedContainers.has(container)) {
    // Already mounted - just update props by re-rendering
    render(<Component {...props} />, container);
  } else {
    // First mount
    render(<Component {...props} />, container);
    mountedContainers.set(container, true);
  }
}

/**
 * Unmount a Preact component from a container
 */
export function unmountComponent(container: Element): void {
  if (mountedContainers.has(container)) {
    render(null as unknown as VNode, container);
    mountedContainers.delete(container);
  }
}

/**
 * Higher-order function to create an Alpine-compatible mount function
 * for a specific component type
 */
export function createMounter<P extends object>(Component: ComponentType<P>) {
  return {
    mount: (container: Element, props: P) => mountComponent(container, Component, props),
    unmount: (container: Element) => unmountComponent(container),
  };
}
