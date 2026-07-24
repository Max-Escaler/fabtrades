# Codemagic → TestFlight guide for FAB Trades (Flutter iOS)

Practical path from first Codemagic iOS build to an internal or external TestFlight release for this repo.

**Project facts (this workspace)**

| Item | Value |
| --- | --- |
| Flutter app root | `mobile/app/` (`pubspec.yaml`, `ios/`) |
| Bundle ID | `com.fabtrades.app` |
| Display name | FAB Trades |
| Current `pubspec` version | `1.0.1+4` (`build-name`+`build-number`) |
| Camera privacy string | Present in `ios/Runner/Info.plist` (`NSCameraUsageDescription`) |
| Repo `codemagic.yaml` | Not present yet — must live at **repository root** |

Sources below are official Codemagic, Apple Developer / App Store Connect, and Flutter docs only.

---

## 0. Recommended end-to-end path (short)

1. Enroll in the Apple Developer Program; register Bundle ID `com.fabtrades.app`; create the App Store Connect app record.
2. Create an App Store Connect API key (role **App Manager**); connect it in Codemagic Team integrations → Developer Portal.
3. In Codemagic **Code signing identities**, generate an **Apple Distribution** certificate and fetch/create an **App Store** provisioning profile for `com.fabtrades.app`.
4. Add `codemagic.yaml` at the **fabtrades repo root** with `working_directory: mobile/app`, `ios_signing.distribution_type: app_store`, Flutter IPA build, and `publishing.app_store_connect`.
5. Run the workflow → IPA uploads to App Store Connect → answer export compliance if needed → enable **Internal Testing**, then (optional) **External Testing** (may require TestFlight beta review).

**Note:** Creating the App Store Connect app record (Phase 1) gives you a numeric **Apple ID** immediately. You do **not** need a prior binary upload for that ID. Auto-increment from TestFlight is optional and only useful after the first successful upload.

---

## 1. Apple prerequisites

### 1.1 Apple Developer Program

You need an active Apple Developer Program membership to sign and distribute iOS apps (including TestFlight). ([Apple — Become a member](https://developer.apple.com/programs/enroll/); [Flutter — Build and release an iOS app](https://docs.flutter.dev/deployment/ios))

- Individual or organization enrollment; Account Holder must accept agreements.
- Paid Apps Agreement / tax / banking are required if you sell paid apps or IAP later; TestFlight beta can proceed once the app record and agreements needed for upload are in place. ([App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow))

### 1.2 Register the Bundle ID

Every iOS app needs a unique Bundle ID. This project already uses:

```text
com.fabtrades.app
```

Register that **explicit** App ID in Certificates, Identifiers & Profiles if it is not already registered. Enable capabilities your app needs (e.g. Push Notifications only if you add them later). ([Flutter — Register a Bundle ID](https://docs.flutter.dev/deployment/ios#register-a-bundle-id))

Keep the Bundle ID in Xcode (`PRODUCT_BUNDLE_IDENTIFIER`) and App Store Connect identical. Mismatches break Codemagic profile assignment. ([Codemagic — Common iOS issues / Bundle ID mismatch](https://docs.codemagic.io/troubleshooting/common-ios-issues/))

### 1.3 Create the App Store Connect app record

You must create an app record **before** you can upload a build. ([App Store Connect — Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/); [Flutter — Create an application record](https://docs.flutter.dev/deployment/ios#create-an-application-record-on-app-store-connect); [Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))

1. App Store Connect → **Apps** → **+** → **New App**.
2. Platform: **iOS**.
3. Name, primary language, Bundle ID (`com.fabtrades.app`), SKU, user access.
4. After create, open **App Information** and confirm Bundle ID / Apple ID (numeric). You will need the numeric **Apple ID** for optional build-number syncing.

Codemagic notes that an app record is required before automated publishing, and recommends uploading the first version carefully; if the first binary has never been uploaded, you may still need to complete screenshots, privacy policy URL, category, etc. in App Store Connect after the first successful upload. ([Codemagic — App Store Connect publishing requirements](https://docs.codemagic.io/yaml-publishing/app-store-connect/))

### 1.4 Certificates and provisioning profiles (concepts)

For TestFlight / App Store distribution you need:

- An **Apple Distribution** (distribution) certificate.
- An **App Store** provisioning profile for `com.fabtrades.app`.

Development / Ad Hoc profiles are for local or non-TestFlight installs, not App Store Connect TestFlight. ([Codemagic — iOS code signing overview](https://docs.codemagic.io/flutter-code-signing/ios-code-signing/); [Codemagic — Signing iOS apps (yaml)](https://docs.codemagic.io/yaml-code-signing/signing-ios/))

Certificate and profile must match (same team, cert included in profile). Apple limits Distribution certificates (Codemagic documents a limit of 3). ([Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/))

### 1.5 App Store Connect API key

Codemagic uses an App Store Connect API key for automatic signing helpers and for uploading to App Store Connect. ([Apple — Creating API Keys for App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api); [Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/))

1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**.
2. Create a **Team** key.
3. Access role: Codemagic recommends **App Manager** for publishing. ([Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))
4. Download the `.p8` **once**; store Issuer ID and Key ID.
5. Never commit the `.p8` to git. ([Apple — Creating API Keys](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api))

**Team keys** can use Provisioning API endpoints; **Individual** keys cannot use Provisioning endpoints. Prefer a Team key for Codemagic signing automation. ([Apple — Creating API Keys](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api))

---

## 2. Codemagic account and app setup

### 2.1 Add the repository

1. Sign in to Codemagic → **Applications** → **Add application**.
2. Connect GitHub/GitLab/Bitbucket (or other) and select the **fabtrades** repo.
3. Choose an appropriate project type (Flutter when offered). ([Codemagic — Building a Flutter app](https://docs.codemagic.io/yaml-quick-start/building-a-flutter-app/))

### 2.2 Flutter path: `mobile/app` (monorepo)

This repo is a monorepo: the Flutter project is **not** at the repository root. Codemagic looks for `codemagic.yaml` at the **repository root**, and you set `working_directory` so scripts run inside the Flutter app. ([Codemagic — Building a Flutter app](https://docs.codemagic.io/yaml-quick-start/building-a-flutter-app/); [Codemagic — Monorepo apps](https://docs.codemagic.io/partials/monorepo-apps/); [Codemagic — Did not find xcodeproj](https://docs.codemagic.io/troubleshooting/common-ios-issues/))

```yaml
workflows:
  ios-testflight:
    working_directory: mobile/app
```

If you use the Flutter **workflow editor** instead of yaml, set **Project path** to `mobile/app` (rescanning may be required). ([Codemagic — Building Flutter projects](https://docs.codemagic.io/flutter-configuration/flutter-projects/))

When `codemagic.yaml` is present, Codemagic uses it for event-triggered builds and ignores Flutter workflow editor config for those workflows. ([Codemagic — Building a Flutter app](https://docs.codemagic.io/yaml-quick-start/building-a-flutter-app/))

### 2.3 Connect Developer Portal integration

Team settings → **Team integrations** → **Developer Portal** → add the API key (name, Issuer ID, Key ID, `.p8`). ([Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/); [Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))

Reference that key name later as:

```yaml
integrations:
  app_store_connect: <App Store Connect API key name>
```

---

## 3. Code signing options (and what to use for TestFlight)

| Approach | What you do | Best for |
| --- | --- | --- |
| **Code signing identities + `ios_signing`** (recommended here) | Generate/upload Distribution `.p12` and App Store `.mobileprovision` in Codemagic UI; reference by `distribution_type` + `bundle_identifier` | TestFlight / App Store with `codemagic.yaml` |
| **Automatic via CLI (`fetch-signing-files`)** | Store `CERTIFICATE_PRIVATE_KEY` (+ API auth); scripts fetch/create certs & profiles at build time | Teams that want Apple as source of truth every build |
| **Manual file upload only** | You create cert/profile in Apple Developer, upload to Codemagic | Enterprise / constrained portals; also works for App Store |

### 3.1 Recommended for this project (TestFlight)

Use **Code signing identities** with **App Store** distribution:

1. Team settings → **codemagic.yaml settings** → **Code signing identities**.
2. **iOS certificates** → **Generate certificate** → type **Apple Distribution** (requires Developer Portal integration). Download once if offered; keep a private backup. ([Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/))
3. **iOS provisioning profiles** → **Fetch profiles** (or create an App Store profile in Apple Developer for `com.fabtrades.app` and upload). Give it a reference name; confirm the certificate match checkmark. ([Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/))
4. In yaml:

```yaml
environment:
  ios_signing:
    distribution_type: app_store
    bundle_identifier: com.fabtrades.app
```

Codemagic explicitly says: for App Store or TestFlight, set `distribution_type` to `app_store`. ([Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/))

Before `flutter build ipa`, run:

```yaml
- name: Set up code signing settings on Xcode project
  script: xcode-project use-profiles
```

([Codemagic — Using provisioning profiles](https://docs.codemagic.io/yaml-code-signing/signing-ios/))

### 3.2 Automatic alternative (`CERTIFICATE_PRIVATE_KEY`)

1. Create or export an iOS Distribution private key (`ssh-keygen` or export from Keychain + `openssl`). ([Codemagic — Alternative code signing methods](https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/))
2. Store the PEM as secret env var `CERTIFICATE_PRIVATE_KEY` in a group (e.g. `code-signing`).
3. Use Developer Portal integration (or `APP_STORE_CONNECT_*` env vars).
4. In scripts: `keychain initialize` → `app-store-connect fetch-signing-files … --type IOS_APP_STORE --create` → `keychain add-certificates` → `xcode-project use-profiles`. ([Flutter — Codemagic CLI tools flow](https://docs.flutter.dev/deployment/ios#create-a-build-archive-with-codemagic-cli-tools); [Codemagic — Alternative code signing](https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/))

### 3.3 Internal-only TestFlight builds

To mark a build **TestFlight Internal Testing Only** (no external / App Store path for that binary):

```yaml
- name: Set up code signing settings on Xcode project
  script: |
    xcode-project use-profiles \
      --custom-export-options='{"testFlightInternalTestingOnly": true}'
```

Those builds show “internal” next to the build number and cannot be used for external testing or customers. ([Codemagic — Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/); [Apple — Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/))

For a first external TestFlight, **do not** set `testFlightInternalTestingOnly`.

---

## 4. `codemagic.yaml` for Flutter iOS + App Store Connect

Place this file at **`fabtrades/codemagic.yaml`** (repository root). Adjust the integration name, Apple ID, and beta group names.

```yaml
workflows:
  ios-testflight:
    name: iOS TestFlight
    # Flutter project is not at repo root
    working_directory: mobile/app
    max_build_duration: 120
    instance_type: mac_mini_m2

    integrations:
      # Exact name from Team integrations → Developer Portal
      app_store_connect: Codemagic

    environment:
      flutter: stable
      xcode: latest
      cocoapods: default
      ios_signing:
        distribution_type: app_store
        bundle_identifier: com.fabtrades.app
      groups:
        # Optional: app secrets (Supabase keys, etc.) — never commit real values
        # - fabtrades_mobile_secrets
      vars:
        # Numeric Apple ID from App Store Connect → App Information
        APP_STORE_APPLE_ID: "REPLACE_WITH_NUMERIC_APPLE_ID"

    scripts:
      - name: Get Flutter packages
        script: flutter pub get

      - name: Install CocoaPods dependencies
        script: |
          find . -name "Podfile" -execdir pod install \;

      - name: Set up code signing settings on Xcode project
        script: xcode-project use-profiles

      - name: Flutter build IPA
        script: |
          # Keep marketing version in pubspec (e.g. 1.0.1); bump build number per upload.
          # PROJECT_BUILD_NUMBER is provided by Codemagic.
          # https://docs.codemagic.io/knowledge-codemagic/build-versioning/
          flutter build ipa --release \
            --build-name=1.0.1 \
            --build-number=$(($PROJECT_BUILD_NUMBER + 3)) \
            --export-options-plist=/Users/builder/export_options.plist

    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
      - flutter_drive.log

    publishing:
      app_store_connect:
        auth: integration
        # Upload only first; flip these on after internal smoke works
        submit_to_testflight: false
        # submit_to_testflight: true
        # beta_groups:
        #   - External Testers
        submit_to_app_store: false
```

### Why these pieces

| Piece | Reason | Source |
| --- | --- | --- |
| `working_directory: mobile/app` | Monorepo Flutter root | [Monorepo apps](https://docs.codemagic.io/partials/monorepo-apps/) |
| `ios_signing` + `app_store` | TestFlight / App Store signing | [Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/) |
| `xcode-project use-profiles` | Apply profiles / export options | [Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/) |
| `flutter build ipa` | Archive + IPA | [Flutter iOS deployment](https://docs.flutter.dev/deployment/ios) |
| `--export-options-plist=/Users/builder/export_options.plist` | Codemagic export options from `use-profiles` | [Flutter Codemagic CLI flow](https://docs.flutter.dev/deployment/ios#create-a-build-archive-with-codemagic-cli-tools); [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/) |
| Unique build number | App Store Connect rejects duplicate build numbers | [Codemagic build versioning](https://docs.codemagic.io/knowledge-codemagic/build-versioning/); [Flutter versioning](https://docs.flutter.dev/deployment/ios#update-the-apps-build-and-version-numbers) |
| `publishing.app_store_connect.auth: integration` | Upload IPA with API key | [App Store Connect publishing (yaml)](https://docs.codemagic.io/yaml-publishing/app-store-connect/) |

**Version note:** This app already maps `CFBundleShortVersionString` / `CFBundleVersion` to `$(FLUTTER_BUILD_NAME)` / `$(FLUTTER_BUILD_NUMBER)` in `Info.plist`, which is what Codemagic’s Flutter versioning guide expects. ([Codemagic — Build versioning](https://docs.codemagic.io/knowledge-codemagic/build-versioning/)) Current pubspec is `1.0.1+4`; the sample offsets `PROJECT_BUILD_NUMBER` so early CI builds do not collide with `+4`. Prefer `app-store-connect get-latest-testflight-build-number` once the Apple ID is set. ([Codemagic — Build versioning](https://docs.codemagic.io/knowledge-codemagic/build-versioning/))

After the first green upload, you can enable:

```yaml
submit_to_testflight: true
beta_groups:
  - Your External Group Name
```

Beta group distribution and TestFlight review submission run in Codemagic **post-processing** (does not consume build minutes; 15 min to find build / 120 min overall timeout). ([Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))

---

## 5. Environment variables and secrets

### 5.1 Required via Codemagic UI (not always as yaml env vars)

| Item | Where |
| --- | --- |
| App Store Connect API key (`.p8`, Key ID, Issuer ID) | Team integrations → Developer Portal **or** secret vars `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_ISSUER_ID` |
| Distribution certificate + App Store profile | Code signing identities (recommended path) |
| `CERTIFICATE_PRIVATE_KEY` | Only if using automatic `fetch-signing-files` path |

([Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/); [Codemagic — Alternative code signing](https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/); [Codemagic — Environment variables](https://docs.codemagic.io/yaml-basic-configuration/using-environment-variables/))

### 5.2 Typical app env vars for FAB Trades

This app uses Supabase and camera scanning. Put runtime secrets in a Codemagic **secret** variable group and pass them with `--dart-define` if the Dart code expects them. ([Codemagic — Using environment variables / Flutter](https://docs.codemagic.io/yaml-basic-configuration/using-environment-variables/))

Example pattern:

```yaml
environment:
  groups:
    - fabtrades_mobile_secrets
scripts:
  - name: Flutter build IPA
    script: |
      flutter build ipa --release \
        --dart-define=SUPABASE_URL=$SUPABASE_URL \
        --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
        --export-options-plist=/Users/builder/export_options.plist
```

Never commit `.p8`, certificate private keys, or production anon keys that should stay private.

### 5.3 Optional versioning vars

- `APP_STORE_APPLE_ID` — App Store Connect → App Information → Apple ID. ([Codemagic — Build versioning](https://docs.codemagic.io/knowledge-codemagic/build-versioning/))

---

## 6. Build → archive → upload flow

What happens on a successful Codemagic run:

1. **Clone** repo; `cd` / run under `working_directory: mobile/app`.
2. **Fetch signing** materials matching `app_store` + `com.fabtrades.app`.
3. **`flutter pub get`** / CocoaPods install.
4. **`xcode-project use-profiles`** — writes signing settings and `export_options.plist`.
5. **`flutter build ipa --release`** — produces `.xcarchive` and `.ipa` (App Store export). ([Flutter — Create an app bundle](https://docs.flutter.dev/deployment/ios#create-an-app-bundle))
6. **Publish** — Codemagic uploads the IPA to App Store Connect with the API key (`auth: integration` or env-based key). ([Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))
7. **Apple processing** — build appears under TestFlight after processing (Flutter docs note an email often within ~30 minutes). ([Flutter — Upload the app bundle](https://docs.flutter.dev/deployment/ios#upload-the-app-bundle-to-app-store-connect))
8. **Post-processing (optional)** — `submit_to_testflight`, `beta_groups`, release notes. ([Codemagic — Post-processing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))

Local equivalent (for mental model) is Flutter’s `flutter build ipa` + `app-store-connect publish` / Transporter / `altool`. ([Flutter — Build and release an iOS app](https://docs.flutter.dev/deployment/ios))

---

## 7. App Store Connect / TestFlight after upload

Follow Apple’s TestFlight overview. ([TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/); [Flutter — Release on TestFlight](https://docs.flutter.dev/deployment/ios#release-your-app-on-testflight))

### 7.1 Export compliance

Uploading to App Store Connect is treated as an export from the U.S.; apps that use encryption may need compliance answers or documentation. ([Apple — Overview of export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/); [Apple — Complying with Encryption Export Regulations](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations))

FAB Trades uses HTTPS (Supabase) and OS networking — typically **exempt** encryption use, but **you** must confirm against Apple’s questionnaire / EAR guidance.

To avoid answering every upload, set in `Info.plist` when appropriate:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Only set `false` if your encryption use is exempt (or you use no encryption). If non-exempt, set `true` and follow Apple’s documentation upload / `ITSEncryptionExportComplianceCode` process. ([Apple — Complying with Encryption Export Regulations](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations))

Until the build’s compliance is cleared, TestFlight availability can be blocked.

### 7.2 Internal testing

1. App Store Connect → your app → **TestFlight**.
2. Provide **Test Information** (feedback email, etc.). ([TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/))
3. Create an **Internal Testing** group; add up to **100** App Store Connect users (roles Account Holder, Admin, App Manager, Developer, or Marketing). ([Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/))
4. Add the processed build to the group (or enable automatic distribution for the group).
5. Testers install the **TestFlight** app and accept the invite. Builds remain testable up to **90 days**. ([TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/))

Internal testing does **not** require the same external beta review gate as inviting external testers. ([TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/))

### 7.3 External testing / TestFlight review

1. You must have an **internal** group before creating an **external** group. ([Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/))
2. Create an external group → **Add Builds** → fill **What to Test** → **Submit Review** / **Start Testing** as prompted.
3. First build for external testing is sent to **App Review** for beta; later builds of the same version may not need a full review. ([TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/); [Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/))
4. Invite up to **10,000** external testers by email and/or public link. ([Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/); [TestFlight product page](https://developer.apple.com/testflight/))
5. Optional: Codemagic `submit_to_testflight: true` + `beta_groups` to automate post-upload distribution after processing. ([Codemagic — App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/))

Do not use Internal-Only export builds for external groups. ([Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/))

---

## 8. Common failure points (and fixes)

| Symptom | Likely cause | Fix | Source |
| --- | --- | --- | --- |
| `Did not find xcodeproj from …/ios` | Wrong working directory (monorepo) | Set `working_directory: mobile/app` | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/) |
| `No matching profiles found … app_store` | Profile not uploaded / wrong Bundle ID | Add App Store profile for `com.fabtrades.app` in Code signing identities | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/) |
| Signing / entitlements errors | Missing `xcode-project use-profiles` or stale profile | Add `use-profiles`; refresh profile after capability changes | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/); [Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/) |
| Certificate / profile mismatch | Dev cert with App Store profile, or cert not in profile | Align Distribution cert + App Store profile | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/) |
| Red ❌ on provisioning profile in UI | Uploaded cert not included in that profile | Edit profile in Apple Developer to include the Codemagic cert; re-upload | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/) |
| Duplicate build rejected | Same `CFBundleVersion` as prior upload | Increment `--build-number` / use App Store latest-build helpers | [Build versioning](https://docs.codemagic.io/knowledge-codemagic/build-versioning/); [Flutter versioning](https://docs.flutter.dev/deployment/ios) |
| Invalid binary / missing icons | Placeholder or incomplete App Icon set | Replace icons in `ios/Runner/Assets.xcassets/AppIcon.appiconset` per Apple HIG; Flutter documents icon requirements | [Flutter — Add an app icon](https://docs.flutter.dev/deployment/ios#add-an-app-icon); [Codemagic publishing requirements](https://docs.codemagic.io/flutter-publishing/publishing-to-app-store/) |
| Privacy / missing purpose strings | Camera (or other) API without usage description | Keep `NSCameraUsageDescription` accurate (already present) | [Flutter / Apple Info.plist practice](https://docs.flutter.dev/deployment/ios) — see also App Review Guidelines |
| Privacy manifests / required-reason APIs | App or SDKs collect data or use required-reason APIs without `PrivacyInfo.xcprivacy` | Add app/SDK privacy manifests as required | [Apple — Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files) |
| Stuck on export compliance | Encryption questions unanswered | Complete questionnaire or set `ITSAppUsesNonExemptEncryption` correctly | [Export compliance overview](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/) |
| Missing metadata for distribution | No screenshots, privacy policy, category | Complete App Store Connect app information after first upload | [Codemagic publishing note](https://docs.codemagic.io/yaml-publishing/app-store-connect/); [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/) |
| `A required agreement is missing or has expired` | Updated Apple Developer agreements | Account Holder accepts agreements on developer.apple.com | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/) |
| Auth / upload session errors with old password flow | App-specific password publishing deprecated | Use App Store Connect API key publishing | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/); [yaml publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/) |
| Distribution certificate limit | Already 3 Distribution certs | Revoke unused cert in Apple Developer or upload existing | [Signing iOS apps](https://docs.codemagic.io/yaml-code-signing/signing-ios/) |
| Post-processing timeout | Apple still processing / invalid binary | Check App Store Connect email; retry beta submit manually | [Codemagic post-processing](https://docs.codemagic.io/yaml-publishing/app-store-connect/) |
| Pod / deployment target errors | Missing or outdated Podfile / iOS deployment target | Ensure CocoaPods install; Flutter supports iOS 13+ | [Common iOS issues](https://docs.codemagic.io/troubleshooting/common-ios-issues/); [Flutter deployment target](https://docs.flutter.dev/deployment/ios#review-xcode-project-settings) |

---

## 9. Checklist (first TestFlight for FAB Trades)

- [ ] Apple Developer Program active; agreements signed  
- [ ] Bundle ID `com.fabtrades.app` registered  
- [ ] App Store Connect app record created; note numeric Apple ID  
- [ ] App Store Connect API key (App Manager) created; `.p8` stored securely  
- [ ] Codemagic app linked to repo; Developer Portal integration configured  
- [ ] Distribution certificate + App Store profile in Code signing identities  
- [ ] `codemagic.yaml` at repo root with `working_directory: mobile/app`  
- [ ] App icons / launch assets finalized (not Flutter placeholders if still default)  
- [ ] Decide encryption compliance → `ITSAppUsesNonExemptEncryption` if exempt  
- [ ] First Codemagic build uploads IPA successfully  
- [ ] Compliance cleared; Internal group testing works  
- [ ] (Optional) External group + TestFlight review  

---

## 10. Primary sources index

| Topic | URL |
| --- | --- |
| Codemagic Flutter + yaml quick start | https://docs.codemagic.io/yaml-quick-start/building-a-flutter-app/ |
| Codemagic yaml iOS signing | https://docs.codemagic.io/yaml-code-signing/signing-ios/ |
| Codemagic alternative / automatic signing | https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/ |
| Codemagic App Store Connect publishing (yaml) | https://docs.codemagic.io/yaml-publishing/app-store-connect/ |
| Codemagic monorepo / working_directory | https://docs.codemagic.io/partials/monorepo-apps/ |
| Codemagic build versioning | https://docs.codemagic.io/knowledge-codemagic/build-versioning/ |
| Codemagic common iOS issues | https://docs.codemagic.io/troubleshooting/common-ios-issues/ |
| Flutter iOS deployment | https://docs.flutter.dev/deployment/ios |
| Apple Developer Program enroll | https://developer.apple.com/programs/enroll/ |
| App Store Connect workflow | https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow |
| Add a new app | https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/ |
| Creating App Store Connect API keys | https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api |
| TestFlight overview | https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ |
| Add internal testers | https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/ |
| Invite external testers | https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/ |
| Export compliance | https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/ |
| Encryption export regulations (Info.plist keys) | https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations |
| Privacy manifests | https://developer.apple.com/documentation/bundleresources/privacy_manifest_files |

---

*Guide written for the fabtrades monorepo Flutter app at `mobile/app`. Add `codemagic.yaml` at the repository root when you are ready to implement.*
