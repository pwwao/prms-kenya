# PRMS Kenya — Mobile Application (React Native Team)

Patient Referral Management System mobile client for Clinicians and Receptionists.
Built strictly against `PRMS_API_Reference_v1_0.md`, `PRMS_OpenAPI_v1_0.yaml`, and
`PRMS_UserRoles_UserFlows_UITeam.md`.

## Stack

- **React Native 0.74** + TypeScript
- **Navigation:** React Navigation (native-stack + bottom-tabs)
- **State:** Redux Toolkit (auth, connectivity) + redux-persist (MMKV-backed)
- **Server cache:** React Query (referrals, patients, notifications, hospitals)
- **Offline DB:** WatermelonDB (SQLite) — patients, referrals, notifications, sync queue
- **Real-time:** Socket.IO client (`/chat` namespace)
- **Push:** Firebase Cloud Messaging + `react-native-push-notification` for local display
- **Secure storage:** `react-native-keychain` for JWT tokens, MMKV for everything else

## Project Structure

```
src/
  api/            Axios client, REST service modules, Socket.IO client, React Query config, push notifications
  components/     Reusable UI: common/, chat/, referral/, notifications/
  constants/      Counties, route names, app config, error codes
  db/             WatermelonDB schema, models, sync engine
  hooks/          useAuth, useConnectivity, useDebounce, useNotificationBadge
  navigation/     Root navigator, auth stack, tab navigator, per-tab stacks
  screens/        auth/, dashboard/, patients/, referrals/, chat/, notifications/, profile/
  store/          Redux slices: auth, connectivity
  theme/          Design tokens (colors, typography, spacing, shadows)
  types/          Domain types mirroring the API contract exactly
  utils/          Helpers, formatters, validators, secure token storage
```

## Key Architectural Decisions

**Offline-first.** Patient registration and referral creation work offline:
mutations write to WatermelonDB immediately and queue in `sync_queue`. The
`useConnectivity` hook triggers `performSync()` on reconnect, which flushes
the queue (POSTs to the real endpoints) before pulling server changes via
`POST /sync`.

**Auth.** Access token (15 min) stored in Keychain, attached via Axios
interceptor. On 401, a single in-flight refresh call is queued so concurrent
requests don't trigger duplicate refreshes. 2FA (TOTP/SMS) is a separate
screen gated on `preAuthToken` from the login response.

**Role-gated UI.** `useAuth().permissions` encodes the exact role × status
action matrix from the user flows doc (Appendix C) — dispatch, mark-received,
accept/reject, mark-complete, re-dispatch, and chat access all check this
before rendering action buttons.

**Chat.** Real-time only, scoped to the Clinician role per the user flows
doc. Socket.IO connects once at app root; `ChatScreen` joins/leaves the
`referral:{id}` room on focus/blur and reconciles optimistic local messages
against `NEW_MESSAGE` echoes by sender + content matching.

**Notifications.** Tab badge count polls `GET /notifications?isRead=false`
every 60s as a fallback to FCM; FCM foreground/background handlers also
invalidate the relevant React Query caches so the UI is consistent regardless
of which channel delivered the update first.

## Setup

```bash
npm install
cp .env.example .env   # fill in actual API/WS URLs
npx pod-install ios    # iOS only

npm run android
npm run ios
```

Firebase: add `google-services.json` (Android) and `GoogleService-Info.plist`
(iOS) to the native project directories per `@react-native-firebase/app` docs
— not included here since these are project-specific secrets.

## Testing

```bash
npm test         # Jest unit tests — helpers, Redux slices
npm run typecheck
npm run lint
```

Included unit tests cover the role × status permission matrix (`helpers.ts`),
masking/validation utilities, and the auth Redux reducer. Screen-level and
integration tests (React Native Testing Library, Detox) are recommended as a
follow-up but are out of scope for this initial delivery.

## Not Included (Backend Team Scope)

Per instructions, no backend/server code is included. This module assumes
the REST API and Socket.IO `/chat` namespace described in
`PRMS_API_Reference_v1_0.md` are deployed and reachable at the configured
`API_BASE_URL` / `WS_URL`.
