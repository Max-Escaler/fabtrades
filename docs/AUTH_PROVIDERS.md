# Sign-in providers

FAB Trades offers Apple, Google, and Discord on every client. Sign-in is always
optional — the app and site work fully without an account, and an account only adds
cloud sync and Pro entitlements.

Application code lives in
[auth_repository.dart](../apps/mobile/lib/core/data/auth_repository.dart) for mobile
and [AuthContext.jsx](../apps/web/src/contexts/AuthContext.jsx) for web. This
document covers the parts that live in dashboards instead of in the repo.

## Why these three

Apple is not a choice. App Review guideline 4.8 requires an equivalent
privacy-preserving login option in any app that offers third-party sign-in, and
Apple's own is the cheapest way to satisfy it. Google covers the largest share of
Android users. Discord is where the Flesh and Blood community already is, and it was
web's original provider, so dropping it would orphan existing accounts.

## Mobile uses two different mechanisms

Not an inconsistency — each is the only option that works:

| Provider | Mechanism | Reason |
| --- | --- | --- |
| Apple | Native `sign_in_with_apple` sheet | Guideline 4.8 expects the system sheet. A browser flow reads as a workaround. |
| Google | `signInWithOAuth` in a browser tab | Google blocks OAuth in embedded webviews (policy `disallowed_useragent`), and its native SDK needs a separate OAuth client per platform. |
| Discord | `signInWithOAuth` in a browser tab | No native SDK exists. |

The Apple sheet returns an identity token in-process, so it completes before
`signIn` returns. The browser flows return as soon as the tab opens, and the session
arrives later over the auth state stream. `SignInOutcome` names that difference
(`SignInSucceeded` vs `SignInPending`) so the UI knows when to stop spinning.

## Deep link

Browser sign-in returns to `fabtrades://login-callback`. Four places must agree, and
a mismatch in any one of them means sign-in finishes in the browser and never comes
back:

1. [auth_config.dart](../apps/mobile/lib/core/config/auth_config.dart) — the value
   the app sends as `redirectTo`.
2. [AndroidManifest.xml](../apps/mobile/android/app/src/main/AndroidManifest.xml) —
   the `VIEW` intent filter on `MainActivity`.
3. [Info.plist](../apps/mobile/ios/Runner/Info.plist) — `CFBundleURLTypes`.
4. Supabase dashboard → Authentication → URL Configuration → **Redirect URLs**.

Step 4 is the security-relevant one: Supabase will not redirect to a URL absent from
that list, which is what stops a malicious app that registers the same custom scheme
from receiving a session.

`supabase_flutter` picks the link up on its own — `detectSessionInUri` defaults to
true — so no manual link handling is needed in `main.dart`.

## Dashboard setup

### Redirect URLs

Authentication → URL Configuration → Redirect URLs must contain:

```
https://fabtrades.net
https://fabtrades.net/**
fabtrades://login-callback
http://localhost:5173/**
```

### Apple

Two Apple identifiers are involved, and both must be listed in Supabase's Apple
**Client IDs** field (comma-separated):

- `com.fabtrades.app` — the iOS bundle id. The native sheet mints an identity token
  audienced to the bundle, so leaving this out makes native sign-in fail as an
  invalid audience even though the provider is enabled.
- A Services ID (for example `com.fabtrades.web`) — used by web and by any browser
  fallback.

In the Apple Developer portal:

1. Certificates, Identifiers & Profiles → Identifiers → `com.fabtrades.app` → enable
   **Sign In with Apple**. The matching entitlement is already committed at
   [Runner.entitlements](../apps/mobile/ios/Runner/Runner.entitlements).
2. Create a Services ID, enable Sign In with Apple on it, and register the return
   URL `https://tenrvaghaspwdvnwvgrh.supabase.co/auth/v1/callback`.
3. Keys → create a **Sign in with Apple** key. Supabase needs the resulting client
   secret JWT, which expires after at most six months, so this is a recurring
   maintenance task rather than a one-off.

Apple sends a name only on the very first authorization and never again, and Hide My
Email accounts may supply no usable name at all. `Account.label` handles both by
falling back through the email local part.

### Google

1. Google Cloud console → APIs & Services → Credentials → create an **OAuth client
   ID** of type *Web application* (not Android or iOS — the browser flow is a web
   flow even when launched from the app).
2. Authorized redirect URI:
   `https://tenrvaghaspwdvnwvgrh.supabase.co/auth/v1/callback`.
3. Paste the client id and secret into Supabase → Authentication → Providers →
   Google.
4. Complete the OAuth consent screen. An app in *Testing* only admits accounts on
   its test-user list, which looks exactly like a broken sign-in to everyone else.

### Discord

Already configured for web; see [DISCORD_AUTH_SETUP.md](DISCORD_AUTH_SETUP.md).
Mobile needs no additional Discord setup, because it reuses the same OAuth
application and the same Supabase callback.

## Verifying

`flutter test` covers the provider list, outcome handling, and account labels
without touching the network. The parts that can only fail against real providers
are worth checking by hand once per environment:

- Cancel the Apple sheet — no error should appear, since cancelling is not a failure.
- Complete Google sign-in and confirm the app foregrounds itself with the account
  shown in Settings.
- Sign out on mobile and confirm a web session in another browser survives it. Mobile
  signs out with `SignOutScope.local` precisely so it does not.
