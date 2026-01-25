import { DialogStore } from '../stores/DialogStore';
import { GeneratorService, GeneratorType } from '../services/GeneratorService';
import styles from './TransformDialog.module.css';

export function GenerateDialog() {
  const { sourceName, rowCount, generators, error } = DialogStore.generateState;

  const addColumn = () => {
    const newId = `gen_${Date.now()}`;
    const newGen = {
      id: newId,
      name: `column_${generators.value.length + 1}`,
      type: 'integerSequence' as GeneratorType,
      config: GeneratorService.getDefaultConfig('integerSequence'),
    };
    generators.value = [...generators.value, newGen];
  };

  const removeColumn = (id: string) => {
    generators.value = generators.value.filter((g) => g.id !== id);
  };

  const updateGenerator = (id: string, updates: Partial<(typeof generators.value)[0]>) => {
    generators.value = generators.value.map((g) => (g.id === id ? { ...g, ...updates } : g));
  };

  const updateGeneratorType = (id: string, newType: GeneratorType) => {
    const newConfig = GeneratorService.getDefaultConfig(newType);
    updateGenerator(id, { type: newType, config: newConfig });
  };

  const updateConfig = (id: string, configUpdates: any) => {
    generators.value = generators.value.map((g) =>
      g.id === id ? { ...g, config: { ...g.config, ...configUpdates } } : g
    );
  };

  const renderConfigFields = (gen: (typeof generators.value)[0]) => {
    const { type, config } = gen;

    switch (type) {
      case 'integerSequence':
        return (
          <>
            <div class={styles.group} style={{ marginTop: '0.5rem' }}>
              <label class={styles.label}>Start:</label>
              <input
                type="number"
                class={styles.input}
                value={config.start}
                onInput={(e) =>
                  updateConfig(gen.id, {
                    start: parseInt((e.target as HTMLInputElement).value) || 0,
                  })
                }
              />
            </div>
            <div class={styles.group}>
              <label class={styles.label}>Step:</label>
              <input
                type="number"
                class={styles.input}
                value={config.step}
                onInput={(e) =>
                  updateConfig(gen.id, {
                    step: parseInt((e.target as HTMLInputElement).value) || 1,
                  })
                }
              />
            </div>
          </>
        );

      case 'dateSequence':
        return (
          <>
            <div class={styles.group} style={{ marginTop: '0.5rem' }}>
              <label class={styles.label}>Start Date:</label>
              <input
                type="date"
                class={styles.input}
                value={config.start}
                onInput={(e) =>
                  updateConfig(gen.id, { start: (e.target as HTMLInputElement).value })
                }
              />
            </div>
            <div class={styles.group}>
              <label class={styles.label}>Increment:</label>
              <input
                type="number"
                class={styles.input}
                value={config.increment}
                onInput={(e) =>
                  updateConfig(gen.id, {
                    increment: parseInt((e.target as HTMLInputElement).value) || 1,
                  })
                }
              />
            </div>
            <div class={styles.group}>
              <label class={styles.label}>Unit:</label>
              <select
                class={styles.input}
                value={config.unit}
                onChange={(e) =>
                  updateConfig(gen.id, { unit: (e.target as HTMLSelectElement).value })
                }
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </>
        );

      case 'randomNumber':
        return (
          <>
            <div class={styles.group} style={{ marginTop: '0.5rem' }}>
              <label class={styles.label}>Min:</label>
              <input
                type="number"
                class={styles.input}
                value={config.min}
                onInput={(e) =>
                  updateConfig(gen.id, {
                    min: parseFloat((e.target as HTMLInputElement).value) || 0,
                  })
                }
              />
            </div>
            <div class={styles.group}>
              <label class={styles.label}>Max:</label>
              <input
                type="number"
                class={styles.input}
                value={config.max}
                onInput={(e) =>
                  updateConfig(gen.id, {
                    max: parseFloat((e.target as HTMLInputElement).value) || 100,
                  })
                }
              />
            </div>
            <div class={styles.group}>
              <label class={styles.label}>Decimals:</label>
              <input
                type="number"
                class={styles.input}
                value={config.decimals}
                min="0"
                max="10"
                onInput={(e) =>
                  updateConfig(gen.id, {
                    decimals: parseInt((e.target as HTMLInputElement).value) || 0,
                  })
                }
              />
            </div>
          </>
        );

      case 'randomDate':
        return (
          <>
            <div class={styles.group} style={{ marginTop: '0.5rem' }}>
              <label class={styles.label}>From:</label>
              <input
                type="date"
                class={styles.input}
                value={config.from}
                onInput={(e) =>
                  updateConfig(gen.id, { from: (e.target as HTMLInputElement).value })
                }
              />
            </div>
            <div class={styles.group}>
              <label class={styles.label}>To:</label>
              <input
                type="date"
                class={styles.input}
                value={config.to}
                onInput={(e) => updateConfig(gen.id, { to: (e.target as HTMLInputElement).value })}
              />
            </div>
          </>
        );

      case 'randomBoolean':
        return (
          <div class={styles.group} style={{ marginTop: '0.5rem' }}>
            <label class={styles.label}>True Probability (0-1):</label>
            <input
              type="number"
              class={styles.input}
              value={config.trueProbability}
              min="0"
              max="1"
              step="0.1"
              onInput={(e) =>
                updateConfig(gen.id, {
                  trueProbability: parseFloat((e.target as HTMLInputElement).value) || 0.5,
                })
              }
            />
          </div>
        );

      case 'randomCategory':
        return (
          <div class={styles.group} style={{ marginTop: '0.5rem' }}>
            <label class={styles.label}>Values (comma-separated):</label>
            <input
              type="text"
              class={styles.input}
              value={config.values.join(', ')}
              onInput={(e) => {
                const values = (e.target as HTMLInputElement).value
                  .split(',')
                  .map((v) => v.trim())
                  .filter((v) => v !== '');
                updateConfig(gen.id, { values });
              }}
              placeholder="A, B, C"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>Source Name:</label>
        <input
          type="text"
          class={styles.input}
          value={sourceName.value}
          onInput={(e) => (sourceName.value = (e.target as HTMLInputElement).value)}
          placeholder="generated_data"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Number of Rows:</label>
        <input
          type="number"
          class={styles.input}
          value={rowCount.value}
          onInput={(e) => (rowCount.value = parseInt((e.target as HTMLInputElement).value) || 100)}
          min="1"
          max="100000"
          placeholder="100"
        />
        <p class={styles.helpText}>Maximum: 100,000 rows</p>
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Columns:</label>
        <div style={{ marginTop: '0.5rem' }}>
          {generators.value.map((gen, index) => (
            <div
              key={gen.id}
              style={{
                border: '1px solid var(--color-light-gray)',
                borderRadius: '4px',
                padding: '1rem',
                marginBottom: '0.75rem',
                backgroundColor: 'var(--color-off-white)',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                  Column {index + 1}
                </h4>
                {generators.value.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeColumn(gen.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-red)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                    title="Remove column"
                  >
                    <span class="iconify" data-icon="carbon:close"></span>
                  </button>
                )}
              </div>

              <div class={styles.group} style={{ marginTop: '0.75rem' }}>
                <label class={styles.label}>Column Name:</label>
                <input
                  type="text"
                  class={styles.input}
                  value={gen.name}
                  onInput={(e) =>
                    updateGenerator(gen.id, { name: (e.target as HTMLInputElement).value })
                  }
                  placeholder="column_name"
                />
              </div>

              <div class={styles.group}>
                <label class={styles.label}>Generator Type:</label>
                <select
                  class={styles.input}
                  value={gen.type}
                  onChange={(e) =>
                    updateGeneratorType(
                      gen.id,
                      (e.target as HTMLSelectElement).value as GeneratorType
                    )
                  }
                >
                  <option value="integerSequence">Integer Sequence</option>
                  <option value="dateSequence">Date Sequence</option>
                  <option value="randomNumber">Random Number</option>
                  <option value="randomDate">Random Date</option>
                  <option value="randomBoolean">Random Boolean</option>
                  <option value="randomCategory">Random Category</option>
                </select>
              </div>

              {renderConfigFields(gen)}
            </div>
          ))}

          <button
            type="button"
            onClick={addColumn}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px dashed var(--color-medium-gray)',
              borderRadius: '4px',
              background: 'transparent',
              color: 'var(--color-cyan)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
            }}
          >
            <span class="iconify" data-icon="carbon:add"></span>
            <span>Add Column</span>
          </button>
        </div>
      </div>

      {error.value && (
        <div class={styles.error}>
          <span class="iconify" data-icon="carbon:warning"></span>
          <span>{error.value}</span>
        </div>
      )}
    </div>
  );
}
