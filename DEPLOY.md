# Portfolio Auto-Update System
## Deployment & Integration Guide

---

## Repository Structure

```
portfolio/
├── index.html                    ← Main page (modified or use as reference)
├── css/
│   ├── style.css                 ← Your existing styles (keep as-is)
│   └── projects.css              ← NEW: project cards, filters, skeletons
├── js/
│   ├── github-api.js             ← NEW: GitHub API fetching + caching
│   └── projects.js               ← NEW: DOM rendering + filtering + search
└── PROJECTS_SECTION_SNIPPET.html ← Drop-in snippet (reference)
```

---

## Integration Steps

### If you have an existing index.html (most common case):

**Step 1 — Add to `<head>`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="css/projects.css">
```

**Step 2 — Paste the projects section into `<body>`:**
Open `PROJECTS_SECTION_SNIPPET.html` and copy the `<section id="projects">` block.
Place it where you want the projects to appear.

**Step 3 — Add scripts before `</body>`:**
```html
<script src="js/github-api.js"></script>
<script src="js/projects.js"></script>
```

**Step 4 — Copy the new files:**
```
css/projects.css  →  your repo's css/ directory
js/github-api.js  →  your repo's js/ directory
js/projects.js    →  your repo's js/ directory
```

---

### If starting fresh:

Replace your `index.html` entirely with the provided `index.html`.
All other files are already referenced correctly.

---

## How to Showcase a Repository

The system only shows repositories tagged with the **`portfolio`** topic.

To add a repo to your portfolio:
1. Go to `https://github.com/ahsanurrahman-sayem/<repo-name>`
2. Click the gear icon next to "About"
3. Under **Topics**, type `portfolio` and press Enter
4. Save changes

The repo will appear on your portfolio **automatically** on the next page load.
No code changes needed. No rebuild. No deployment.

---

## Caching Behavior

- Fetched data is cached in `sessionStorage` for **10 minutes**
- On cache hit: renders instantly from cache
- On cache miss: fetches live from GitHub API
- Cache key: `gh_repos_ahsanurrahman-sayem`
- To force a refresh: clear sessionStorage or open in a new tab after 10min

---

## Rate Limiting

GitHub's unauthenticated API allows **60 requests/hour** per IP.
Each page load uses:
- 1 request for the repos list
- N requests for topics (batched in groups of 6)

For a typical portfolio with ~10 repos: ~3 requests total.
The 10-minute cache prevents repeated hits.

If rate limited, the user sees a clear error banner with reset time.

---

## Filtering System

- **Language filter**: buttons auto-generated from your repos' languages
- **Search**: real-time search on repo name + description (200ms debounce)
- **Filters combine**: language filter + search work simultaneously
- **Empty state**: shows a "clear filters" button if nothing matches

---

## ARIA & Accessibility

- Grid has `role="list"` + `aria-live="polite"` for screen reader updates
- Error banner has `role="alert"`
- Count has `aria-live="polite"` + `aria-atomic="true"`
- All interactive elements have proper `aria-label` attributes
- Keyboard navigable
- `prefers-reduced-motion` disables all animations

---

## Push to GitHub Pages

```zsh
# In iSH / your terminal
cd ~/portfolio

git add .
git commit -m "feat: add auto-updating GitHub projects section"
git push origin main
```

GitHub Pages will serve the updated site within ~30 seconds.

---

## Verify It Works

Open browser DevTools → Network tab → reload the page.
You should see:
1. `GET /users/ahsanurrahman-sayem/repos` → 200 OK
2. `GET /repos/ahsanurrahman-sayem/<name>/topics` × N → 200 OK
3. Cards appearing with staggered animation

If you see 403: wait for rate limit reset (shown in error banner).

---

## Customization Quick Reference

| What to change         | Where                              |
|------------------------|------------------------------------|
| Color scheme           | `css/projects.css` → `:root` vars  |
| Cache duration         | `js/github-api.js` → `CACHE_TTL_MS` |
| Max topic labels/card  | `js/projects.js` → `.slice(0, 4)` |
| Skeleton count         | `js/projects.js` → `showSkeletons(6)` |
| Language colors        | `js/projects.js` → `LANG_COLORS`  |
| Filter topic           | `js/github-api.js` → `'portfolio'` |
