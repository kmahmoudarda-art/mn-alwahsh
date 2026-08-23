# Wiring up real Ziina payments

The code is in place (netlify/functions/create-ziina-payment.js and
confirm-ziina-payment.js). Nothing charges real money yet until these two
steps are done in your own accounts:

## 1. Get a Ziina access token

1. Sign up / log in at ziina.com if you haven't already (this needs to be a
   Ziina Business account, not personal).
2. Go to the "Custom integration" access token page:
   https://docs.ziina.com/developers/custom-integration
   (click the "Click here to generate your access token" link on that page)
3. Select "Other builder or custom", verify with your phone number + OTP +
   email.
4. Copy the token immediately — Ziina only shows it once.

## 2. Add environment variables in Netlify

Netlify dashboard → your site → Site configuration → Environment variables
→ Add a variable. Add these:

| Key                  | Value                                              |
|-----------------------|-----------------------------------------------------|
| `ZIINA_ACCESS_TOKEN` | the token from step 1                               |
| `SITE_URL`           | `https://mnalwahsh.com` (no trailing slash)         |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are optional to set — the functions
already fall back to the same values hardcoded in `supabaseClient.js`, so
only add them if those ever change.

## 3. Redeploy

Netlify needs a new deploy to pick up the new environment variables and the
`netlify/functions` folder (Netlify auto-detects it from `netlify.toml`,
but only on the next build after these files exist in the repo).

## 4. Test it

Ziina's payment intents support a `test: true` flag for dry runs, which
isn't wired in yet (kept out on purpose — flip it on temporarily in
`create-ziina-payment.js` if you want to test the flow without real money
first, then take it back out before going live).

## What this does NOT cover yet

- **Android app purchases** (Google Play Billing) — separate integration,
  not built yet.
- **Webhooks** — right now, payment confirmation only happens when the
  browser lands back on `/payment-result` after checkout. If someone closes
  the tab mid-payment, a completed payment could go ungranted. A Ziina
  webhook (POST `/webhook` in their API) calling a third Netlify function
  would close that gap — worth adding once the basic flow is confirmed
  working.
