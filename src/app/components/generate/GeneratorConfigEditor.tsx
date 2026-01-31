import { GeneratorType } from '../../services/GeneratorService';
import styles from '../TransformDialog.module.css';

interface GeneratorConfigEditorProps {
  type: GeneratorType;
  config: any;
  onUpdate: (updates: any) => void;
}

export function GeneratorConfigEditor({ type, config, onUpdate }: GeneratorConfigEditorProps) {
  if (type === 'numberSequence') {
    return <NumberSequenceConfig config={config} onUpdate={onUpdate} />;
  }

  if (type === 'dateSequence') {
    return <DateSequenceConfig config={config} onUpdate={onUpdate} />;
  }

  if (type === 'randomNumber') {
    return <RandomNumberConfig config={config} onUpdate={onUpdate} />;
  }

  if (type === 'randomDate') {
    return <RandomDateConfig config={config} onUpdate={onUpdate} />;
  }

  if (type === 'randomBoolean') {
    return <RandomBooleanConfig config={config} onUpdate={onUpdate} />;
  }

  if (type === 'randomCategory') {
    return <RandomCategoryConfig config={config} onUpdate={onUpdate} />;
  }

  return null;
}

interface ConfigProps {
  config: any;
  onUpdate: (updates: any) => void;
}

function NumberSequenceConfig({ config, onUpdate }: ConfigProps) {
  return (
    <div class={styles.configGrid}>
      <div class={styles.flex15}>
        <label class={styles.label}>Start *</label>
        <input
          type="text"
          inputmode="decimal"
          class={styles.input}
          value={config.start}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
              onUpdate({ start: val || '0' });
            }
          }}
          placeholder="0"
        />
      </div>
      <div class={styles.flex15}>
        <label class={styles.label}>Stop *</label>
        <input
          type="text"
          inputmode="decimal"
          class={styles.input}
          value={config.stop === undefined ? '' : config.stop}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
              onUpdate({ stop: val === '' ? undefined : val });
            }
          }}
          placeholder="e.g. 10.5"
        />
      </div>
      <div class={styles.flex15}>
        <label class={styles.label}>Step (opt)</label>
        <input
          type="text"
          inputmode="decimal"
          class={styles.input}
          value={config.step || ''}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
              onUpdate({ step: val || '1' });
            }
          }}
          placeholder="1"
        />
      </div>
      <div class={styles.flex1}>
        <label class={styles.label}>Decimals</label>
        <input
          type="number"
          class={styles.input}
          value={config.decimals}
          min="0"
          max="10"
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            onUpdate({ decimals: val === '' ? 0 : parseInt(val) || 0 });
          }}
        />
      </div>
    </div>
  );
}

function DateSequenceConfig({ config, onUpdate }: ConfigProps) {
  return (
    <>
      <div class={styles.configGrid}>
        <div class={styles.flex1}>
          <label class={styles.label}>Start Date *</label>
          <input
            type="text"
            class={styles.input}
            value={config.start}
            onInput={(e) => onUpdate({ start: (e.target as HTMLInputElement).value })}
            placeholder="YYYY-MM-DD HH:mm:ss"
          />
        </div>
        <div class={styles.flex1}>
          <label class={styles.label}>Stop Date *</label>
          <input
            type="text"
            class={styles.input}
            value={config.stop}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              onUpdate({ stop: val === '' ? undefined : val });
            }}
            placeholder="YYYY-MM-DD HH:mm:ss"
          />
        </div>
        <div class={styles.flex1}>
          <label class={styles.label}>Step (opt)</label>
          <input
            type="number"
            class={styles.input}
            value={config.increment || ''}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              onUpdate({ increment: val === '' ? 1 : parseInt(val) || 1 });
            }}
            placeholder="1"
          />
        </div>
      </div>
      <div class={styles.group} style={{ marginTop: '0.75rem' }}>
        <label class={styles.label}>Unit</label>
        <div class={styles.unitSelect}>
          {['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'].map((unit) => (
            <label key={unit} class={styles.radioLabel} style={{ padding: '0.25rem 0.75rem' }}>
              <input
                type="radio"
                name="unit"
                value={unit}
                checked={config.unit === unit}
                onChange={() => onUpdate({ unit })}
                style={{ display: 'none' }}
              />
              <span style={{ textTransform: 'capitalize' }}>{unit}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function RandomNumberConfig({ config, onUpdate }: ConfigProps) {
  return (
    <div class={styles.configGrid}>
      <div class={styles.flex1}>
        <label class={styles.label}>Min</label>
        <input
          type="text"
          inputmode="decimal"
          class={styles.input}
          value={config.min}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
              onUpdate({ min: val || '0' });
            }
          }}
        />
      </div>
      <div class={styles.flex1}>
        <label class={styles.label}>Max</label>
        <input
          type="text"
          inputmode="decimal"
          class={styles.input}
          value={config.max}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
              onUpdate({ max: val || '100' });
            }
          }}
        />
      </div>
      <div class={styles.flex1}>
        <label class={styles.label}>Decimals</label>
        <input
          type="number"
          class={styles.input}
          value={config.decimals}
          min="0"
          max="10"
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            onUpdate({ decimals: val === '' ? 0 : parseInt(val) || 0 });
          }}
        />
      </div>
    </div>
  );
}

function RandomDateConfig({ config, onUpdate }: ConfigProps) {
  return (
    <div class={styles.configGrid}>
      <div class={styles.flex1}>
        <label class={styles.label}>From</label>
        <input
          type="text"
          class={styles.input}
          value={config.from}
          onInput={(e) => onUpdate({ from: (e.target as HTMLInputElement).value })}
          placeholder="YYYY-MM-DD"
        />
      </div>
      <div class={styles.flex1}>
        <label class={styles.label}>To</label>
        <input
          type="text"
          class={styles.input}
          value={config.to}
          onInput={(e) => onUpdate({ to: (e.target as HTMLInputElement).value })}
          placeholder="YYYY-MM-DD"
        />
      </div>
    </div>
  );
}

function RandomBooleanConfig({ config, onUpdate }: ConfigProps) {
  return (
    <div class={styles.group}>
      <label class={styles.label}>True Probability (0-1)</label>
      <input
        type="text"
        inputmode="decimal"
        class={styles.input}
        value={config.trueProbability}
        onInput={(e) => {
          const val = (e.target as HTMLInputElement).value;
          if (val === '' || /^\d*\.?\d*$/.test(val)) {
            onUpdate({
              trueProbability: val === '' ? 0.5 : val,
            });
          }
        }}
      />
    </div>
  );
}

function RandomCategoryConfig({ config, onUpdate }: ConfigProps) {
  return (
    <div class={styles.group}>
      <label class={styles.label}>Values (comma-separated)</label>
      <input
        type="text"
        class={styles.input}
        value={config.values.join(', ')}
        onInput={(e) => {
          const values = (e.target as HTMLInputElement).value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v !== '');
          onUpdate({ values });
        }}
        placeholder="A, B, C"
      />
    </div>
  );
}
