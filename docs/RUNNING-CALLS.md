# Running calls end-to-end (Phases 2–4)

This is the practical guide for building the app onto a real Android device and
placing/receiving real calls against a local xcall dev server, including
native lockscreen ringing for calls that arrive while the app is killed. It
assumes Phase 2 is complete in both repos (auth, SIP engine, `CallContext`),
covers the Phase 3 incoming-call additions in section 6, and covers Phase 4
metering in section 7.

## 1. Prerequisites

1. **xcall dev server running and reachable on your LAN.**
   In the `xcall` repo:
   ```sh
   yarn dev
   ```
   Next.js's dev server binds to `0.0.0.0` by default, so it's normally
   already reachable from a phone on the same Wi-Fi. Confirm this is
   actually the case for your setup (some environments/scripts override the
   host) — if the server turns out to be bound to `127.0.0.1` only, run
   `next dev -H 0.0.0.0` instead.

2. **`yarn db:push` has been run in xcall** so the app-user tables (`AppUser`,
   `DeviceToken`, `DeviceClaim`, the calling-app config, etc.) exist in your
   local database. This is a prerequisite the user still owes before first
   run — nothing in this app repo can do it for you.

3. **ASHTI is linked as the calling-app store.** In a browser, go to
   `http://localhost:3000/admin/calling-app` (or your LAN IP) and link the
   ASHTI store (phone + password of an ASHTI `StoreUser` member). Every app
   user's SIP extension is provisioned under this store, so calls won't work
   until it's linked.

4. **Find your machine's LAN IP** (the phone and the dev machine must be on
   the same Wi-Fi network):
   ```sh
   # macOS
   ipconfig getifaddr en0
   ```

5. **Set `EXPO_PUBLIC_API_URL`** in this repo's `.env` to that LAN IP, e.g.:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
   ```
   `localhost` will not work from a physical device — it resolves to the
   phone itself, not your dev machine. Restart the Metro bundler after
   changing `.env`. Note this LAN dev setup talks plain HTTP, so traffic
   (including the auth token) is cleartext on your Wi-Fi — fine for local
   testing, but production traffic goes over HTTPS.

## 2. Build and run on a device

Two Android devices are needed for the app-to-app test below. USB debugging
must be enabled on each (Settings → About phone → tap "Build number" 7
times → Developer options → USB debugging).

### Option A — `expo run:android` (fastest local loop)

```sh
# with the device plugged in via USB and `adb devices` showing it
npx expo run:android
```

This runs `prebuild` automatically, compiles the native project, installs
the debug build, and starts Metro. Repeat per device (plug in one at a time,
or target explicitly with `--device`).

### Option B — EAS development build

If you'd rather not build locally (e.g. building for a device you can't plug
in right now), use an EAS development build:

```sh
eas build -p android --profile development
```

Install the resulting APK on each test device, then run `npx expo start
--dev-client` and scan/connect from the installed dev client.

Either way, each device needs its own app-user account (see below) — you
can't test app-to-app calling with one account on two devices.

## 3. Two-device app-to-app test script

1. Install/run the app on **Device A** and **Device B** as above, both
   pointed at the same `EXPO_PUBLIC_API_URL`.
2. On Device A: register a new app user (phone + password). Wait for the
   home screen — this confirms the SIP extension was provisioned and the
   softphone registered (check the in-app status indicator, or the xcall
   server logs for a `REGISTER` from that extension).
3. On Device B: register a second, different app user the same way.
4. On Device A, place a call to Device B's app-user phone number (the
   in-app dialer / contact entry — app-to-app calls route as `internal`,
   not PSTN, per `PlaceCallResult`).
5. Device B should ring with the native in-app incoming-call UI. Answer it.
6. Confirm two-way audio: speak on A, confirm it's heard on B, and vice
   versa. Test mute, speaker toggle, and hang up from both sides
   (A-hangs-up and B-hangs-up, as separate runs).
7. Repeat with B calling A.
8. Check the xcall server logs / DB for the resulting `Call` record and
   confirm `remainingSeconds` didn't decrement for the app-to-app leg
   (minutes are a PSTN-only Phase 4 concept — see limits below).

## 4. PSTN test script

1. On one device, dial a real external phone number (a personal mobile
   number is fine) from the in-app dialer.
2. Confirm the call goes through `placeCall` as `type: 'pstn'` (the
   `remainingSeconds` field should come back in the response — this is the
   free-minutes balance check, even though nothing is deducted yet in
   Phase 2).
3. Confirm the external phone actually rings and, on answering, two-way
   audio works in both directions.
4. Hang up from the app; confirm the external line drops. Then place
   another PSTN call and hang up from the **external** phone instead;
   confirm the app's call UI ends promptly.
5. Optionally, have someone call the ASHTI store's PSTN number and confirm
   it still behaves as an ordinary store call (unaffected by app-user
   extensions) — this exercises the "PSTN stays store-level" design
   constraint.

## 5. Known Phase 2 limits

- **No incoming-call push when the app is killed/backgrounded-and-swiped.**
  Ringing currently only reaches a device where the app process is alive and
  the SIP socket is registered. Waking a killed app via FCM data push +
  native full-screen ring is **Phase 3** work.
- **Minutes are tracked but not yet deducted server-side.** `placeCall`
  returns `remainingSeconds` today, and the app locally counts it down
  during a connected PSTN call and hangs up automatically once it hits
  zero, but nothing on the server actually decrements the account's balance
  as a call progresses — real enforcement/deduction lands in **Phase 4**.
- **Web and Expo Go are demo mode only.** `react-native-webrtc` and the
  native call UI require a custom dev client / native build; running this
  app in a browser or inside Expo Go will not place real calls.
- **TURN credentials are fetched once per SIP registration**, not
  per-call. If a call has connectivity trouble mid-session on a flaky
  network, a fresh registration (e.g. app restart) is the current
  workaround — refreshing TURN creds mid-call isn't implemented yet.

## 6. Incoming calls (Phase 3)

Phase 3 adds native, lockscreen-visible incoming-call ringing that works even
when the app process has been killed, by waking the app via an FCM data push
and showing a full-screen ring UI. This section covers what's needed to build
and test that on Android.

### Firebase prerequisites

1. **`google-services.json` at the repo root.** Download it from the Firebase
   console for project `xcall-selorax`, Android app package
   `io.selorax.ilubilu`, and place it at this repo's root (next to
   `package.json`). This file is gitignored and must be fetched per-machine —
   it is not checked in.
2. **`npx expo prebuild --platform android --clean` must be run once** after
   dropping `google-services.json` in place, before the next
   `expo run:android`. The `--clean` flag matters here because the Android
   package id changed as part of this work — a non-clean prebuild can leave
   stale native config (wrong `applicationId`, missing google-services
   plugin wiring) in the regenerated `android/` project.
3. **`FIREBASE_SERVICE_ACCOUNT_JSON` must be set in the xcall deployment**
   that receives the selx webhooks (the same server this app's
   `EXPO_PUBLIC_API_URL` points at). Without it, the server can't send the
   FCM data push that wakes a killed app, so incoming calls will only ring on
   devices where the app is already running in the foreground/background
   (i.e. you'll silently fall back to Phase 2 behavior).

### Killed-app incoming-call test script

1. On **Device A**, register/log in as an app user as usual (see section 3),
   then **swipe the app away from Recents** so its process is fully killed,
   not just backgrounded. **Do not use Settings → Apps → the app → Force
   stop** — Force stop blocks FCM delivery entirely, so a "killed" app
   force-stopped this way will never wake for the incoming call at all and
   this whole test will look broken when it isn't.
2. **Wait about 2 minutes** before placing the test call. Right after the
   app is killed, its SIP registration can still be considered "live" for a
   short window server-side (a stale binding that hasn't expired yet) — a
   call placed too soon can behave unpredictably rather than exercising the
   real killed-app push-wake path this section is testing.
3. From **Device B** (or the web softphone against the ASHTI store), place a
   call to Device A's app-user phone number.
4. Device A's lockscreen should show the full-screen incoming-call ring UI
   within roughly **2-5 seconds** of the call being placed — this covers the
   FCM push round-trip plus the app cold-starting into the ringing state.
5. Tap **Answer**. This should open the app and connect the call with
   two-way audio, the same as the app-alive case in section 3.

### Known limits

- **Decline only dismisses the call locally.** It does not signal the caller
  to hang up — the caller keeps ringing until their own call timeout elapses.
- **iOS is not built for this yet.** Phase 3 incoming-call wake and
  full-screen ringing is Android-only so far.
- **selx mid-ring re-INVITE risk.** There's a known risk that a re-INVITE
  from selx during the ring window can race the app's cold start. Symptom:
  the lockscreen ring shows as expected, but tapping Answer results in
  "Missed call — couldn't connect in time." instead of a connected call. If
  this reproduces **consistently** (not a one-off), report it to the
  developer rather than treating it as expected behavior.
- **A push-woken call almost always picks up TURN now, but a very fast INVITE
  can still connect STUN-only.** The credential loop applies a fresh,
  TURN-bearing config on top of an already-registered push-wait engine as
  soon as it lands (a UA rebuild there only costs a re-REGISTER, since
  there's no live session yet to drop). If that fresh fetch loses the race
  against an unusually fast INVITE, that one call can still end up
  STUN-only. On restrictive networks (e.g. carrier NAT, some corporate
  Wi-Fi) this can cause one-way audio for that call specifically; any call
  after the fetch has landed gets TURN normally.
- **Android 13+ requires the runtime POST_NOTIFICATIONS permission.** If the
  user denies it (or it's never granted), the phone will never ring for an
  incoming call AND the FCM token never finishes registering — this can look
  identical to a server/push misconfiguration. Check the permission is
  granted (Settings → Apps → the app → Notifications) before assuming
  anything else is broken.
- **Android 14+ may degrade the full-screen intent to a heads-up
  notification** for apps that aren't the device's default phone/dialer app
  — expected on some OEM/Android-version combinations, not a bug in this
  app. The call is still answerable from the heads-up notification; it just
  won't take over the lockscreen the same way a real incoming-call UI does.
- **OEM battery optimization can silently drop the push entirely** on some
  manufacturers' Android builds (notably aggressive background-kill
  policies on Xiaomi/MIUI, Huawei, OnePlus/OxygenOS, and similar). If
  killed-app ringing is unreliable on a specific device, check that the app
  is whitelisted/exempted from battery optimization (wording varies by OEM,
  usually under Settings → Battery → the app → "no restrictions" /
  "unrestricted" / "allow background activity").

## 7. Metering (Phase 4)

Phase 4 adds server-side deduction of free minutes for PSTN calls, replacing
the Phase 2 local countdown with exact webhook-driven accounting. This section
covers how deduction works and how to verify it end-to-end.

### How deduction works

Deduction is **webhook-driven and exactly-once**: when a PSTN call ends, selx
sends a webhook to xcall with the call's duration. The xcall metering service
deducts that many seconds from the app user's `AppUser.remainingSeconds`
balance. Key behaviors:

- **Balance floor is 0.** A call can overrun its remaining budget — if a user
  has 30 seconds left and places a 60-second PSTN call, the call completes
  and the balance goes to 0 (not negative). This avoids mid-call server caps
  that would hang up the user mid-sentence.

- **Profile refresh is two-stage.** After hang-up, the profile refreshes
  immediately (within ~1-2s), but usually still shows the pre-deduction balance
  (the webhook hasn't landed yet). A second refresh happens automatically ~15s
  later and picks up the deduction as a safety resync (to pick up the webhook
  or recover from race conditions).

- **Internal and inbound calls are free.** App-to-app calls (`kind: INTERNAL`)
  and inbound calls (`kind: INBOUND`) are self-reported by the app after the
  call ends and carry zero charge — they appear in the admin Recent calls view
  but do not decrement the balance.

- **Contacts with the app show a FREE badge.** On the in-app contacts/dialer
  screen, app users are labeled as FREE to signal they won't incur charges.

### Test script

1. **On the app:** Open the profile screen and note your current remaining
   minutes (the balance shown in the in-app profile).

2. **Place a PSTN call** of approximately **1 minute** (dial a real external
   number or use a test line).

3. **Hang up** after the call ends.

4. **Wait 15–30 seconds** for the webhook to arrive and the profile refresh
   to complete.

5. **Check the profile again.** The remaining minutes should have decreased
   by roughly 1 minute (allowing a few seconds of variation for rounding or
   setup time).

6. **Verify in the admin panel:** Go to `http://localhost:3000/admin/calling-app`
   (or your LAN IP), click **Recent calls**, and confirm:
   - The call appears in the list with `kind: 'PSTN'`.
   - The **Charged** column shows the duration you just burned (should
     be close to 60 for a ~1-min call).
   - No charge appears for internal calls (`kind: 'INTERNAL'`) or inbound
     calls (`kind: 'INBOUND'`), if tested.

### Schema prerequisites

**All Phase 4 features depend on the xcall database schema being updated.**
Before testing metering, ensure that `yarn db:push` has been run in the xcall
repo **with Phase 4 schema present**. Phase 4 adds two unique constraints:

- `AppCallLog.selxCallId` — unique per selx webhook (ensures exactly-once
  deduction even if the webhook retries).
- `StoreUserExt` — unique index on `[storeId, extension]` (enables correct
  extension routing and prevents accidental duplicates).

If `yarn db:push` was run **before Phase 4 changes landed**, re-run it now to
pick up the new schema:

```sh
# in the xcall repo
yarn db:push
```

**If the push fails with a unique constraint violation on `StoreUserExt`:**
The live database has duplicate extension rows for the same store. These must
be cleaned up before the push can succeed. Contact your database administrator
or the xcall team — the cleanup is a one-time data migration that will depend
on your specific duplicate pattern.
