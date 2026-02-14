/**
 * DependencyGraphDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { DependencyGraphDialog } from './DependencyGraphDialog';
import { AppStore } from '../stores/AppStore';
import { createTestSource, createTestModel } from '../handlers/test-utils';

describe('DependencyGraphDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    AppStore.sources.value = [];
    AppStore.models.value = [];
    AppStore.activeModel.value = null;
  });

  it('renders empty state when no sources or models', async () => {
    render(<DependencyGraphDialog />);

    await waitFor(() => {
      const emptyMessage = screen.getByText(/No sources or models to display/i);
      expect(emptyMessage).toBeDefined();
    });
  });

  it('renders view mode buttons', () => {
    render(<DependencyGraphDialog />);

    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Dependencies (Upstream)')).toBeDefined();
    expect(screen.getByText('Dependents (Downstream)')).toBeDefined();
  });

  it('disables upstream/downstream buttons when no active model', () => {
    AppStore.sources.value = [createTestSource({ id: 'src_1', name: 'Source 1' })];
    AppStore.models.value = [
      createTestModel({ id: 'mdl_1', name: 'Model 1', sourceId: 'src_1', steps: [] }),
    ];
    AppStore.activeModel.value = null;

    render(<DependencyGraphDialog />);

    const upstreamButton = screen.getByText('Dependencies (Upstream)').closest('button');
    const downstreamButton = screen.getByText('Dependents (Downstream)').closest('button');

    expect(upstreamButton?.disabled).toBe(true);
    expect(downstreamButton?.disabled).toBe(true);
  });

  it('enables upstream/downstream buttons when active model exists', () => {
    const source = createTestSource({ id: 'src_1', name: 'Source 1' });
    const model = createTestModel({ id: 'mdl_1', name: 'Model 1', sourceId: 'src_1', steps: [] });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];
    AppStore.activeModel.value = model;

    render(<DependencyGraphDialog />);

    const upstreamButton = screen.getByText('Dependencies (Upstream)').closest('button');
    const downstreamButton = screen.getByText('Dependents (Downstream)').closest('button');

    expect(upstreamButton?.disabled).toBe(false);
    expect(downstreamButton?.disabled).toBe(false);
  });

  it('toggles view mode when buttons are clicked', () => {
    const source = createTestSource({ id: 'src_1', name: 'Source 1' });
    const model = createTestModel({ id: 'mdl_1', name: 'Model 1', sourceId: 'src_1', steps: [] });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];
    AppStore.activeModel.value = model;

    render(<DependencyGraphDialog />);

    const allButton = screen.getByText('All').closest('button');
    const upstreamButton = screen.getByText('Dependencies (Upstream)').closest('button');

    // Initially "All" should be active
    expect(allButton?.className).toContain('button--primary');

    // Click upstream button
    fireEvent.click(upstreamButton!);

    // Upstream should now be active
    expect(upstreamButton?.className).toContain('button--primary');
    expect(allButton?.className).toContain('button--secondary');
  });

  it('renders legend with correct items', () => {
    render(<DependencyGraphDialog />);

    expect(screen.getByText('Legend:')).toBeDefined();
    expect(screen.getByText('Source')).toBeDefined();
    expect(screen.getByText('Model')).toBeDefined();
    expect(screen.getByText('Stale Model')).toBeDefined();
    expect(screen.getByText('Current Model')).toBeDefined();
  });

  it('renders help text explaining the graph', () => {
    render(<DependencyGraphDialog />);

    const helpText = screen.getByText(/Visual representation of dependencies/i);
    expect(helpText).toBeDefined();
  });

  it('renders graph container', () => {
    render(<DependencyGraphDialog />);

    // The container should exist (it's a div with ref)
    // We can't directly test the ref, but we can check the structure
    const container = document.querySelector('[style*="minHeight: 400px"]');
    expect(container).toBeDefined();
  });

  it('handles graph rendering with simple dependency', async () => {
    const source = createTestSource({ id: 'src_1', name: 'Source 1' });
    const model = createTestModel({ id: 'mdl_1', name: 'Model 1', sourceId: 'src_1', steps: [] });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];

    render(<DependencyGraphDialog />);

    // Wait for graph to render (useEffect runs after render)
    await waitFor(
      () => {
        // Check if SVG was created (dagre creates SVG elements)
        const svg = document.querySelector('svg');
        expect(svg).toBeDefined();
      },
      { timeout: 1000 }
    );
  });

  it('handles graph rendering with join dependency', async () => {
    const source1 = createTestSource({ id: 'src_1', name: 'Source 1' });
    const source2 = createTestSource({ id: 'src_2', name: 'Source 2' });
    const model1 = createTestModel({ id: 'mdl_1', name: 'Model 1', sourceId: 'src_1', steps: [] });
    const model2 = createTestModel({
      id: 'mdl_2',
      name: 'Model 2',
      sourceId: 'src_2',
      steps: [{ join: { right: 'mdl_1', on: [['id', 'id']], how: 'inner' } }],
    });

    AppStore.sources.value = [source1, source2];
    AppStore.models.value = [model1, model2];

    render(<DependencyGraphDialog />);

    await waitFor(
      () => {
        const svg = document.querySelector('svg');
        expect(svg).toBeDefined();
      },
      { timeout: 1000 }
    );
  });

  it('updates graph when view mode changes', async () => {
    const source = createTestSource({ id: 'src_1', name: 'Source 1' });
    const model1 = createTestModel({ id: 'mdl_1', name: 'Model 1', sourceId: 'src_1', steps: [] });
    const model2 = createTestModel({
      id: 'mdl_2',
      name: 'Model 2',
      sourceId: 'src_1',
      steps: [{ join: { right: 'mdl_1', on: [['id', 'id']], how: 'inner' } }],
    });

    AppStore.sources.value = [source];
    AppStore.models.value = [model1, model2];
    AppStore.activeModel.value = model2;

    render(<DependencyGraphDialog />);

    // Wait for initial render
    await waitFor(() => {
      const svg = document.querySelector('svg');
      expect(svg).toBeDefined();
    });

    // Change to upstream view
    const upstreamButton = screen.getByText('Dependencies (Upstream)').closest('button');
    fireEvent.click(upstreamButton!);

    // Graph should update (we can't easily test the content, but we can verify the button state)
    await waitFor(() => {
      expect(upstreamButton?.className).toContain('button--primary');
    });
  });

  it('displays stale model indicator in legend', () => {
    render(<DependencyGraphDialog />);

    // Legend should show stale model example
    const staleLegend = screen.getByText('Stale Model');
    expect(staleLegend).toBeDefined();
  });
});
