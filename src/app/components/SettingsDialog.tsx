import { DialogStore } from '../stores/DialogStore';
import formStyles from './form-controls.module.css';
import settingsStyles from './SettingsDialog.module.css';
const styles = { ...formStyles, ...settingsStyles };
import { useTranslation } from 'preact-i18next';

// Props interface kept for reference/testing
export interface SettingsDialogProps {
  onThemeChange?: (theme: 'syto' | 'blues') => void;
  onRowLimitChange?: (limit: number) => void;
  onAnalyticsOptOutChange?: (optOut: boolean) => void;
  onLanguageChange?: (language: 'en' | 'uk') => void;
  onEngineChange?: (engine: 'arquero' | 'duckdb') => void;
  onClearAllData?: () => void;
}

export function SettingsDialog({
  onThemeChange,
  onRowLimitChange,
  onAnalyticsOptOutChange,
  onLanguageChange,
  onEngineChange,
  onClearAllData,
}: SettingsDialogProps = {}) {
  const { t } = useTranslation('settings');
  const { theme, rowLimit, analyticsOptOut, language, engine } = DialogStore.settingsState;

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

  const handleAnalyticsOptOutChange = (e: Event) => {
    const optOut = (e.target as HTMLInputElement).checked;
    analyticsOptOut.value = optOut;
    if (onAnalyticsOptOutChange) {
      onAnalyticsOptOutChange(optOut);
    }
  };

  const handleLanguageChange = (newLang: 'en' | 'uk') => {
    language.value = newLang;
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  const handleEngineChange = (newEngine: 'arquero' | 'duckdb') => {
    engine.value = newEngine;
    if (onEngineChange) {
      onEngineChange(newEngine);
    }
  };

  return (
    <div>
      {/* Language Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <label class={styles.label} style={{ marginBottom: '1rem', display: 'block' }}>
          {t('language.label')}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* English */}
          <div
            onClick={() => handleLanguageChange('en')}
            class={`${styles.themeOption} ${language.value === 'en' ? styles.active : ''}`}
          >
            <div class={styles.radioCircle}>
              {language.value === 'en' && <div class={styles.radioDot} />}
            </div>
            <div>
              <div class={styles.themeName}>English</div>
            </div>
          </div>

          {/* Ukrainian */}
          <div
            onClick={() => handleLanguageChange('uk')}
            class={`${styles.themeOption} ${language.value === 'uk' ? styles.active : ''}`}
          >
            <div class={styles.radioCircle}>
              {language.value === 'uk' && <div class={styles.radioDot} />}
            </div>
            <div>
              <div class={styles.themeName}>Українська</div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Scheme */}
      <div style={{ marginBottom: '2rem' }}>
        <label class={styles.label} style={{ marginBottom: '1rem', display: 'block' }}>
          {t('theme.label')}
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
              <div class={styles.themeName}>{t('theme.syto.name')}</div>
              <div class={styles.themeDesc}>{t('theme.syto.description')}</div>
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
              <div class={styles.themeName}>{t('theme.blues.name')}</div>
              <div class={styles.themeDesc}>{t('theme.blues.description')}</div>
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
          {t('preview.label')}
        </label>
        <div class={styles.helpText} style={{ marginBottom: '0.75rem' }}>
          {t('preview.description')}
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
          <span style={{ fontSize: '13px', color: 'var(--color-dark-gray)' }}>
            {t('preview.range')}
          </span>
        </div>
      </div>

      {/* Analytics Opt-Out */}
      <div style={{ marginBottom: '2rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={analyticsOptOut.value}
            onChange={handleAnalyticsOptOutChange}
            style={{ marginTop: '0.25rem', cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{t('analytics.label')}</div>
            <div class={styles.helpText} style={{ fontSize: '0.875rem' }}>
              {t('analytics.description')}
            </div>
          </div>
        </label>
      </div>

      {/* Experimental: Transform Engine */}
      <div style={{ marginBottom: '2rem' }}>
        <label class={styles.label} style={{ marginBottom: '0.5rem', display: 'block' }}>
          {t('experimental.label')}
        </label>
        <div class={styles.helpText} style={{ marginBottom: '0.75rem' }}>
          {t('experimental.description')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            onClick={() => handleEngineChange('arquero')}
            class={`${styles.themeOption} ${engine.value === 'arquero' ? styles.active : ''}`}
          >
            <div class={styles.radioCircle}>
              {engine.value === 'arquero' && <div class={styles.radioDot} />}
            </div>
            <div>
              <div class={styles.themeName}>{t('experimental.arquero.name')}</div>
              <div class={styles.themeDesc}>{t('experimental.arquero.description')}</div>
            </div>
          </div>

          <div
            onClick={() => handleEngineChange('duckdb')}
            class={`${styles.themeOption} ${engine.value === 'duckdb' ? styles.active : ''}`}
          >
            <div class={styles.radioCircle}>
              {engine.value === 'duckdb' && <div class={styles.radioDot} />}
            </div>
            <div>
              <div class={styles.themeName}>{t('experimental.duckdb.name')}</div>
              <div class={styles.themeDesc}>{t('experimental.duckdb.description')}</div>
            </div>
          </div>
        </div>
      </div>

      <div class={styles.noteBox}>
        <strong>Note:</strong> {t('note')}
      </div>

      {/* Danger Zone */}
      {onClearAllData && (
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: 'var(--color-dark-red)',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            {t('dangerZone.title')}
          </div>
          <div class={styles.helpText} style={{ marginBottom: '0.75rem' }}>
            {t('dangerZone.description')}
          </div>
          <button
            class="button button--secondary button--small"
            style={{ color: 'var(--color-dark-red)', borderColor: 'var(--color-dark-red)' }}
            onClick={onClearAllData}
          >
            {t('dangerZone.button')}
          </button>
        </div>
      )}

      {/* Version */}
      <div
        style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--color-dark-gray)',
        }}
      >
        {t('version')} {__APP_VERSION__}
      </div>
    </div>
  );
}
