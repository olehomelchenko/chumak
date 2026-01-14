import { Signal } from '@preact/signals';
import { JSX } from 'preact';

export interface SettingsDialogProps {
  theme: Signal<'chumak' | 'blues'>;
  rowLimit: Signal<number>;

  onThemeChange: (theme: 'chumak' | 'blues') => void;
  onRowLimitChange: (limit: number) => void;
}

export function SettingsDialog({
  theme,
  rowLimit,
  onThemeChange,
  onRowLimitChange,
}: SettingsDialogProps) {
  const handleRowLimitChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const val = parseInt(e.currentTarget.value, 10);
    if (!isNaN(val)) {
      onRowLimitChange(val);
    }
  };

  return (
    <div>
      {/* Color Scheme */}
      <div style={{ marginBottom: '2rem' }}>
        <label
          className="form-label"
          style={{
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: '1rem',
            display: 'block',
          }}
        >
          Color Scheme
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Chumak Theme */}
          <div
            onClick={() => onThemeChange('chumak')}
            style={{
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.2s',
              borderColor: theme.value === 'chumak' ? 'var(--color-cyan)' : 'var(--border-color)',
              background:
                theme.value === 'chumak' ? 'rgba(var(--color-cyan-rgb), 0.05)' : 'transparent',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid var(--color-midnight-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme.value === 'chumak' && (
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--color-midnight-blue)',
                  }}
                />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-dark-gray)' }}>Chumak</div>
              <div style={{ fontSize: '12px', color: 'var(--color-dark-gray)', opacity: 0.7 }}>
                Modern vibrant custom palette
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: '#1789fc' }}></div>
              <div style={{ width: '12px', height: '12px', background: '#fdb833' }}></div>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#f5f3f0',
                  border: '1px solid #ddd',
                }}
              ></div>
            </div>
          </div>

          {/* Blues Theme */}
          <div
            onClick={() => onThemeChange('blues')}
            style={{
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.2s',
              borderColor: theme.value === 'blues' ? 'var(--color-cyan)' : 'var(--border-color)',
              background:
                theme.value === 'blues' ? 'rgba(var(--color-cyan-rgb), 0.05)' : 'transparent',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid var(--color-midnight-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme.value === 'blues' && (
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--color-midnight-blue)',
                  }}
                />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-dark-gray)' }}>Blues (KSE)</div>
              <div style={{ fontSize: '12px', color: 'var(--color-dark-gray)', opacity: 0.7 }}>
                Classic KSE professional palette
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: '#003964' }}></div>
              <div style={{ width: '12px', height: '12px', background: '#00bbce' }}></div>
              <div style={{ width: '12px', height: '12px', background: '#a7c539' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Row Limit */}
      <div style={{ marginBottom: '2rem' }}>
        <label
          className="form-label"
          style={{
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: '0.5rem',
            display: 'block',
          }}
        >
          Preview Row Limit
        </label>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-dark-gray)',
            opacity: 0.7,
            marginBottom: '0.75rem',
          }}
        >
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
            style={{
              width: '100px',
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              fontSize: '14px',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-dark-gray)' }}>rows (10-10000)</span>
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          background: '#fff8e1',
          borderLeft: '4px solid #ffca28',
          fontSize: '13px',
          color: '#795548',
        }}
      >
        <strong>Note:</strong> Some interface elements use the primary theme color. The "Chumak"
        theme also uses custom typography and removes border radiuses for a sharper look.
      </div>
    </div>
  );
}
