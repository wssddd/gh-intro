# gh-intro

> A Claude.ai-inspired GitHub introduction page generator — paste any public repo URL and get a beautiful, print-ready project page instantly.

![gh-intro long screenshot](assets/screenshot.png)

---

## What it does

**gh-intro** is a zero-dependency static site that generates a polished introduction page for any GitHub repository. Paste a URL, hit Generate — the page fetches live data from the GitHub API and re-renders every section: hero banner, stats, about cards, language bar, screenshots, architecture, quick start, and footer.

The design is inspired by [Claude.ai](https://claude.ai)'s warm cream + terracotta aesthetic.

---

## Features

| Feature | Detail |
|---|---|
| **GitHub URL Generator** | Paste any `github.com/owner/repo` and regenerate the page with live API data |
| **Live Stats** | Stars, forks, open issues, contributors — animated counters |
| **Language Bar** | Proportional breakdown with GitHub's official language colours |
| **Social Preview** | Hero banner from GitHub's OpenGraph image |
| **Save Long Screenshot** | One-click full-page PNG export via html2canvas (retina quality) |
| **Print / US Letter PDF** | Dedicated print stylesheet with cover page and page breaks |
| **GitHub Token Support** | Optional PAT raises API limit from 60 → 5,000 req/hr |
| **Recent History** | Last 6 repos stored in localStorage for quick re-access |
| **Zero dependencies** | Pure HTML + CSS + JS — no build step, no framework |
| **GitHub Pages ready** | Deploy with one push, live in seconds |

---

## Example

The screenshot above was generated for [`nexu-io/open-design`](https://github.com/nexu-io/open-design) using the built-in generator:

1. Clicked **New Repo** in the nav
2. Pasted `https://github.com/nexu-io/open-design`
3. Clicked **Generate** → page rebuilt with live API data
4. Clicked **Save Long Screenshot** → downloaded as PNG

---

## Quick Start

```bash
git clone https://github.com/wssddd/gh-intro.git
cd gh-intro
python3 -m http.server 8000
# open http://localhost:8000
```

No install. No build. Just open in a browser.

---

---

## Save a long screenshot

Click **Save Long Screenshot** (teal button in the hero) to capture the full page as a high-resolution PNG. The file is named after the current project, e.g. `gh-screenshot.png`.

---

## Print to PDF (US Letter)

Click **Print (US Letter)** or use `Cmd+P` / `Ctrl+P`. The page switches to a print-optimised layout:

- Cover page with project name, description, and stats
- Automatic page breaks between sections
- Code blocks rendered in black-on-white
- All nav/UI chrome hidden

---

---

## Project structure

```
gh-intro/
├── index.html           # Main page — all sections with IDs for dynamic update
├── css/
│   └── style.css        # Claude.ai-inspired design system + US Letter print styles
├── js/
│   ├── main.js          # Scroll animations, counters, copy buttons
│   ├── generator.js     # GitHub API fetcher + page renderer + token manager
│   └── screenshot.js    # Full-page PNG capture via html2canvas
└── assets/
    ├── screenshot.png        # Long screenshot example (this README)
    ├── banner.png            # open-design hero banner
    └── *.png                 # Project screenshots
```

---

## GitHub API rate limits

| Mode | Limit |
|---|---|
| Unauthenticated | 60 requests / hour |
| With Personal Access Token | 5,000 requests / hour |

Add your token in the **New Repo** panel → token field → Save. Stored locally in `localStorage`, never sent anywhere except `api.github.com`.

---

## Tech

- **HTML / CSS / JS** — zero build tools, zero npm
- **[html2canvas 1.4.1](https://html2canvas.hertzen.com/)** — full-page screenshot (CDN)
- **GitHub REST API v3** — repo metadata, language breakdown
- **GitHub OpenGraph** — social preview images

---

## License

MIT
