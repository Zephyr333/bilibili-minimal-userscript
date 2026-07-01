# Bilibili Minimal Userscript

Tampermonkey userscript for keeping Bilibili focused on search and current content.

## Rules

- Keep one top-left home entry, the search box, avatar, messages/private messages, favorites, and history.
- Hide the Bilibili logo and left navigation entries such as bangumi, live, game center, member shop, manga, match, and app download.
- Hide extra right-side controls such as VIP, dynamic feed, creator center, and upload.
- Hide hot search modules across Bilibili pages.
- Keep search history visible while removing hot search and "recently updated" recommendation text from the search box.
- Hide live entry points, including live search result cards, live links, and visible "live now" badges.
- Redirect `live.bilibili.com/*` back to the Bilibili homepage.
- Clear the Bilibili homepage body so it does not show feeds, channels, swipes, or recommendation cards.
- Hide homepage floating buttons such as refresh, more actions, and back-to-top.
- On video pages, keep the current video, uploader panel, comments, danmaku, and playlists/sections; hide recommendation lists, ads, ending panels, and autoplay controls.
- On search pages, keep search type tabs, filters, result cards, and pagination; hide bangumi, movie, and live tabs, plus hot search, ads, activity promotions, footer, login prompts, and everything below pagination.
- Do not redirect `search.bilibili.com/all?...` to `search.bilibili.com/video?...`.

## Install

Open `src/bilibili-minimal.user.js` in Tampermonkey and install it as a userscript.

## Checks

```powershell
npm run check
npm run test:fixture
npm run test:real
```

`test:fixture` validates the rules against local DOM fixtures. `test:real` opens real Bilibili pages and may fail if the site is blocked or changes its markup.
