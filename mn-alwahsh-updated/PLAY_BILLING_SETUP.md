# Google Play Billing setup

This replaces Ziina — the app no longer takes any payment on the website; every real purchase goes through Google Play Billing from inside the Android app (a TWA). Nothing charges money until the steps below are done.

## 1. Netlify environment variables

Add these in the Netlify dashboard (Site settings → Environment variables), same place `ZIINA_ACCESS_TOKEN` used to live:

| Variable | Where to get it |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Play Console → Setup → API access → create/link a service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Downloaded JSON key file from that service account (the `private_key` field — paste it as-is, including the `\n`s) |
| `ANDROID_PACKAGE_NAME` | `com.mnalwahsh.twa` (must match `public/.well-known/assetlinks.json`) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Same values already set for the rest of the app |

**Grant the service account access in Play Console**, not just Google Cloud: Setup → API access → find the service account → "Grant access" on this app, with at minimum the *Financial data* permission (needed to read and acknowledge purchases). Without this step every purchase lookup will fail with a permissions error even though the credentials are correct.

## 2. Create the in-app products

**Recommended — bulk-create via script (skips 71 manual clicks):**

```bash
cd mn-alwahsh-updated
export GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@your-project.iam.gserviceaccount.com"
export GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(node -pe "JSON.stringify(require('/path/to/downloaded-key.json').private_key)")"
export ANDROID_PACKAGE_NAME="com.mnalwahsh.twa"
node scripts/create-play-products.mjs
```

Creates all 71 products directly as **active** — the API allows setting
status on creation, so there's no separate "activate" step afterward like
there is when creating them by hand. Safe to re-run: anything already
created is skipped, not duplicated or overwritten. The service account
needs to be invited into Play Console first (see step 1 above) with a
permission covering in-app products (e.g. "Manage store presence").

**Or manually**, if you'd rather not run the script: Play Console → your
app → Monetise with Play → Products → One-time products (Google renamed
"In-app products" to this) → Create product, for each row below. Product
ID must match the SKU column exactly (already wired into
`src/utils/playProducts.js`). Products created this way save as
*Inactive* — activate each one afterward.

Two extra products to create that aren't in the per-category list:

| SKU | Title | Price |
|---|---|---|
| `unlock_all_categories` | فتح جميع الفئات | 100 AED |
| `trial_pass` | تجربة فئة واحدة | 1 AED |

Then the 69 per-category products:

| SKU | Category (Supabase) | Price |
|---|---|---|
| `cat001` | football logo / football Logo / Football Logo / FOOTBALL LOGO | 11 AED |
| `cat002` | CR7 | 15 AED |
| `cat003` | ميسي | 15 AED |
| `cat004` | كأس العرب | 13 AED |
| `cat005` | كأس آسيا | 11 AED |
| `cat006` | Champions League | 15 AED |
| `cat007` | المنتخب الأردني | 7 AED |
| `cat008` | League of Legends | 13 AED |
| `cat009` | Real Madrid | 15 AED |
| `cat010` | Barcelona | 15 AED |
| `cat011` | WildRift | 11 AED |
| `cat012` | ريال مدريد | 15 AED |
| `cat013` | برشلونة | 15 AED |
| `cat014` | برشلونه | 15 AED |
| `cat015` | وايلد ريفت | 11 AED |
| `cat016` | محترف كرة | 9 AED |
| `cat017` | جيم اوف ثرونز | 15 AED |
| `cat018` | جميل وهناء | 9 AED |
| `cat019` | جميل و هناء | 9 AED |
| `cat020` | أفلام إنجليزية | 9 AED |
| `cat021` | نتفليكس | 13 AED |
| `cat022` | بريكينج باد | 13 AED |
| `cat023` | بيكي بلايندرز | 13 AED |
| `cat024` | بريزون بريك | 11 AED |
| `cat025` | Friends | 15 AED |
| `cat026` | Arab Idol | 11 AED |
| `cat027` | Arab Got Talent | 11 AED |
| `cat028` | Game of Thrones | 15 AED |
| `cat029` | باب الحارة | 9 AED |
| `cat030` | أفلام احمد حلمي | 9 AED |
| `cat031` | Who Said GOT | 13 AED |
| `cat032` | أم كلثوم | 13 AED |
| `cat033` | عبد الحليم | 13 AED |
| `cat034` | حمو بيكا | 9 AED |
| `cat035` | تامر حسني | 11 AED |
| `cat036` | عمرو دياب | 13 AED |
| `cat037` | أغاني قديمة | 9 AED |
| `cat038` | من غنى ؟ | 9 AED |
| `cat039` | لمن الاغنية | 9 AED |
| `cat040` | أعلام العالم | 7 AED |
| `cat041` | الأردن | 7 AED |
| `cat042` | دبي | 9 AED |
| `cat043` | براندات | 9 AED |
| `cat044` | أسئلة إنجليزية | 7 AED |
| `cat045` | هواتف ذكية | 9 AED |
| `cat046` | سيارات | 9 AED |
| `cat047` | سبيستون | 9 AED |
| `cat048` | Sephora | 13 AED |
| `cat049` | سيفورا | 13 AED |
| `cat050` | guess fashion / Guess Fashion / GUESS FASHION / Guess fashion | 11 AED |
| `cat051` | Dubai Bling | 15 AED |
| `cat052` | guess fashion easy / Guess Fashion Easy / Guess fashion easy / GUESS FASHION EASY | 9 AED |
| `cat053` | ديزني | 13 AED |
| `cat054` | Disney | 13 AED |
| `cat055` | بيبي شارك | 9 AED |
| `cat056` | Baby Shark | 9 AED |
| `cat057` | سبونج بوب | 11 AED |
| `cat058` | SpongeBob | 11 AED |
| `cat059` | من الشخصية ؟ | 9 AED |
| `cat060` | IQ | 15 AED |
| `cat061` | رياضيات | 9 AED |
| `cat062` | الغاز محيرة | 13 AED |
| `cat063` | Logos | 11 AED |
| `cat064` | فلسفة | 9 AED |
| `cat065` | محاسبة | 7 AED |
| `cat066` | حيوانات | 7 AED |
| `cat067` | Dangerous Animals | 11 AED |
| `cat068` | حيوانات خطرة | 11 AED |
| `cat069` | حيوانات خطيرة | 11 AED |

## 3. Activate each product (manual creation only)

Only needed if you created products by hand in step 2 — the script already sets them active. New products created via the UI save as *Inactive* — click **Activate** on each one (or select all and bulk-activate) or they won't be purchasable.

## 4. Test before going live

Play Console → Setup → License testing → add your own Google account as a license tester. Test purchases on a tester account don't charge real money and can be refunded instantly from Play Store → Order history, so you can retry the flow as many times as needed.

## What this does NOT cover yet

- **Subscriptions / recurring billing** — everything above is one-off purchases (`managed_by_android`), matching the old one-time-unlock model.
