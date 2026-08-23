<h1 align="center">Changelog</h1>

<p align="center">
  <strong>English</strong> | <a href="CHANGELOG_zh.md">简体中文</a>
</p>

All notable changes to this project will be documented in this file.

---

### v1.5.0
`2026-08-23 21:50`

- Added a floating "Settings" menu at the bottom right corner of the page.
- Added support for customizing the AC (Accepted) background color via the settings menu, with configuration persisted locally.

---

### v1.4.2
`2026-08-23 18:25`

- Optimized text readability for higher ratings. For problem ratings `>= 1600` (Blue tier and above), the font color now automatically switches to high-contrast white (`#FFFFFF`).

---

### v1.4.1
`2026-08-23 18:00`

- Changed the time formatting from `yyyy-mm-dd hh:mm` to `yyyy/mm/dd hh:mm` for better readability.

---

### v1.4.0
`2026-08-23 17:33`

- Optimized difficulty rating and AC status display on contest pages.
- Optimized difficulty rating display on hacks pages.
- Optimized time formatting and table layout on submissions/status pages.
- Added problem rating color display to problem tags.

---

### v1.3.5
`2026-08-22 23:50`

- Displays problem difficulty ratings directly on `submissions` and `status` pages, complete with corresponding color highlighting.
- Fetches problem data via the official Codeforces API and updates locally only once per day, avoiding excessive network requests.
