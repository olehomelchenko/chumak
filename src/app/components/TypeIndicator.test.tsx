import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { TypeIndicator } from './TypeIndicator';
import styles from './TypeIndicator.module.css';

describe('TypeIndicator', () => {
  it('renders string type with symbol and label', () => {
    const { getByText } = render(<TypeIndicator type="string" />);

    expect(getByText('Aa')).toBeTruthy();
    expect(getByText('String')).toBeTruthy();
  });

  it('renders integer type with symbol and label', () => {
    const { getByText } = render(<TypeIndicator type="integer" />);

    expect(getByText('#')).toBeTruthy();
    expect(getByText('Integer')).toBeTruthy();
  });

  it('renders float type with symbol and label', () => {
    const { getByText } = render(<TypeIndicator type="float" />);

    expect(getByText('0.0')).toBeTruthy();
    expect(getByText('Float')).toBeTruthy();
  });

  it('renders boolean type with symbol and label', () => {
    const { getByText } = render(<TypeIndicator type="boolean" />);

    expect(getByText('✓')).toBeTruthy();
    expect(getByText('Boolean')).toBeTruthy();
  });

  it('renders date type with icon and label', () => {
    const { container, getByText } = render(<TypeIndicator type="date" />);
    const icon = container.querySelector('.iconify');

    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('data-icon')).toBe('carbon:calendar');
    expect(getByText('Date')).toBeTruthy();
  });

  it('renders datetime type with icon and label', () => {
    const { container, getByText } = render(<TypeIndicator type="datetime" />);
    const icon = container.querySelector('.iconify');

    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('data-icon')).toBe('ix:calendar');
    expect(getByText('DateTime')).toBeTruthy();
  });

  it('renders json type with symbol and label', () => {
    const { getByText } = render(<TypeIndicator type="json" />);

    expect(getByText('{}')).toBeTruthy();
    expect(getByText('JSON')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    const { container, queryByText } = render(<TypeIndicator type="string" showLabel={false} />);

    expect(queryByText('String')).toBeFalsy();
    expect(container.querySelector(`.${styles.indicator}`)).toBeTruthy();
  });

  it('applies correct size classes', () => {
    const { container: smallContainer } = render(<TypeIndicator type="string" size="small" />);
    const { container: mediumContainer } = render(<TypeIndicator type="string" size="medium" />);

    const smallIndicator = smallContainer.querySelector(`.${styles.typeIndicator}`);
    const mediumIndicator = mediumContainer.querySelector(`.${styles.typeIndicator}`);

    expect(smallIndicator?.classList.contains(styles.small)).toBe(true);
    expect(mediumIndicator?.classList.contains(styles.medium)).toBe(true);
  });
});
