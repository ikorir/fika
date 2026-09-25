# Ticket 02, repair attempt 2: the banner no longer shifts the Today content

Result: done. Nothing is committed.

## Change
In `mobile/src/app/index.tsx` only, the Today `ScrollView` is now `Animated.ScrollView` with `layout={layout}` from
`useMotion()`. The plain `ScrollView` import is gone, and nothing else in the file changed. With reduce motion on,
`layout` is undefined, so the content moves at once, as before.

## Checks (2026-09-25)
- `npm test` in `mobile/`: 31 suites, 303 of 303 pass.
- `npm run typecheck`: clean.
- React Compiler script: `TodayScreen` compiles with no errors.
- `Animated` from `react-native` grep, repo root: empty.

## RefreshControl (for ticket 05)
Reanimated's `Animated.ScrollView` is `createAnimatedComponent(ScrollView)` and passes every ScrollView prop through.
I ran a Jest probe and then deleted it. The host ScrollView received `layout` (250 ms) and the `refreshControl`
element. RN's Jest ScrollView keeps `refreshControl` as a prop and does not render it as a child, so a pull cannot be
fired in Jest, for a plain ScrollView as for this one. I added no permanent test. TodayScreen can't be rendered in
Jest without mocking maps, notifications and the router. A test can't sit in `app/` either, because Expo Router would
treat it as a route.

Side note: `Animated.ScrollView` defaults `scrollEventThrottle` to 1. That only matters if an `onScroll` is added later.

## Device check
1. In Demo mode, turn on the accident, then reset. When the banner comes in and goes out, the hero and cards ease
   about 30 pt instead of jumping.
2. From ticket 05 on: pull to refresh still works.
