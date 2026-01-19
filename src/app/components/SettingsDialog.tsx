import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';

// Props interface kept for reference/testing
export interface SettingsDialogProps {
  onThemeChange?: (theme: 'syto' | 'blues') => void;
  onRowLimitChange?: (limit: number) => void;
}

export function SettingsDialog({ onThemeChange, onRowLimitChange }: SettingsDialogProps = {}) {
  const { theme, rowLimit } = DialogStore.settingsState;

  const handleThemeChange = (newTheme: 'syto' | 'blues') => {
    theme.value = newTheme;
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const handleRowLimitChange = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      rowLimit.value = val;
      if (onRowLimitChange) {
        onRowLimitChange(val);
      }
    }
  };

  return (
    <div>
      {/* Color Scheme */}
      <div style={{ marginBottom: '2rem' }}>
        <label class={styles.label} style={{ marginBottom: '1rem', display: 'block' }}>
          Color Scheme
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Syto Theme */}
          <div
            onClick={() => handleThemeChange('syto')}
            class={`${styles.themeOption} ${theme.value === 'syto' ? styles.active : ''}`}
          >
            <div class={styles.radioCircle}>
              {theme.value === 'syto' && <div class={styles.radioDot} />}
            </div>
            <div>
              <div class={styles.themeName}>Syto</div>
              <div class={styles.themeDesc}>Modern vibrant custom palette</div>
            </div>
            <div class={styles.swatchGrid}>
              <div class={styles.colorSwatch} style={{ background: '#1789fc' }}></div>
              <div class={styles.colorSwatch} style={{ background: '#fdb833' }}></div>
              <div
                class={styles.colorSwatch}
                style={{
                  background: '#f5f3f0',
                  border: '1px solid #ddd',
                }}
              ></div>
            </div>
          </div>

          {/* Blues Theme */}
          <div
            onClick={() => handleThemeChange('blues')}
            class={`${styles.themeOption} ${theme.value === 'blues' ? styles.active : ''}`}
          >
            <div class={styles.radioCircle}>
              {theme.value === 'blues' && <div class={styles.radioDot} />}
            </div>
            <div>
              <div class={styles.themeName}>Blues (KSE)</div>
              <div class={styles.themeDesc}>Classic KSE professional palette</div>
            </div>
            <div class={styles.swatchGrid}>
              <div class={styles.colorSwatch} style={{ background: '#003964' }}></div>
              <div class={styles.colorSwatch} style={{ background: '#00bbce' }}></div>
              <div class={styles.colorSwatch} style={{ background: '#a7c539' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Row Limit */}
      <div style={{ marginBottom: '2rem' }}>
        <label class={styles.label} style={{ marginBottom: '0.5rem', display: 'block' }}>
          Preview Row Limit
        </label>
        <div class={styles.helpText} style={{ marginBottom: '0.75rem' }}>
          Maximum number of rows to show in transform previews. Higher values may slow down previews
          for complex expressions.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="number"
            min="10"
            max="10000"
            step="10"
            value={rowLimit.value}
            onInput={handleRowLimitChange}
            class={styles.input}
            style={{ width: '100px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-dark-gray)' }}>rows (10-10000)</span>
        </div>
      </div>

      <div class={styles.noteBox}>
        <strong>Note:</strong> Some interface elements use the primary theme color. The "Syto" theme
        also uses custom typography and removes border radiuses for a sharper look.
      </div>
    </div>
  );
}
