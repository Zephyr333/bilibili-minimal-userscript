# Bilibili Minimal Userscript

Tampermonkey userscript for keeping Bilibili focused on search and current content.

## Rules

- Keep the Bilibili logo, search box, and right-side user controls.
- Hide left navigation entries such as home, bangumi, live, game center, member shop, manga, match, and app download.
- Hide hot search modules across Bilibili pages.
- Clear the Bilibili homepage body so it does not show feeds, channels, swipes, or recommendation cards.
- On video pages, keep the current video, uploader panel, comments, danmaku, and playlists/sections; hide recommendation lists, ads, ending panels, and autoplay controls.
- On search pages, keep search type tabs, filters, and result cards; hide hot search, ads, and activity promotions.
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
