# Analytics Setup - GoatCounter

Syto uses [GoatCounter](https://www.goatcounter.com/) for privacy-respecting web analytics. GoatCounter is:

- **Privacy-respecting**: No cookies, no personal data collection
- **GDPR-compliant**: Complies with GDPR and other privacy regulations
- **Transparent**: Supports public dashboards for full transparency
- **Lightweight**: Minimal performance impact

## Setup

The GoatCounter script is already configured in `index.html` and will automatically load in production builds only.

## User Opt-Out

Users can opt out of analytics at any time through the Settings dialog:

1. Open **Settings** from the header menu
2. Check the **"Opt out of analytics"** checkbox
3. The preference is saved locally in your browser
4. Analytics will stop loading immediately

The opt-out preference is stored in `localStorage` and persists across sessions. Users can re-enable analytics by unchecking the option in Settings.

### Enable Public Dashboard (Transparency)

To make analytics transparent and publicly accessible:

1. Log into your GoatCounter dashboard
2. Go to **Settings** → **Paths**
3. Enable **"Public dashboard"** option
4. The dashboard will be accessible at: `https://yoursite.goatcounter.com/`

This allows anyone to view the analytics data, ensuring full transparency about what data is being collected.

### Verify Installation

After building for production, the GoatCounter script will be automatically loaded. You can verify by:

1. Building the production bundle: `npm run build`
2. Checking `dist/index.html` for the GoatCounter script tag
3. The script only appears in production builds, not in development

## How It Works

- The GoatCounter script is embedded in `index.html` with a production check
- It only runs in **production builds** (not in development)
- Before loading, it checks the user's opt-out preference in `localStorage`
- If the user has opted out, the script is not loaded
- The script is loaded asynchronously and doesn't block page rendering
- No cookies are set, and the service respects Do Not Track headers

## Privacy Considerations

GoatCounter collects minimal data:

- Page views (URLs)
- Referrers
- Browser and device information (for compatibility analysis)
- Screen size (for responsive design insights)

No personal information, IP addresses (hashed), or user behavior tracking is collected.

## Changing the GoatCounter Site

To change the GoatCounter site code, edit the `data-goatcounter` attribute in `index.html`:

```html
script.setAttribute('data-goatcounter', 'https://your-site.goatcounter.com/count');
```

## Development

Analytics are **never** active during development (`npm run dev`). They only appear in production builds.
