# Hoop & Lift Tracker

A web app for tracking basketball practice, shooting percentages, and lifting progress with Supabase login and long-term database storage.

## Files

- `index.html` is the page structure.
- `styles.css` is the visual design and responsive layout.
- `app.js` is the app logic, login, chart drawing, and Supabase database code.
- `supabase-config.js` stores your Supabase project URL and public anon key.
- `supabase-schema.sql` creates the database tables and security policies.

## What You Get

- Email/password login.
- Calendar tab with basketball and lifting checkboxes for each day.
- Shooting tab with made shots, attempts, shot type, and court spot.
- Automatic shooting percentage and difference from the previous same-type session.
- Visual charts for shooting and lifting.
- Lifting log with estimated one-rep max.
- Long-term data storage in Supabase.

## 1. Create Supabase Project

1. Go to https://supabase.com.
2. Create a free account or sign in.
3. Click `New project`.
4. Choose an organization.
5. Name the project, for example `hoop-lift-tracker`.
6. Set a database password and save it somewhere safe.
7. Choose a region close to you.
8. Click `Create new project`.

## 2. Create the Database Tables

1. In Supabase, open your project.
2. Go to `SQL Editor`.
3. Open the local file `supabase-schema.sql`.
4. Copy everything from that file.
5. Paste it into the Supabase SQL Editor.
6. Click `Run`.

This creates:

- `training_days`
- `shooting_sessions`
- `lifting_sessions`

It also enables Row Level Security, so each signed-in user can only see and edit their own rows.

## 3. Get Your Supabase Keys

1. In Supabase, go to `Project Settings`.
2. Open `Data API`.
3. Copy the `Project URL`.
4. Copy the `anon public` key.
5. Open `supabase-config.js`.
6. Replace the placeholders:

```js
window.SUPABASE_CONFIG = {
  url: "YOUR_PROJECT_URL",
  anonKey: "YOUR_ANON_PUBLIC_KEY"
};
```

The anon key is safe to use in a browser app when Row Level Security is enabled.

## 4. Auth Settings

For the first test, Supabase email confirmation can make things slower because you need to confirm every new account by email.

Simple option:

1. In Supabase, go to `Authentication`.
2. Open `Sign In / Providers`.
3. Make sure `Email` is enabled.
4. For easier testing, turn off `Confirm email`.

After the app is online:

1. Go to `Authentication`.
2. Open `URL Configuration`.
3. Set `Site URL` to your Vercel URL.
4. Add your Vercel URL to `Redirect URLs`.

## 5. Run Locally

Open `index.html` in a browser. After you paste your Supabase URL and anon key, you can create an account and save data.

## 6. Deploy Free on Vercel

1. Create a GitHub repository, for example `hoop-lift-tracker`.
2. Put these files in the root of the repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `supabase-config.js`
   - `supabase-schema.sql`
   - `README.md`
3. Go to https://vercel.com and sign in with GitHub.
4. Click `Add New...`, then `Project`.
5. Choose your GitHub repository.
6. For framework preset, choose `Other` if Vercel does not detect one automatically.
7. Leave the build command empty.
8. Leave the output directory empty or set it to `.`.
9. Click `Deploy`.

## 7. Get the Online Link

After Vercel finishes deploying, it shows a live URL on the project page. It will look similar to:

```text
https://hoop-lift-tracker.vercel.app
```

That is the link you can open on your phone or share. You can also find it later in Vercel:

1. Open your Vercel dashboard.
2. Click your project.
3. Look for the `Production` deployment.
4. Copy the deployment URL or the domain shown at the top.

## Official References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Vercel Builds and Static Sites: https://vercel.com/docs/builds
- Vercel Git Deployments: https://vercel.com/docs/deployments/git
