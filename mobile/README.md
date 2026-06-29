# Wolf ERP — Mobile

Native Android/iOS client for Wolf ERP, built for **Flipkart-grade smoothness**:
60/120fps scrolling, instant perceived loads, and minimal re-renders.

## Tech stack (frontend)

| Concern | Choice |
| --- | --- |
| Runtime / routing | **Expo SDK 56** + **expo-router** (file-based, typed routes) |
| Styling | **react-native-unistyles 3** (Nitro — theme updates on the shadow tree, zero React re-renders) |
| Lists | **@shopify/flash-list 2** (cell recycling — the core of smooth scroll) |
| Animation / gesture | **react-native-reanimated 4** + **react-native-gesture-handler** (UI-thread) |
| Images | **expo-image** (disk + memory cache) |
| Server state | **@tanstack/react-query** (stale-while-revalidate + polling) |
| Client state | **zustand** |
| Sheets | **@gorhom/bottom-sheet** |
| Forms | **react-hook-form** + **zod** |
| Feedback | **expo-haptics** + animated skeletons |

> Unistyles, FlashList, Reanimated and bottom-sheet all ship native code, so this
> app **does not run in Expo Go** — use a development build.

## Run it

```bash
npm install
npx expo prebuild --clean      # generate native projects (first time / after native dep changes)
npx expo run:android           # build + launch on device/emulator
# or: npx expo run:ios
```

## Architecture

```
src/
  app/                 expo-router routes
    (auth)/login       sign-in
    (app)/             tab shell: index (dashboard), orders, approvals, vendors, activity
    po/[id]            purchase-order detail (pushed over tabs)
  api/
    client.ts          data access layer — single switch to go live (USE_LIVE)
    hooks.ts           typed React Query hooks (infinite lists, polling, optimistic)
    queryClient.ts     query client + central query keys
    mock/fixtures.ts   deterministic mock dataset
  components/
    ui/                Screen, Card, Button, Text, StatusPill, Avatar, Skeleton, PressableScale
    list/              SearchHeader, DocRow
    charts/            MiniBars, StackedBar (View-based, no SVG)
    dashboard/         StatCard
  store/auth.ts        zustand session (token in expo-secure-store)
  theme/               design tokens + Unistyles config
  types/domain.ts      ERP domain models (mock + live share this contract)
  lib/                 formatters, hooks
```

### Performance notes
- **Instant, always-fresh data:** React Query renders cached data immediately and
  refreshes in the background (`staleTime` 10s); dashboard/approvals/activity poll
  so headline numbers stay live.
- **Recycled rows:** every list row (`DocRow`, vendor/activity rows) is `memo`-ized
  so FlashList never re-renders an unchanged cell during fast scroll.
- **UI-thread interactions:** taps, skeleton shimmer and chart entrances run via
  Reanimated worklets, so they stay smooth even while JS is fetching.

### Going live
Flip `USE_LIVE` in [`src/api/client.ts`](src/api/client.ts) and point the methods
at the `server/` REST API. Screens, hooks and types are unchanged — only the
adapter swaps.
