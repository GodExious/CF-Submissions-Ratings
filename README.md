<h1 align="center">CF-Submissions-Ratings</h1>

<p align="center">
  <strong>English</strong> | <a href="docs/README_zh.md">简体中文</a>
</p>

<p align="center">
  <a href="docs/CHANGELOG.md">
    <img src="https://img.shields.io/badge/Changelog-v1.4.0-orange?style=flat-square" alt="Changelog">
  </a>
  <a href="https://github.com/GodExious/CF-Submissions-Ratings/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/GodExious/CF-Submissions-Ratings?style=flat-square&color=blue" alt="License">
  </a>
  <a href="https://www.tampermonkey.net/">
    <img src="https://img.shields.io/badge/Userscript-Tampermonkey-green?style=flat-square" alt="Tampermonkey">
  </a>
</p>

A lightweight, highly optimized Tampermonkey user script for Codeforces that fetches and elegantly displays problem difficulty ratings directly on the Status and Submissions pages. 

## 📸 Screenshots
<p align="center">
  <img src="imgs/status.png" alt="Status Page" width="800">
  <br>
  <em>Direct rating display and optimized time formatting on the Status page</em>
</p>
<p align="center">
  <img src="imgs/submissions.png" alt="Submissions Page" width="800">
  <br>
  <em>Seamless integration with your highlighted rows on the Submissions page</em>
</p>
<p align="center">
  <img src="imgs/contest-problem.png" alt="Contest Problems" width="800">
  <br>
  <em>Optimized difficulty rating and AC status display on the Contest problem list</em>
</p>
<p align="center">
  <img src="imgs/contest-standings.png" alt="Contest Standings" width="800">
  <br>
  <em>Difficulty rating display on the Contest standings page</em>
</p>
<p align="center">
  <img src="imgs/problem-tags.png" alt="Problem Tags" width="800">
  <br>
  <em>Added problem rating color display to problem tags</em>
</p>

## ✨ Features
- Displays problem difficulty ratings directly on `submissions` and `status` pages, with optimized time formatting and table layout.
- Optimized difficulty rating and AC status display on `contest` pages.
- Optimized difficulty rating display on `hacks` pages.
- Added problem rating color display to `problem tags`.
- Fetches problem data via the official Codeforces API and updates locally only once per day, avoiding excessive network requests.

## 🚀 Installation
1. Install a user script manager like [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Click the link below to install the script directly:
   
   👉 **[Install cf-submission-ratings](https://raw.githubusercontent.com/GodExious/CF-Submissions-Ratings/main/cf-submission-ratings.user.js)**

3. Refresh any Codeforces status page, and enjoy!

## 💡 Feedback & Contributions
If you have any suggestions, feature requests, or find any bugs, please feel free to open an [Issue](https://github.com/GodExious/CF-Submissions-Ratings/issues) in this repository! Contributions and Pull Requests are always welcome.

## 👏 Acknowledgments
This plugin was mainly inspired by [Codeforces-Helper](https://chromewebstore.google.com/detail/codeforces-helper/ahoeafmlmoohkkalcickdnkifpfnolpj). However, since that extension does not support displaying problem ratings on the `status` page, I had an AI (Antigravity 1.23.2) help me write and implement this project.

## 📄 License
Released under the [MIT License](LICENSE).
