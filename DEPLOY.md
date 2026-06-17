# Deploy & install as a desktop app (free)

Your built app (`dist/`) is static files with your keys already baked in, so hosting is free and simple. Two paths below — **Netlify drag-and-drop is the easiest**.

---

## A. Netlify — drag & drop (no git, no terminal) ✅ easiest

1. Build the latest version:
   ```bash
   npm run build
   ```
2. Go to <https://app.netlify.com/drop> (sign up free if needed).
3. **Drag the `dist` folder** onto the drop zone. You get a live URL like `https://your-app.netlify.app` in seconds.
4. (Optional) Site settings → rename to something memorable.

To update later: `npm run build` again, then drag the new `dist` folder onto the same site (Deploys tab → drag to redeploy).

The included `public/_redirects` makes client-side routing work (so refreshing `/holdings` doesn't 404).

---

## B. Vercel — via GitHub (auto-redeploys on every push)

1. Put the project on GitHub (once):
   ```bash
   git init && git add . && git commit -m "Stock portfolio app"
   gh repo create stock-portfolio --private --source=. --push
   ```
2. Go to <https://vercel.com> → **Add New → Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build: `npm run build`, output: `dist`.
4. **Environment variables** → add your three `VITE_*` keys (from `.env`).
5. Deploy. `vercel.json` handles SPA routing.

---

## ⚠️ Required: tell Supabase about the new URL

Email confirmation and password-reset links redirect back to your app's URL, so Supabase must allow it:

1. Supabase dashboard → **Authentication → URL Configuration**
2. Set **Site URL** to your deployed URL (e.g. `https://your-app.netlify.app`)
3. Add these to **Redirect URLs**:
   - `https://your-app.netlify.app/login`
   - `https://your-app.netlify.app/reset-password`
   - (keep `http://localhost:5173/**` too, for local dev)

Without this, sign-up verification and password reset will fail on the deployed site.

---

## Install it as a desktop app

Once it's live, open the URL in **Edge** or **Chrome**:

- **Edge:** `⋯` menu → **Apps → Install this site as an app** → Install.
- **Chrome:** `⋮` menu → **Cast, save, and share → Install page as app** (or the install icon in the address bar).

You'll get a standalone window plus a **desktop / Start-menu icon** — it opens like a native app, no browser tabs. To pin it: right-click the taskbar icon → **Pin to taskbar**.

> Note: it still needs an internet connection (it talks to Supabase / Finnhub / CoinGecko). Your anon/Finnhub keys are client-side by design; Row Level Security keeps each user's data private.
