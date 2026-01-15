import { memo } from 'preact/compat';

interface LegacyContainerProps {
  id: string;
}

/**
 * A container that never re-renders its children.
 * This is used for legacy Alpine.js templates that are injected via innerHTML.
 * Using memo ensures that Preact doesn't try to clear or diff the content
 * once it has been rendered.
 */
export const LegacyContainer = memo(
  ({ id }: LegacyContainerProps) => <div id={id} />,
  (prev, next) => prev.id === next.id
);
