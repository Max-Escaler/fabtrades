# App Store Review checklist

What to put in App Store Connect before every iOS review submission. The two
items that blocked review in July 2026 were a missing Terms of Use (EULA) link
and a missing demo account for the sign-in UI.

For full agent handoff context (what was fixed, local IPA path, Organizer
issues, remaining upload steps), see
[APP_STORE_RESUBMISSION_HANDOFF.md](./APP_STORE_RESUBMISSION_HANDOFF.md).

## Legal URLs

| Document | URL |
| --- | --- |
| Privacy Policy | https://fabtrades.net/privacy |
| Terms of Use (EULA) | https://fabtrades.net/terms |

### App Store Connect

1. **App Information → Privacy Policy URL** → `https://fabtrades.net/privacy`
2. **App Information → License Agreement** → either keep Apple’s standard EULA
   **or** paste the custom Terms text / URL for a custom EULA. The hosted page at
   `/terms` is the custom Terms of Use.
3. **Version → Description** — include a functional Terms link (required when
   offering auto-renewable subscriptions). Append something like:

   ```
   Terms of Use (EULA): https://fabtrades.net/terms
   Privacy Policy: https://fabtrades.net/privacy
   ```

4. **Subscriptions** — for each localization of the FABTrades Pro group /
   products, ensure Privacy Policy and Terms of Use URLs are set if App Store
   Connect shows those fields.
5. **RevenueCat Paywall** — set footer Privacy / Terms links to the same URLs so
   the native paywall also satisfies Guideline 3.1.2.

Deploy the web app so `/terms` and the updated `/privacy` are live **before**
resubmitting. Reviewers fetch those URLs.

## Demo account (required)

The app includes optional sign-in (Apple, Google, Discord, email). App Review’s
automated check requires a username/password demo account in **App Review
Information**.

### One-time setup (production Supabase)

1. Supabase → Authentication → Providers → **Email** → enable.
   - Turn **Confirm email** off for the App Review user (or confirm the address
     yourself) so the reviewer is not blocked on a confirmation mail.
2. Authentication → Users → **Add user**:
   - Email: `appreview@fabtrades.net` (or another address you control)
   - Password: generate a strong password and store it in your password manager
   - Auto Confirm User: on
3. Sign in once on a TestFlight build with **Sign in with email** to confirm the
   account works against production.

Do **not** commit the password to git. Put it only in App Store Connect.

### App Review Information fields

| Field | Value |
| --- | --- |
| Sign-in required | Yes (for Pro purchase / sync; core features work signed out) |
| Username | `appreview@fabtrades.net` (or the email you created) |
| Password | *(the password from step 2)* |

### Notes for Review (paste into ASC)

```
FAB Trades can be reviewed without signing in. Core features (card prices,
trade balancing, binder/want list on-device, camera card scanning) work while
signed out.

Sign-in is optional and unlocks cloud sync. Purchasing FABTrades Pro requires
sign-in so the subscription can be attached to an account.

Demo account (email/password):
- Open My Account (or any Sign in button)
- Tap “Sign in with email”
- Username and password are in the Demo Account fields above

To review FABTrades Pro:
1. Sign in with the demo account
2. Open My Account → See plans
3. Use a Sandbox Apple ID for the purchase

Legal:
- Terms of Use: https://fabtrades.net/terms
- Privacy Policy: https://fabtrades.net/privacy

Camera: used only for on-device card scanning; frames are not uploaded.
```

## Resubmit

1. Deploy web (`/terms` + updated privacy).
2. Ship a mobile build that includes Settings → Legal links, subscription legal
   links, and email sign-in.
3. Fill Demo Account + Notes for Review as above.
4. Confirm App Description contains the Terms URL.
5. Submit for review.
