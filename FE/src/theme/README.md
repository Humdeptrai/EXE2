# HandsFree color themes

`theme.ts` owns the light/dark preference. An explicit selection is saved in
`handsfree-theme`; otherwise the operating-system preference is followed.
`public/theme-init.js` applies the same choice before the app loads.

User controls are in the account popover. The operator control replaces the
existing role badge contents and keeps its original dimensions on mobile and
desktop. Neither control changes business data or API requests.

The original route CSS and Tailwind classes remain the light theme.
`scripts/generate-dark-theme.mjs` derives a scoped color-only dark layer from
those sources, preserving selectors, media queries, image URLs and dimensions.
It runs before development/build. Do not edit `dark.generated.css` manually;
keep specific visual refinements in `theme.css`. Add new semantic color rules
to the generator when introducing a new color syntax.

Build first, then run `tests/theme.browser.cjs` with Playwright installed
(`PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` may point to separate installations).
It compares user/admin geometry at 1440, 768, 390 and 320px and exercises saved
preferences, cross-tab updates, system preferences and modal colors.
