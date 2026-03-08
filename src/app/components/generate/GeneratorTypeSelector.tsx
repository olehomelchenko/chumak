import type { Signal } from '@preact/signals';
import { GeneratorType } from '../../services/GeneratorService';
import formStyles from '../form-controls.module.css';
import genStyles from '../GenerateDialog.module.css';
const styles = { ...formStyles, ...genStyles };

const generatorIcons: Record<GeneratorType, string> = {
  numberSequence: 'carbon:list-number',
  dateSequence: 'carbon:calendar',
  randomNumber: 'carbon:help',
  randomDate: 'carbon:calendar-tools',
  randomBoolean: 'carbon:boolean',
  randomCategory: 'carbon:direction-loop',
};

const generatorLabels: Record<GeneratorType, string> = {
  numberSequence: 'Number Sequence',
  dateSequence: 'Date Sequence',
  randomNumber: 'Random Number',
  randomDate: 'Random Date',
  randomBoolean: 'Random Boolean',
  randomCategory: 'Random Category',
};

const GENERATOR_TYPES: GeneratorType[] = [
  'numberSequence',
  'dateSequence',
  'randomNumber',
  'randomDate',
  'randomBoolean',
  'randomCategory',
];

interface GeneratorTypeSelectorProps {
  type: Signal<string>;
  onChange: (type: GeneratorType) => void;
}

export function GeneratorTypeSelector({ type, onChange }: GeneratorTypeSelectorProps) {
  return (
    <div class={styles.group}>
      <label class={styles.label}>Generator Type</label>
      <div class={styles.grid3} style={{ marginBottom: '1rem' }}>
        {GENERATOR_TYPES.map((t) => (
          <label key={t} class={styles.radioLabelCentered}>
            <input
              type="radio"
              name="generatorType"
              value={t}
              checked={type.value === t}
              onChange={() => onChange(t)}
              style={{ display: 'none' }}
            />
            <span class="iconify" data-icon={generatorIcons[t]} style={{ fontSize: '16px' }}></span>
            <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{generatorLabels[t]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
