---
name: release
description: Bump the app version, update CHANGELOG, and prepare a git tag for release
disable-model-invocation: true
---

# Release

Bump the app version, update CHANGELOG.md, and prepare a git tag.

## Process

### 1. Determine what changed since the last version

Run `git log` from the last version tag (or all history if no tags exist) and review the changes. Categorize:

- **Features**: New user-facing capabilities
- **Fixes**: Bug fixes
- **Improvements**: Performance, UX polish, refactoring that affects behavior
- **Internal**: Refactoring, docs, tests, build changes (don't list individually — summarize if substantial)

### 2. Determine bump type

Read the current version from `package.json`.

The project uses **simplified semver during pre-1.0**:

| Bump                | When                                                                | Example           |
| ------------------- | ------------------------------------------------------------------- | ----------------- |
| **Minor** (`0.x.0`) | New features, UI changes, behavior changes, workflow format changes | `0.2.0` → `0.3.0` |
| **Patch** (`0.x.y`) | Bug fixes, polish, performance, internal improvements               | `0.2.0` → `0.2.1` |
| **Major** (`1.0.0`) | Only when declaring public stability (user decision)                | —                 |

Present the categorized changes and your recommended bump type to the user for confirmation before proceeding.

### 3. Update version

Update the `version` field in `package.json`. This is the **single source of truth** — Vite injects it as `__APP_VERSION__` at build time.

### 4. Update CHANGELOG

Add a new section to `docs/CHANGELOG.md` under the appropriate month heading. Follow the existing format:

- Group by feature/change, not by commit
- Lead with the name in bold, then a dash and description
- Most important changes first
- Don't list every commit — summarize related changes into coherent items

If the current month already has entries, add a version separator:

```markdown
## March 2026

### v0.3.0

- **New feature** — Description...

### v0.2.1

- **Bug fix** — Description...
```

### 5. Suggest git tag

After the user stages and commits the version bump, suggest:

```bash
git tag v{version}
git push --tags
```

Remind the user that pushing to `main` triggers the GitHub Actions deploy automatically.

## Rules

- **Never bump version without user confirmation** on the bump type
- **Never stage or commit** — the user handles git operations
- The workflow format `formatVersion` is independent of the app version — only bump it when the workflow schema actually changes
- Version is displayed in: Settings dialog, exported workflow JSON (`sytoVersion` field)
