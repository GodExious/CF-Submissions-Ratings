// ==UserScript==
// @name         CF-Submissions-Ratings
// @name:zh-CN   Codeforces 提交页/状态页 难度分显示
// @namespace    https://github.com/GodExious/CF-Submissions-Ratings
// @version      1.5.2
// @description  Fetches and displays problem difficulty ratings. Adds a new Rating column to status and submissions tables with color-coded backgrounds.
// @description:zh-CN 自动获取并显示 Codeforces 题目难度分。在 Status 和 Submissions 表格最右侧新增 Rating 列并带有 Codeforces Analytics 风格的色彩高亮，同时完美兼容个人提交记录背景。
// @author       GodExious & Antigravity
// @supportURL   https://github.com/GodExious/CF-Submissions-Ratings/issues
// @match        *://codeforces.com/*
// @match        *://*.codeforces.com/*
// @icon         https://codeforces.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/GodExious/CF-Submissions-Ratings/main/cf-submission-ratings.user.js
// @downloadURL  https://raw.githubusercontent.com/GodExious/CF-Submissions-Ratings/main/cf-submission-ratings.user.js
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js
// @license      MIT
// @grant        none
// ==/UserScript==

/*
 * GitHub Repository: https://github.com/GodExious/CF-Submissions-Ratings
 * If you have any suggestions or find any bugs, please feel free to open an issue!
 * 如果你对本插件有改进建议，欢迎通过 GitHub Issue 提出建议或反馈！
 *
 * Inspired by Codeforces-Helper (https://chromewebstore.google.com/detail/codeforces-helper/ahoeafmlmoohkkalcickdnkifpfnolpj)
 * 灵感来源于 Codeforces-Helper，由于其不支持 status 页面，故仿写并实现了本项目。
 *
 * Mainly implemented by Antigravity 1.23.2
 * 主要由 Antigravity 1.23.2 完成实现
 */

(function () {
    'use strict';

    const CACHE_KEY = 'cf_problems_ratings';
    const CACHE_TIME_KEY = 'cf_problems_ratings_time';
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 1 day in milliseconds

    // Settings Management
    const SETTINGS_KEY = 'cf_submissions_settings';
    const DEFAULT_SETTINGS = {
        acBgColor: '#d4edc9',
        show: {
            submissions: true,
            status: true,
            hacks: true,
            problemset: true,
            contestProblems: true,
            standings: true,
            problemTags: true,
            userAvatar: true,
            langIcon: true,
            shortVerdict: false
        },
        avatarSize: 1.4,
        langIconSize: 1.0,
        timeFormat: {
            enabled: true,
            format: 'YYYY/MM/DD HH:mm'
        },
        displayStyle: 'block',
        lang: 'zh'
    };

    function hexToRgba(hex, alpha) {
        if (!hex || !hex.startsWith('#')) return hex || DEFAULT_SETTINGS.acBgColor;
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function getSettings() {
        const saved = localStorage.getItem(SETTINGS_KEY);
        let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // deep clone
        if (saved) {
            try {
                let parsed = JSON.parse(saved);
                // Migrate from split hex+alpha to unified format
                if (parsed.acBgAlpha !== undefined && parsed.acBgColor && parsed.acBgColor.startsWith('#')) {
                    if (parsed.acBgAlpha < 1) {
                        parsed.acBgColor = hexToRgba(parsed.acBgColor, parsed.acBgAlpha);
                    }
                    delete parsed.acBgAlpha;
                }

                settings.acBgColor = parsed.acBgColor || settings.acBgColor;
                if (parsed.show) Object.assign(settings.show, parsed.show);
                settings.avatarSize = parsed.avatarSize !== undefined ? parsed.avatarSize : settings.avatarSize;
                settings.langIconSize = parsed.langIconSize !== undefined ? parsed.langIconSize : settings.langIconSize;
                if (settings.langIconSize >= 5) {
                    settings.langIconSize = parseFloat((settings.langIconSize / 14).toFixed(1));
                }
                if (parsed.timeFormat) Object.assign(settings.timeFormat, parsed.timeFormat);
                settings.lang = parsed.lang || settings.lang;
                settings.displayStyle = parsed.displayStyle || settings.displayStyle;

                saveSettings(settings);
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        return settings;
    }

    function getLanguageIconName(langStr) {
        langStr = langStr.toLowerCase();
        if (langStr.includes('c++') || langStr.includes('g++')) return 'cplusplus';
        if (langStr.includes('c#')) return 'csharp';
        if (langStr.includes('python') || langStr.includes('pypy')) return 'python';
        if (langStr.includes('java') && !langStr.includes('javascript')) return 'java';
        if (langStr.includes('rust')) return 'rust';
        if (/\bgo\b/.test(langStr)) return 'go';
        if (langStr.includes('kotlin')) return 'kotlin';
        if (langStr.includes('ruby')) return 'ruby';
        if (langStr.includes('node.js') || langStr.includes('nodejs')) return 'nodejs';
        if (langStr.includes('javascript') || langStr.includes('v8')) return 'javascript';
        if (langStr.includes('php')) return 'php';
        if (langStr.includes('haskell')) return 'haskell';
        if (langStr.includes('scala')) return 'scala';
        if (langStr.includes('ocaml')) return 'ocaml';
        if (langStr.includes('perl')) return 'perl';
        if (langStr.includes('f#')) return 'fsharp';
        if (langStr.includes('delphi')) return 'delphi';
        if (/\bd\b/.test(langStr) || langStr.includes('dmd')) return 'd';
        if (langStr.includes('gcc') || langStr.includes('clang') || /\bc(?:89|99|11|17|18|23|2x)?\b/.test(langStr)) return 'c';
        return null;
    }

    const appSettings = getSettings();

    function customFormatTime(d, formatStr) {
        const yyyy = d.getFullYear().toString();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const HH = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');

        return formatStr
            .replace(/YYYY/g, yyyy)
            .replace(/MM/g, MM)
            .replace(/DD/g, DD)
            .replace(/HH/g, HH)
            .replace(/mm/g, mm)
            .replace(/ss/g, ss);
    }

    // Inject Global Custom CSS for AC Background
    const customStyle = document.createElement('style');
    customStyle.innerHTML = `
        tr.accepted-problem td {
            background-color: ${appSettings.acBgColor} !important;
        }
        .pcr-app {
            z-index: 9999999 !important;
        }
        /* Widen the Pickr nano theme and adjust interaction layout */
        .pcr-app[data-theme="nano"] {
            width: 240px !important;
        }
        .pcr-app[data-theme="nano"] .pcr-interaction {
            flex-wrap: wrap !important;
        }
        .pcr-app[data-theme="nano"] .pcr-interaction .pcr-result {
            flex: 1 1 100% !important;
            width: 100% !important;
            min-width: 100% !important;
            margin-top: 8px !important;
        }

        /* Custom Toggle Switch */
        .cf-toggle-switch {
            position: relative;
            display: inline-block;
            width: 34px;
            height: 18px;
            margin-right: 8px;
            flex-shrink: 0;
            vertical-align: middle;
        }
        .cf-toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .cf-toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #ccc;
            transition: .2s;
            border-radius: 18px;
        }
        .cf-toggle-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .2s;
            border-radius: 50%;
        }
        .cf-toggle-switch input:checked + .cf-toggle-slider {
            background-color: #1890ff;
        }
        .cf-toggle-switch input:checked + .cf-toggle-slider:before {
            transform: translateX(16px);
        }
    `;
    document.head.appendChild(customStyle);

    // Inject Pickr CSS
    const pickrCss = document.createElement('link');
    pickrCss.rel = 'stylesheet';
    pickrCss.href = 'https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css';
    document.head.appendChild(pickrCss);

    // Auto dark theme detection
    const isDarkTheme = () => {
        // Dark Reader will handle inverting our light colors automatically as long as we don't use !important
        if (document.querySelector('.darkreader') || document.querySelector('meta[name="darkreader"]')) return false;
        if (document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark')) return true;
        try {
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            const match = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const brightness = (parseInt(match[1]) * 299 + parseInt(match[2]) * 587 + parseInt(match[3]) * 114) / 1000;
                if (brightness < 128) return true;
            }
        } catch (e) { }
        return false;
    };

    // Fine-grained background colors matching Codeforces Analytics / extended rating systems
    function getRatingBgColor(rating) {
        if (isDarkTheme()) {
            if (rating < 1200) return '#444444'; // Gray
            if (rating < 1400) return '#1A4D1A'; // Green
            if (rating < 1600) return '#1A4D4D'; // Cyan
            if (rating < 1900) return '#1A1A4D'; // Blue
            if (rating < 2100) return '#4D1A4D'; // Violet
            if (rating < 2300) return '#4D331A'; // Light Orange
            if (rating < 2400) return '#66331A'; // Orange
            if (rating < 2600) return '#4D1A1A'; // Light Red
            if (rating < 3000) return '#661A1A'; // Red
            return '#800000'; // Dark Red
        }
        if (rating < 1200) return '#CCCCCC'; // Gray (Newbie)
        if (rating < 1400) return '#77FF77'; // Green (Pupil)
        if (rating < 1600) return '#77DDBB'; // Cyan (Specialist)
        if (rating < 1900) return '#AAAAFF'; // Blue (Expert)
        if (rating < 2100) return '#FF88FF'; // Violet (Candidate Master)
        if (rating < 2300) return '#FFCC88'; // Light Orange (Master)
        if (rating < 2400) return '#FFBB55'; // Orange (International Master)
        if (rating < 2600) return '#FF7777'; // Light Red (Grandmaster)
        if (rating < 3000) return '#FF3333'; // Red (International Grandmaster)
        return '#CC2222'; // Dark Red (Legendary Grandmaster+)
    }

    // Darker border colors for the roundbox tags
    function getRatingBorderColor(rating) {
        if (rating < 1200) return '#AAAAAA'; // Gray
        if (rating < 1400) return '#44CC44'; // Green
        if (rating < 1600) return '#44AA88'; // Cyan
        if (rating < 1900) return '#7777CC'; // Blue
        if (rating < 2100) return '#CC55CC'; // Violet
        if (rating < 2300) return '#CC9955'; // Light Orange
        if (rating < 2400) return '#CC8822'; // Orange
        if (rating < 2600) return '#CC4444'; // Light Red
        if (rating < 3000) return '#CC0000'; // Red
        return '#990000'; // Dark Red
    }

    // Fine-grained text colors when appending rating as text next to standalone links
    function getRatingTextColor(rating) {
        if (rating < 1200) return '#808080';
        if (rating < 1400) return '#008000';
        if (rating < 1600) return '#03A89E';
        if (rating < 1900) return '#0000FF';
        if (rating < 2100) return '#AA00AA';
        if (rating < 2300) return '#FF8C00';
        if (rating < 2400) return '#FF8C00';
        if (rating < 2600) return '#FF0000';
        if (rating < 3000) return '#FF0000';
        return '#AA0000';
    }

    // IViewUI / Ant Design style aesthetic tags
    function getRatingTagStyle(rating) {
        let bg, border, text;
        const isDark = isDarkTheme();
        if (rating < 1200) { bg = isDark ? '#262626' : '#f7f7f7'; border = isDark ? '#434343' : '#e6e6e6'; text = isDark ? '#bfbfbf' : '#808080'; } // Gray
        else if (rating < 1400) { bg = isDark ? '#135200' : '#f6ffed'; border = isDark ? '#237804' : '#b7eb8f'; text = isDark ? '#73d13d' : '#389e0d'; } // Green
        else if (rating < 1600) { bg = isDark ? '#00474f' : '#e6fffb'; border = isDark ? '#006d75' : '#87e8de'; text = isDark ? '#36cfc9' : '#08979c'; } // Cyan
        else if (rating < 1900) { bg = isDark ? '#002c8c' : '#e6f7ff'; border = isDark ? '#003eb3' : '#91d5ff'; text = isDark ? '#40a9ff' : '#096dd9'; } // Blue
        else if (rating < 2100) { bg = isDark ? '#531dab' : '#f9f0ff'; border = isDark ? '#722ed1' : '#d3adf7'; text = isDark ? '#b37feb' : '#531dab'; } // Violet
        else if (rating < 2400) { bg = isDark ? '#873800' : '#fff2e8'; border = isDark ? '#ad4e00' : '#ffd8bf'; text = isDark ? '#ff7a45' : '#d4380d'; } // Orange
        else if (rating < 3000) { bg = isDark ? '#a8071a' : '#fff1f0'; border = isDark ? '#cf1322' : '#ffa39e'; text = isDark ? '#ff4d4f' : '#cf1322'; } // Red
        else { bg = isDark ? '#434343' : '#fff0f6'; border = isDark ? '#8c8c8c' : '#ffadd2'; text = isDark ? '#eb2f96' : '#c41d7f'; } // Dark Red (Legendary)
        return { bg, border, text };
    }

    // Fetch ratings from CF API or LocalStorage cache
    async function getRatings() {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const now = Date.now();

        // Use cache if it's fresh
        if (cached && cachedTime && (now - cachedTime < CACHE_EXPIRY)) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Codeforces Rating Helper: Failed to parse cached ratings', e);
            }
        }

        // Fetch new ratings
        try {
            console.log('Codeforces Rating Helper: Fetching problem ratings...');
            const response = await fetch('https://codeforces.com/api/problemset.problems');
            const data = await response.json();

            if (data.status === 'OK') {
                const ratingsMap = {};
                for (const p of data.result.problems) {
                    if (p.rating) {
                        ratingsMap[`${p.contestId}${p.index}`] = p.rating;
                    }
                }

                // Save to localStorage
                localStorage.setItem(CACHE_KEY, JSON.stringify(ratingsMap));
                localStorage.setItem(CACHE_TIME_KEY, now);

                console.log('Codeforces Rating Helper: Ratings fetched and cached successfully.');
                return ratingsMap;
            } else {
                console.error('Codeforces Rating Helper: API returned status', data.status);
            }
        } catch (e) {
            console.error('Codeforces Rating Helper: Failed to fetch ratings API', e);
        }

        // Fallback to cached if fetch failed but we have something
        if (cached) {
            try { return JSON.parse(cached); } catch (e) { }
        }

        return {};
    }

    // Apply ratings to tables and standalone links
    function applyRatings(ratingsMap) {
        if (!ratingsMap || Object.keys(ratingsMap).length === 0) return;

        function applyRatingStyle(cell, rating) {
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';

            if (appSettings.displayStyle === 'tag') {
                cell.textContent = '';
                cell.style.setProperty('background-color', 'transparent', 'important');
                const tagStyle = getRatingTagStyle(rating);
                const tagSpan = document.createElement('span');
                tagSpan.textContent = rating;
                tagSpan.style.cssText = `
                    display: inline-block !important;
                    padding: 1px 6px !important;
                    border-radius: 4px !important;
                    border: 1px solid ${tagStyle.border} !important;
                    background-color: ${tagStyle.bg} !important;
                    color: ${tagStyle.text} !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                `;
                cell.appendChild(tagSpan);
            } else {
                cell.textContent = rating;
                cell.style.setProperty('background-color', getRatingBgColor(rating), 'important');
                cell.style.setProperty('color', isDarkTheme() ? '#EEEEEE' : (rating >= 1600 ? 'white' : 'black'), 'important');
                cell.style.setProperty('font-weight', 'normal', 'important');
            }
        }

        const regexes = [
            /\/contest\/(\d+)\/problem\/([A-Za-z0-9_]+)/i,
            /\/problemset\/problem\/(\d+)\/([A-Za-z0-9_]+)/i,
            /\/gym\/(\d+)\/problem\/([A-Za-z0-9_]+)/i
        ];

        function getProblemRatingFromHref(href) {
            for (const regex of regexes) {
                const match = href.match(regex);
                if (match) {
                    return { contestId: match[1], index: match[2], rating: ratingsMap[`${match[1]}${match[2]}`] };
                }
            }
            return null;
        }
        // Walk through nodes to replace verdict text with abbreviations
        function walkAndReplaceVerdict(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                let txt = node.textContent;
                if (!txt.trim()) return;

                const map = {
                    'Accepted': 'AC',
                    'Wrong answer': 'WA',
                    'Time limit exceeded': 'TLE',
                    'Memory limit exceeded': 'MLE',
                    'Runtime error': 'RE',
                    'Compilation error': 'CE',
                    'Idleness limit exceeded': 'ILE',
                    'Presentation error': 'PE',
                    'Skipped': 'SK'
                };

                let matched = false;
                let htmlStr = txt;
                for (let key in map) {
                    const regex = new RegExp(key, 'gi');
                    if (regex.test(htmlStr)) {
                        matched = true;
                        htmlStr = htmlStr.replace(regex, `<b>${map[key]}</b>`);
                    }
                }

                if (matched) {
                    const span = document.createElement('span');
                    span.innerHTML = htmlStr;
                    node.parentNode.replaceChild(span, node);
                }
            } else {
                const children = Array.from(node.childNodes);
                for (let i = 0; i < children.length; i++) {
                    walkAndReplaceVerdict(children[i]);
                }
            }
        }

        // 1. Handle Status Tables and Hacks Tables by adding a new Rating column
        const statusTables = document.querySelectorAll('table.status-frame-datatable, div.datatable table:not(.standings):not(.problems)');
        statusTables.forEach(table => {
            const headerRow = table.querySelector('tr');
            if (!headerRow) return;

            // Find Time/When column index
            let timeColIdx = -1;
            let langColIdx = -1;
            let verdictColIdx = -1;
            let isHacks = window.location.href.includes('/hacks');
            let isStatusOrHacks = false;

            Array.from(headerRow.cells).forEach((th, idx) => {
                const text = th.textContent.toLowerCase();
                if (timeColIdx === -1 && (text.includes('when') || text.includes('time') || text.includes('时间') || text.includes('когда') || text.includes('date'))) {
                    timeColIdx = idx;
                }
                if (langColIdx === -1 && (text.includes('lang') || text.includes('语言') || text.includes('язык'))) {
                    langColIdx = idx;
                }
                if (verdictColIdx === -1 && (text.includes('verdict') || text.includes('结果') || text.includes('вердикт'))) {
                    verdictColIdx = idx;
                }
                if (text.includes('hacker') || text.includes('defender')) {
                    isHacks = true;
                    isStatusOrHacks = true;
                }
                if (text.includes('problem') || text.includes('题目') || text.includes('задача')) {
                    isStatusOrHacks = true;
                }
            });

            if (!isStatusOrHacks) return; // Skip if it's not a status or hacks table (e.g., contest list)

            const path = window.location.pathname.toLowerCase();
            const isSubmissionsPage = path.includes('/my') || path.includes('/submissions');

            let shouldShowRating = false;
            if (isHacks) {
                shouldShowRating = appSettings.show.hacks;
                timeColIdx = -1; // Skip time formatting for hacks page
            } else if (isSubmissionsPage) {
                shouldShowRating = appSettings.show.submissions;
            } else {
                shouldShowRating = appSettings.show.status;
            }

            if (!shouldShowRating && !appSettings.timeFormat.enabled && langColIdx === -1) return;

            // Process Header (Rating Column and Time)
            if (!headerRow.hasAttribute('data-cf-rating-processed')) {
                headerRow.setAttribute('data-cf-rating-processed', 'true');

                // Append timezone to Time column header
                if (timeColIdx !== -1 && appSettings.timeFormat && appSettings.timeFormat.enabled) {
                    const th = headerRow.cells[timeColIdx];
                    let tzStr = 'UTC+3'; // Codeforces default server time (MSK)

                    const firstDataRow = table.querySelector('tr:not(:first-child)');
                    if (firstDataRow && firstDataRow.cells[timeColIdx]) {
                        const tzMatch = firstDataRow.cells[timeColIdx].textContent.match(/UTC[+-]?\d*(:\d+)?/i);
                        if (tzMatch) {
                            tzStr = tzMatch[0].toUpperCase();
                        }
                    }
                    th.innerHTML = `${th.innerHTML}<br><span style="font-size: 0.85em; opacity: 0.8;">(${tzStr})</span>`;
                    if (!isSubmissionsPage) {
                        th.style.setProperty('white-space', 'nowrap', 'important');
                    }
                }

                if (langColIdx !== -1 && appSettings.show && appSettings.show.langIcon !== false) {
                    headerRow.cells[langColIdx].style.setProperty('text-align', 'left', 'important');
                    headerRow.cells[langColIdx].style.setProperty('white-space', 'nowrap', 'important');
                }

                if (verdictColIdx !== -1 && appSettings.show && appSettings.show.shortVerdict) {
                    headerRow.cells[verdictColIdx].style.setProperty('white-space', 'nowrap', 'important');
                }

                if (shouldShowRating) {
                    // Remove 'right' class from the previous last header cell
                    const prevTh = headerRow.querySelector('th.right');
                    if (prevTh) prevTh.classList.remove('right');

                    // Create new Rating header
                    const th = document.createElement('th');
                    th.className = 'top right';
                    th.style.textAlign = 'center';
                    th.style.width = '60px';
                    th.innerHTML = 'Rating';
                    headerRow.appendChild(th);
                }
            }

            // Process data rows
            const dataRows = table.querySelectorAll('tr:not(:first-child)');
            dataRows.forEach(row => {
                // Time Formatting
                if (timeColIdx !== -1) {
                    const timeCell = row.cells[timeColIdx];
                    if (timeCell && appSettings.timeFormat && appSettings.timeFormat.enabled) {
                        const text = timeCell.textContent.trim();
                        // Prevent re-formatting if it already has our format (starts with YYYY/MM/DD or YYYY-MM-DD)
                        if (!/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(text) && text.length >= 8 && /\d/.test(text)) {
                            const newTime = formatTimeStr(text);
                            if (newTime) {
                                timeCell.innerHTML = newTime;
                            }
                        }
                        if (!isSubmissionsPage) {
                            timeCell.style.setProperty('white-space', 'nowrap', 'important');
                        }
                    }
                }

                // Language Icon Formatting
                if (langColIdx !== -1) {
                    const langCell = row.cells[langColIdx];
                    if (langCell && appSettings.show && appSettings.show.langIcon !== false) {
                        langCell.style.setProperty('text-align', 'left', 'important');
                        if (!langCell.hasAttribute('data-cf-lang-icon-processed')) {
                            langCell.setAttribute('data-cf-lang-icon-processed', 'true');
                            const langText = langCell.textContent.trim();
                            const iconName = getLanguageIconName(langText);
                            if (iconName) {
                                const sizePx = 14 * (appSettings.langIconSize || 1.0);
                                const img = document.createElement('img');
                                let svgName = `${iconName}-original.svg`;
                                let customSrc = null;
                                if (iconName === 'go') svgName = 'go-original-wordmark.svg';
                                if (iconName === 'c') {
                                    customSrc = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTI4IDEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjMmM5YTQyIiBkPSJNMTE4Ljc2NiA5NS44MmMuODktMS41NDMgMS40NDEtMy4yOCAxLjQ0MS00Ljg0M1YzNi43OGMwLTEuNTU4LS41NS0zLjI5Ny0xLjQ0MS00Ljg0bC01NS4zMiAzMS45NFptMCAwIi8+PHBhdGggZmlsbD0iIzFiNmQyZSIgZD0ibTY4LjM2IDEyNi41ODYgNDYuOTMzLTI3LjA5NGMxLjM1Mi0uNzgxIDIuNTgyLTIuMTI5IDMuNDczLTMuNjcybC01NS4zMi0zMS45NEw4LjEyIDk1LjgyYy44OSAxLjU0MyAyLjEyMSAyLjg5IDMuNDczIDMuNjcybDQ2LjkzMyAyNy4wOTRjMi43MDMgMS41NjIgNy4xMyAxLjU2MiA5LjgzMiAwWm0wIDAiLz48cGF0aCBmaWxsPSIjNWNjYjc0IiBkPSJNMTE4Ljc2NiAzMS45NDFjLS44OTEtMS41NDYtMi4xMjEtMi44OTQtMy40NzMtMy42NzFMNjguMzU5IDEuMTcyYy0yLjcwMy0xLjU2My03LjEyOS0xLjU2My05LjgzMiAwTDExLjU5NCAyOC4yN0M4Ljg5IDI5LjgyOCA2LjY4IDMzLjY2IDYuNjggMzYuNzh2NTQuMTk2YzAgMS41NjIuNTUgMy4zIDEuNDQxIDQuODQzTDYzLjQ0NSA2My44OFptMCAwIi8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTYzLjQ0NSAyNi4wMzVjLTIwLjg2NyAwLTM3Ljg0MyAxNi45NzctMzcuODQzIDM3Ljg0NHMxNi45NzYgMzcuODQ0IDM3Ljg0MyAzNy44NDRjMTMuNDY1IDAgMjYuMDI0LTcuMjQ3IDMyLjc3LTE4LjkxTDc5Ljg0IDczLjMzNWMtMy4zOCA1Ljg0LTkuNjYgOS40NjUtMTYuMzk1IDkuNDY1LTEwLjQzMyAwLTE4LjkyMi04LjQ4OC0xOC45MjItMTguOTIyIDAtMTAuNDM0IDguNDktMTguOTIyIDE4LjkyMi0xOC45MjIgNi43MyAwIDEzLjAxNyAzLjYyOSAxNi4zOSA5LjQ2NWwxNi4zOC05LjQ3N2MtNi43NS0xMS42NjQtMTkuMzA1LTE4LjkxLTMyLjc3LTE4LjkxeiIvPjwvc3ZnPg==';
                                }
                                if (iconName === 'd') {
                                    customSrc = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTI4IDEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjYjAxYzJlIiBkPSJNMTE4Ljc2NiA5NS44MmMuODktMS41NDMgMS40NDEtMy4yOCAxLjQ0MS00Ljg0M1YzNi43OGMwLTEuNTU4LS41NS0zLjI5Ny0xLjQ0MS00Ljg0bC01NS4zMiAzMS45NFptMCAwIi8+PHBhdGggZmlsbD0iIzhhMTIyMSIgZD0ibTY4LjM2IDEyNi41ODYgNDYuOTMzLTI3LjA5NGMxLjM1Mi0uNzgxIDIuNTgyLTIuMTI5IDMuNDczLTMuNjcybC01NS4zMi0zMS45NEw4LjEyIDk1LjgyYy44OSAxLjU0MyAyLjEyMSAyLjg5IDMuNDczIDMuNjcybDQ2LjkzMyAyNy4wOTRjMi43MDMgMS41NjIgNy4xMyAxLjU2MiA5LjgzMiAwWm0wIDAiLz48cGF0aCBmaWxsPSIjZDkzODRkIiBkPSJNMTE4Ljc2NiAzMS45NDFjLS44OTEtMS41NDYtMi4xMjEtMi44OTQtMy40NzMtMy42NzFMNjguMzU5IDEuMTcyYy0yLjcwMy0xLjU2My03LjEyOS0xLjU2My05LjgzMiAwTDExLjU5NCAyOC4yN0M4Ljg5IDI5LjgyOCA2LjY4IDMzLjY2IDYuNjggMzYuNzh2NTQuMTk2YzAgMS41NjIuNTUgMy4zIDEuNDQxIDQuODQzTDYzLjQ0NSA2My44OFptMCAwIi8+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzUgMjYuMyB2NzUuNCBoMjAgYSAzNy43IDM3LjcgMCAwIDAgMCAtNzUuNCB6IE01MCA0MS4zIGg1IGEgMjIuNyAyMi43IDAgMCAxIDAgNDUuNCBoLTUgeiIvPjwvc3ZnPg==';
                                }
                                img.src = customSrc || `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${iconName}/${svgName}`;
                                img.style.cssText = `width: ${sizePx}px; height: ${sizePx}px; vertical-align: middle; margin-right: 5px;`;

                                const textSpan = document.createElement('span');
                                textSpan.textContent = langText;
                                textSpan.style.cssText = 'display: inline-block; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;';

                                langCell.innerHTML = '';
                                langCell.appendChild(img);
                                langCell.appendChild(textSpan);
                                langCell.title = langText;

                                langCell.style.setProperty('white-space', 'nowrap', 'important');
                                langCell.style.setProperty('max-width', '140px', 'important');
                            }
                        }
                    }
                }

                // Verdict Abbreviation
                if (verdictColIdx !== -1 && appSettings.show && appSettings.show.shortVerdict) {
                    const verdictCell = row.cells[verdictColIdx];
                    if (verdictCell && !verdictCell.hasAttribute('data-cf-verdict-processed')) {
                        verdictCell.setAttribute('data-cf-verdict-processed', 'true');
                        walkAndReplaceVerdict(verdictCell);
                        verdictCell.style.setProperty('white-space', 'nowrap', 'important');
                    }
                }

                if (row.hasAttribute('data-cf-rating-processed')) return;
                row.setAttribute('data-cf-rating-processed', 'true');

                // Skip empty/info rows (like "No submissions found")
                if (row.cells.length <= 1) {
                    if (row.cells.length === 1 && shouldShowRating) {
                        row.cells[0].colSpan = (parseInt(row.cells[0].colSpan) || 1) + 1;
                    }
                    return;
                }

                if (!shouldShowRating) return;

                // Remove 'right' class from the previous last data cell
                const prevTd = row.querySelector('td.right');
                if (prevTd) prevTd.classList.remove('right');

                // Find rating from links in the row
                let problemRating = null;
                const links = row.querySelectorAll('a[href*="/problem/"]');
                for (const link of links) {
                    const info = getProblemRatingFromHref(link.href);
                    if (info && info.rating) {
                        problemRating = info.rating;
                    }
                    // Mark ALL problem links in the datatable so the standalone logic ignores them
                    link.setAttribute('data-cf-rating-added', 'true');
                }

                // Create new Rating cell
                const td = document.createElement('td');
                td.className = 'right';
                td.style.textAlign = 'center';
                td.style.verticalAlign = 'middle';

                if (problemRating) {
                    applyRatingStyle(td, problemRating);
                } else {
                    td.textContent = '';
                }
                row.appendChild(td);
            });
        });

        // 1.5 Handle Standings tables specifically (adding a whole new row under the header)
        const standingsTables = document.querySelectorAll('table.standings:not([data-cf-rating-standings-processed])');
        standingsTables.forEach(table => {
            if (!appSettings.show.standings) return;
            table.setAttribute('data-cf-rating-standings-processed', 'true');

            const headerRow = table.querySelector('tr');
            if (!headerRow) return;

            const ratingRow = document.createElement('tr');
            ratingRow.className = 'cf-rating-standings-row';

            let hasRatings = false;

            Array.from(headerRow.cells).forEach(cell => {
                const newCell = document.createElement('th');
                newCell.style.padding = '0.3em'; // minimal padding

                const link = cell.querySelector('a[href*="/problem/"]');
                if (link) {
                    const info = getProblemRatingFromHref(link.href);
                    if (info && info.rating) {
                        hasRatings = true;
                        applyRatingStyle(newCell, info.rating);
                        if (appSettings.displayStyle === 'block') {
                            newCell.style.setProperty('font-size', '0.9em', 'important');
                            newCell.style.setProperty('padding', '0.2em', 'important');
                        }

                        // Mark the link so it's skipped by standalone processor
                        link.setAttribute('data-cf-rating-added', 'true');
                    }
                }
                ratingRow.appendChild(newCell);
            });

            if (hasRatings) {
                // Insert the new rating row right below the header row
                headerRow.parentNode.insertBefore(ratingRow, headerRow.nextSibling);
            }
        });

        // 1.8 Handle Contest Problems tables specifically (adding a new column to the left of '#')
        const problemsTables = document.querySelectorAll('table.problems:not([data-cf-rating-problems-processed])');
        problemsTables.forEach(table => {
            const isProblemset = window.location.pathname.toLowerCase().includes('/problemset');
            const shouldShowRating = isProblemset ? appSettings.show.problemset : appSettings.show.contestProblems;

            table.setAttribute('data-cf-rating-problems-processed', 'true');

            const headerRow = table.querySelector('tr');
            if (headerRow && shouldShowRating) {
                const th = document.createElement('th');
                th.className = 'top left';
                th.style.width = '4em';
                th.style.textAlign = 'center';
                th.innerHTML = 'Rating';

                const prevTh = headerRow.firstElementChild;
                if (prevTh && prevTh.classList.contains('left')) {
                    prevTh.classList.remove('left');
                }

                headerRow.insertBefore(th, headerRow.firstElementChild);
            }

            const dataRows = table.querySelectorAll('tr:not(:first-child)');
            dataRows.forEach(row => {
                if (row.cells.length < 2) return;

                let td = null;
                const idCell = row.querySelector('td.id');

                if (shouldShowRating) {
                    td = document.createElement('td');
                    td.className = 'left';
                    td.style.textAlign = 'center';
                    td.style.verticalAlign = 'middle';

                    const prevTd = row.firstElementChild;
                    if (prevTd && prevTd.classList.contains('left')) {
                        prevTd.classList.remove('left');
                    }

                    const link = idCell ? idCell.querySelector('a') : row.querySelector('a[href*="/problem/"]');

                    if (link) {
                        const info = getProblemRatingFromHref(link.href);
                        if (info && info.rating) {
                            applyRatingStyle(td, info.rating);
                        }

                        const rowLinks = row.querySelectorAll('a[href*="/problem/"]');
                        rowLinks.forEach(l => l.setAttribute('data-cf-rating-added', 'true'));
                    }

                    row.insertBefore(td, row.firstElementChild);
                }

                // Fix the CF accepted/rejected status styling
                if (row.classList.contains('accepted-problem')) {
                    if (shouldShowRating && idCell) {
                        idCell.style.setProperty('border-left', '1px solid #e1e1e1', 'important');
                    }

                    Array.from(row.cells).forEach(cell => {
                        if (shouldShowRating && cell === td) return;
                        cell.style.setProperty('background-color', appSettings.acBgColor, 'important');
                    });
                } else if (row.classList.contains('rejected-problem')) {
                    if (shouldShowRating && idCell) {
                        idCell.style.setProperty('border-left', '1px solid #e1e1e1', 'important');
                    }

                    Array.from(row.cells).forEach(cell => {
                        if (shouldShowRating && cell === td) return;
                        cell.style.setProperty('background-color', '#ffe3e3', 'important');
                    });
                }
            });
        });


        // 3. Handle actual Problem Page tags (sidebar tags)
        const tagBoxes = document.querySelectorAll('span.tag-box:not([data-cf-rating-added])');
        tagBoxes.forEach(tag => {
            if (!appSettings.show.problemTags) return;
            const text = tag.textContent.trim();
            if (text.startsWith('*')) {
                const ratingMatch = text.match(/^\*\s*(\d+)$/);
                if (ratingMatch && ratingMatch[1]) {
                    const rating = parseInt(ratingMatch[1], 10);
                    tag.setAttribute('data-cf-rating-added', 'true');

                    const parentBox = tag.closest('.roundbox');
                    if (appSettings.displayStyle === 'tag') {
                        const tagStyle = getRatingTagStyle(rating);
                        if (parentBox) {
                            parentBox.style.setProperty('background-color', tagStyle.bg, 'important');
                            parentBox.style.setProperty('border-color', tagStyle.border, 'important');
                            parentBox.style.setProperty('color', tagStyle.text, 'important');
                        }
                        tag.style.setProperty('color', tagStyle.text, 'important');
                    } else {
                        if (parentBox) {
                            parentBox.style.setProperty('background-color', getRatingBgColor(rating), 'important');
                            parentBox.style.setProperty('border-color', getRatingBorderColor(rating), 'important');
                            if (rating >= 1600) {
                                parentBox.style.setProperty('color', 'white', 'important');
                            }
                        }
                        tag.style.setProperty('color', rating >= 1600 ? 'white' : '#000', 'important');
                    }

                    tag.style.setProperty('background-color', 'transparent', 'important');
                }
            }
        });
    }

    function formatTimeStr(text) {
        if (!appSettings.timeFormat.enabled) return null;

        // Extract any UTC suffix (e.g. "UTC+8", "UTC-5", "UTC+3")
        let tzSuffix = '';
        const tzMatch = text.match(/UTC[+-]?\d*(:\d+)?/i);
        if (tzMatch) {
            tzSuffix = tzMatch[0].toUpperCase();
        }

        // Clean text for parsing
        let cleanText = text.replace(/UTC.*$/i, '').trim();

        let d = new Date(cleanText);
        if (isNaN(d.getTime())) {
            // Try parsing Russian format: DD.MM.YYYY HH:MM:SS
            const ruMatch = cleanText.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}(:\d{2})?)/);
            if (ruMatch) d = new Date(`${ruMatch[2]}/${ruMatch[1]}/${ruMatch[3]} ${ruMatch[4]}`);
        }

        if (!isNaN(d.getTime())) {
            return customFormatTime(d, appSettings.timeFormat.format);
        }
        return null;
    }

    function applyTimeFormatting() {
        const timeSpans = document.querySelectorAll('.format-time:not([data-custom-formatted]), .format-date:not([data-custom-formatted])');
        timeSpans.forEach(span => {
            const text = span.textContent.trim();
            if (text.length < 8) return;
            const newTime = formatTimeStr(text);
            if (newTime) {
                span.innerHTML = newTime;
                span.setAttribute('data-custom-formatted', 'true');
                span.classList.remove('format-time');
                span.classList.remove('format-date');
            }
        });
    }

    // Observe DOM changes to apply ratings to newly loaded elements (e.g. via AJAX/PJAX)
    function setupObserver(ratingsMap) {
        const observer = new MutationObserver((mutations) => {
            let shouldApply = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldApply = true;
                    break;
                }
            }
            if (shouldApply) {
                applyRatings(ratingsMap);
                applyUserAvatars();
                setTimeout(applyTimeFormatting, 500);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    const AVATAR_CACHE_KEY = 'cf_user_avatars';

    async function applyUserAvatars() {
        if (!appSettings.show.userAvatar) return;

        const userLinks = document.querySelectorAll('a[href^="/profile/"]:not([data-cf-avatar-processed])');
        const handlesToFetch = new Set();
        const handleToElements = {};

        userLinks.forEach(link => {
            // Skip if it already has an img (like titlePhoto or similar icon)
            if (link.querySelector('img')) return;

            // Skip if it's inside a native CF avatar container or profile main-info
            if (link.closest('.avatar, .main-info')) return;

            // Skip if it's a post author or comment author (they already have native CF avatars)
            // Mentions inside the text body (.ttypography) should still receive avatars.
            if (link.closest('.comment, .topic') && !link.closest('.ttypography')) return;

            const href = link.getAttribute('href');
            const match = href.match(/^\/profile\/([^/]+)$/i);
            if (match && link.textContent.trim().toLowerCase() === match[1].toLowerCase()) {
                link.setAttribute('data-cf-avatar-processed', 'true');
                const handle = match[1];
                handlesToFetch.add(handle);
                if (!handleToElements[handle]) handleToElements[handle] = [];
                handleToElements[handle].push(link);
            }
        });

        if (handlesToFetch.size === 0) return;

        let avatarCache = {};
        try {
            const cached = localStorage.getItem(AVATAR_CACHE_KEY);
            if (cached) avatarCache = JSON.parse(cached);
        } catch (e) { }

        const now = Date.now();
        let missingHandles = [];

        for (const handle of handlesToFetch) {
            const cachedData = avatarCache[handle];
            if (cachedData && (now - cachedData.time < CACHE_EXPIRY)) {
                injectAvatar(handleToElements[handle], cachedData.url);
            } else {
                missingHandles.push(handle);
            }
        }

        if (missingHandles.length > 0) {
            try {
                while (missingHandles.length > 0) {
                    const url = `https://codeforces.com/api/user.info?handles=${missingHandles.join(';')}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.status === 'OK') {
                        for (const user of data.result) {
                            const handle = user.handle;
                            const avatarUrl = user.avatar;
                            avatarCache[handle] = { url: avatarUrl, time: now };
                            injectAvatar(handleToElements[handle] || [], avatarUrl);
                        }
                        localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(avatarCache));
                        break;
                    } else if (data.status === 'FAILED' && data.comment) {
                        const match = data.comment.match(/User with handle (.*?) not found/i);
                        if (match) {
                            const missing = match[1].toLowerCase();
                            missingHandles = missingHandles.filter(h => h.toLowerCase() !== missing);
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            } catch (e) {
                console.error('Codeforces Rating Helper: Failed to fetch user avatars', e);
            }
        }
    }

    function injectAvatar(elements, url) {
        if (!url) return;
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) url = 'https://codeforces.com' + url;

        elements.forEach(el => {
            const td = el.closest('td, th');
            const size = appSettings.avatarSize || 1.4;
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = `width: ${size}em; height: ${size}em; border-radius: 50%; vertical-align: middle; margin-right: 4px; border: 1px solid rgba(0,0,0,0.1); display: inline-block; object-fit: cover;`;

            const isTableLayout = td && el.closest('table.status-frame-datatable, div.datatable table, table.standings, table.rtable') && !el.closest('.ttypography');

            if (isTableLayout) {
                // Ensure the column containing the user is left-aligned
                td.style.setProperty('text-align', 'left', 'important');

                // Fetch or create the avatar container at the very beginning of the cell (before Team Name, flags, etc)
                let avatarContainer = td.querySelector('.cf-avatar-container');
                if (!avatarContainer) {
                    avatarContainer = document.createElement('span');
                    avatarContainer.className = 'cf-avatar-container';
                    avatarContainer.style.cssText = 'white-space: nowrap; vertical-align: middle; margin-right: 4px; display: inline-block;';

                    const lineWrapper = document.createElement('span');
                    lineWrapper.className = 'cf-avatar-line-wrapper';
                    lineWrapper.style.cssText = 'white-space: nowrap; display: inline-block; max-width: 100%;';

                    td.insertBefore(lineWrapper, td.firstChild);
                    lineWrapper.appendChild(avatarContainer);

                    let current = lineWrapper.nextSibling;
                    while (current) {
                        if (current.tagName === 'BR') break;
                        const next = current.nextSibling;
                        lineWrapper.appendChild(current);
                        current = next;
                    }
                }

                // Wrap the image in an anchor so it links to the user profile
                const anchor = document.createElement('a');
                anchor.href = el.href;
                anchor.title = el.textContent.trim();
                anchor.appendChild(img);

                avatarContainer.appendChild(anchor);
            } else {
                // Fallback for non-table elements (e.g., profile page, header)
                el.style.setProperty('white-space', 'nowrap', 'important');
                el.insertBefore(img, el.firstChild);
            }
        });
    }

    // Initialization
    async function init() {
        const ratingsMap = await getRatings();
        applyRatings(ratingsMap);
        applyUserAvatars();
        setTimeout(applyTimeFormatting, 500);
        setupObserver(ratingsMap);
    }

    function createSettingsUI() {
        if (document.getElementById('cf-ratings-settings-btn')) return;

        const i18n = {
            zh: {
                title: 'CFSR 插件设置',
                displayStyleTitle: 'Ratings 展示形式',
                styleBlock: '色块',
                styleTag: '标签',
                acColor: 'AC 背景色',
                locationsTitle: '色彩展示难度分的区域',
                locSubmissions: '提交',
                locStatus: '状态',
                locHacks: 'Hack',
                locProblemset: '题单',
                locContestProblems: '比赛题单',
                locStandings: '比赛榜单',
                locProblemTags: '题目页标签',
                locUserAvatar: '显示用户头像',
                locAvatarSize: '头像大小',
                locLangIcon: '显示语言图标',
                locLangIconSize: '语言图标大小',
                locShortVerdict: '显示状态缩写 (AC/WA等)',
                timeFormatTitle: '自定义时间格式',
                timeFormatPreview: '预览: ',
                timeFormatDisabled: '格式化已关闭',
                saveBtn: '保存并刷新'
            },
            en: {
                title: 'CFSR Settings',
                displayStyleTitle: 'Ratings Display Format',
                styleBlock: 'Block',
                styleTag: 'Tag',
                acColor: 'AC Background',
                locationsTitle: 'Colorized Rating Display Locations',
                locSubmissions: 'Submissions',
                locStatus: 'Status',
                locHacks: 'Hacks',
                locProblemset: 'ProblemSet',
                locContestProblems: 'Contest Problems',
                locStandings: 'Contest Standings',
                locProblemTags: 'Problem Tags',
                locUserAvatar: 'User Avatars',
                locAvatarSize: 'Avatar Size',
                locLangIcon: 'Language Icons',
                locLangIconSize: 'Icon Size',
                locShortVerdict: 'Short Verdicts (AC/WA)',
                timeFormatTitle: 'Custom Time Format',
                timeFormatPreview: 'Preview: ',
                timeFormatDisabled: 'Disabled',
                saveBtn: 'Save & Reload'
            }
        };
        let currentLang = appSettings.lang || 'zh';
        const t = () => i18n[currentLang];

        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            z-index: 999999;
            font-family: Arial, sans-serif;
        `;

        const btn = document.createElement('div');
        btn.innerHTML = '⚙️';
        btn.title = 'CF Submissions Ratings Settings';
        btn.style.cssText = `
            width: 44px;
            height: 44px;
            background: #ffffff;
            border: 1px solid #dcdcdc;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            user-select: none;
        `;
        btn.onmouseover = () => { btn.style.transform = 'scale(1.1)'; btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)'; };
        btn.onmouseout = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; };

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: absolute;
            top: 55px;
            right: 0;
            width: 320px;
            max-height: 85vh;
            overflow-y: auto;
            background: #ffffff;
            border: 1px solid #e1e1e1;
            border-radius: 8px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.2);
            padding: 16px;
            display: none;
            flex-direction: column;
            gap: 15px;
            color: #333;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 5px;
        `;

        const headerTitle = document.createElement('div');
        headerTitle.style.cssText = 'font-size: 16px; font-weight: bold;';

        const langBtn = document.createElement('div');
        langBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: #f5f5f5;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            color: #555;
            transition: all 0.2s ease;
            user-select: none;
        `;
        const globeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
        langBtn.innerHTML = `${globeSvg} <span id="cf-lang-text"></span>`;

        langBtn.onmouseover = () => { langBtn.style.background = '#e8e8e8'; langBtn.style.color = '#111'; };
        langBtn.onmouseout = () => { langBtn.style.background = '#f5f5f5'; langBtn.style.color = '#555'; };

        const updateLangUI = () => {
            langBtn.querySelector('#cf-lang-text').textContent = currentLang === 'zh' ? '简体中文' : 'English';
        };
        updateLangUI();

        let checkIfChanged = () => { };

        langBtn.onclick = () => {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            updateTexts();
            checkIfChanged();
        };

        header.appendChild(headerTitle);
        header.appendChild(langBtn);
        modal.appendChild(header);

        // Display Style Setting
        const rowStyle = document.createElement('div');
        rowStyle.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;`;

        const labelStyle = document.createElement('span');
        labelStyle.style.cssText = 'font-size: 14px; font-weight: bold;';

        const styleSwitch = document.createElement('div');
        styleSwitch.style.cssText = `
            display: flex;
            position: relative;
            background: #f0f0f0;
            border-radius: 12px;
            padding: 2px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            user-select: none;
            width: 120px;
        `;

        const slider = document.createElement('div');
        slider.style.cssText = `
            position: absolute;
            top: 2px;
            bottom: 2px;
            width: calc(50% - 2px);
            border-radius: 10px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            box-sizing: border-box;
        `;

        const styleBlockBtn = document.createElement('div');
        const styleTagBtn = document.createElement('div');
        let currentDisplayStyle = appSettings.displayStyle || 'block';

        const updateStyleUI = () => {
            const btnBase = 'flex: 1; text-align: center; padding: 2px 0; font-size: 12px; z-index: 1; transition: color 0.25s; box-sizing: border-box; margin: 1px;';

            if (currentDisplayStyle === 'block') {
                slider.style.left = '2px';
                slider.style.background = getRatingBgColor(2400);
                slider.style.border = `1px solid ${getRatingBgColor(2400)}`;
                styleBlockBtn.style.cssText = `${btnBase} color: white;`;
                styleTagBtn.style.cssText = `${btnBase} color: #888;`;
            } else {
                slider.style.left = '50%';
                const ts = getRatingTagStyle(2400);
                slider.style.background = ts.bg;
                slider.style.border = `1px solid ${ts.border}`;
                styleBlockBtn.style.cssText = `${btnBase} color: #888;`;
                styleTagBtn.style.cssText = `${btnBase} color: ${ts.text};`;
            }
        };
        updateStyleUI();

        styleBlockBtn.onclick = () => { currentDisplayStyle = 'block'; updateStyleUI(); checkIfChanged(); };
        styleTagBtn.onclick = () => { currentDisplayStyle = 'tag'; updateStyleUI(); checkIfChanged(); };

        styleSwitch.appendChild(slider);
        styleSwitch.appendChild(styleBlockBtn);
        styleSwitch.appendChild(styleTagBtn);

        rowStyle.appendChild(labelStyle);
        rowStyle.appendChild(styleSwitch);
        modal.appendChild(rowStyle);

        // AC Bg Color Setting
        const row1 = document.createElement('div');
        row1.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;`;

        const label1 = document.createElement('span');
        label1.style.cssText = 'font-size: 14px; font-weight: bold;';

        const colorPickerContainer = document.createElement('div');

        row1.appendChild(label1);
        row1.appendChild(colorPickerContainer);
        modal.appendChild(row1);

        // Initialize Pickr unified RGBA picker
        let selectedColor = appSettings.acBgColor;
        if (window.Pickr) {
            const pickr = Pickr.create({
                el: colorPickerContainer,
                theme: 'nano', // Mimics Chrome devtools
                default: appSettings.acBgColor,
                position: 'top-end',
                components: {
                    preview: true,
                    opacity: true,
                    hue: true,
                    interaction: {
                        hex: true,
                        rgba: true,
                        input: true,
                        clear: false,
                        save: false
                    }
                }
            });

            pickr.on('change', (color) => {
                selectedColor = color.toRGBA().toString(0);
                checkIfChanged();
            }).on('save', () => {
                checkIfChanged();
            });
        }

        // User Avatar Setting
        const rowAvatar = document.createElement('label');
        rowAvatar.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; margin-top: 5px; cursor: pointer; user-select: none;`;
        const labelAvatar = document.createElement('span');
        labelAvatar.style.cssText = 'font-size: 14px; font-weight: bold;';
        const toggleContainerAvatar = document.createElement('div');
        toggleContainerAvatar.className = 'cf-toggle-switch';
        const cbAvatar = document.createElement('input');
        cbAvatar.type = 'checkbox';
        cbAvatar.checked = appSettings.show.userAvatar;
        const sliderAvatar = document.createElement('span');
        sliderAvatar.className = 'cf-toggle-slider';
        toggleContainerAvatar.appendChild(cbAvatar);
        toggleContainerAvatar.appendChild(sliderAvatar);
        rowAvatar.appendChild(labelAvatar);
        rowAvatar.appendChild(toggleContainerAvatar);
        modal.appendChild(rowAvatar);

        // Avatar Size Setting
        const rowAvatarSize = document.createElement('div');
        rowAvatarSize.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
        const labelAvatarSize = document.createElement('span');
        labelAvatarSize.style.cssText = 'font-size: 13px; color: #555;';

        const avatarSizeInput = document.createElement('input');
        avatarSizeInput.type = 'range';
        avatarSizeInput.min = '0.8';
        avatarSizeInput.max = '3.0';
        avatarSizeInput.step = '0.1';
        avatarSizeInput.value = appSettings.avatarSize || 1.4;
        avatarSizeInput.style.cssText = 'width: 100px; cursor: pointer;';

        const avatarSizeVal = document.createElement('span');
        avatarSizeVal.style.cssText = 'font-size: 12px; width: 28px; text-align: right; display: inline-block;';
        avatarSizeVal.textContent = parseFloat(avatarSizeInput.value).toFixed(1) + 'x';

        avatarSizeInput.oninput = () => {
            avatarSizeVal.textContent = parseFloat(avatarSizeInput.value).toFixed(1) + 'x';
            checkIfChanged();
        };

        const sizeWrapper = document.createElement('div');
        sizeWrapper.style.display = 'flex';
        sizeWrapper.style.alignItems = 'center';
        sizeWrapper.style.gap = '5px';
        sizeWrapper.appendChild(avatarSizeInput);
        sizeWrapper.appendChild(avatarSizeVal);

        rowAvatarSize.appendChild(labelAvatarSize);
        rowAvatarSize.appendChild(sizeWrapper);
        modal.appendChild(rowAvatarSize);

        cbAvatar.onchange = () => {
            rowAvatarSize.style.display = cbAvatar.checked ? 'flex' : 'none';
            checkIfChanged();
        };
        rowAvatarSize.style.display = cbAvatar.checked ? 'flex' : 'none';

        // Lang Icon Setting
        const rowLangIcon = document.createElement('label');
        rowLangIcon.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; margin-top: 5px; cursor: pointer; user-select: none;`;
        const labelLangIcon = document.createElement('span');
        labelLangIcon.style.cssText = 'font-size: 14px; font-weight: bold;';
        const toggleContainerLangIcon = document.createElement('div');
        toggleContainerLangIcon.className = 'cf-toggle-switch';
        const cbLangIcon = document.createElement('input');
        cbLangIcon.type = 'checkbox';
        cbLangIcon.checked = appSettings.show.langIcon !== false;
        const sliderLangIcon = document.createElement('span');
        sliderLangIcon.className = 'cf-toggle-slider';
        toggleContainerLangIcon.appendChild(cbLangIcon);
        toggleContainerLangIcon.appendChild(sliderLangIcon);
        rowLangIcon.appendChild(labelLangIcon);
        rowLangIcon.appendChild(toggleContainerLangIcon);
        modal.appendChild(rowLangIcon);

        cbLangIcon.onchange = () => {
            rowLangIconSize.style.display = cbLangIcon.checked ? 'flex' : 'none';
            checkIfChanged();
        };

        // Lang Icon Size Setting
        const rowLangIconSize = document.createElement('div');
        rowLangIconSize.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
        const labelLangIconSize = document.createElement('span');
        labelLangIconSize.style.cssText = 'font-size: 13px; color: #555;';

        const langIconSizeInput = document.createElement('input');
        langIconSizeInput.type = 'range';
        langIconSizeInput.min = '0.5';
        langIconSizeInput.max = '2.0';
        langIconSizeInput.step = '0.1';
        langIconSizeInput.value = appSettings.langIconSize || 1.0;
        langIconSizeInput.style.cssText = 'width: 100px; cursor: pointer;';

        const langIconSizeVal = document.createElement('span');
        langIconSizeVal.style.cssText = 'font-size: 12px; width: 28px; text-align: right; display: inline-block;';
        langIconSizeVal.textContent = parseFloat(langIconSizeInput.value).toFixed(1) + 'x';

        langIconSizeInput.oninput = () => {
            langIconSizeVal.textContent = parseFloat(langIconSizeInput.value).toFixed(1) + 'x';
            checkIfChanged();
        };

        const sizeWrapperLang = document.createElement('div');
        sizeWrapperLang.style.display = 'flex';
        sizeWrapperLang.style.alignItems = 'center';
        sizeWrapperLang.style.gap = '5px';
        sizeWrapperLang.appendChild(langIconSizeInput);
        sizeWrapperLang.appendChild(langIconSizeVal);

        rowLangIconSize.appendChild(labelLangIconSize);
        rowLangIconSize.appendChild(sizeWrapperLang);
        modal.appendChild(rowLangIconSize);

        rowLangIconSize.style.display = cbLangIcon.checked ? 'flex' : 'none';

        // Short Verdict Setting
        const rowShortVerdict = document.createElement('label');
        rowShortVerdict.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; margin-top: 5px; cursor: pointer; user-select: none;`;
        const labelShortVerdict = document.createElement('span');
        labelShortVerdict.style.cssText = 'font-size: 14px; font-weight: bold;';
        const toggleContainerShortVerdict = document.createElement('div');
        toggleContainerShortVerdict.className = 'cf-toggle-switch';
        const cbShortVerdict = document.createElement('input');
        cbShortVerdict.type = 'checkbox';
        cbShortVerdict.checked = !!appSettings.show.shortVerdict;
        const sliderShortVerdict = document.createElement('span');
        sliderShortVerdict.className = 'cf-toggle-slider';
        toggleContainerShortVerdict.appendChild(cbShortVerdict);
        toggleContainerShortVerdict.appendChild(sliderShortVerdict);
        rowShortVerdict.appendChild(labelShortVerdict);
        rowShortVerdict.appendChild(toggleContainerShortVerdict);
        modal.appendChild(rowShortVerdict);

        cbShortVerdict.onchange = () => {
            checkIfChanged();
        };

        // Toggles Section
        const showSettingsMap = [
            { key: 'submissions', labelKey: 'locSubmissions' },
            { key: 'status', labelKey: 'locStatus' },
            { key: 'hacks', labelKey: 'locHacks' },
            { key: 'problemset', labelKey: 'locProblemset' },
            { key: 'contestProblems', labelKey: 'locContestProblems' },
            { key: 'standings', labelKey: 'locStandings' },
            { key: 'problemTags', labelKey: 'locProblemTags' }
        ];

        const showGroup = document.createElement('div');
        showGroup.style.cssText = 'border-top: 1px solid #eee; padding-top: 10px; margin-top: 5px;';
        const showTitle = document.createElement('div');
        showTitle.style.cssText = 'font-size: 14px; font-weight: bold; margin-bottom: 8px;';
        showGroup.appendChild(showTitle);

        const checkBoxes = {};
        showSettingsMap.forEach(item => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px; font-size: 13px; cursor: pointer; user-select: none;';

            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'cf-toggle-switch';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = appSettings.show[item.key];
            const slider = document.createElement('span');
            slider.className = 'cf-toggle-slider';
            toggleContainer.appendChild(cb);
            toggleContainer.appendChild(slider);

            cb.onchange = () => {
                checkIfChanged();
            };

            checkBoxes[item.key] = cb;
            label.appendChild(toggleContainer);
            item.textNode = document.createTextNode('');
            label.appendChild(item.textNode);
            showGroup.appendChild(label);
        });
        modal.appendChild(showGroup);

        // Time Format Section
        const timeGroup = document.createElement('div');
        timeGroup.style.cssText = 'border-top: 1px solid #eee; padding-top: 10px; margin-top: 5px;';

        const timeTitleRow = document.createElement('div');
        timeTitleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

        const timeTitle = document.createElement('label');
        timeTitle.style.cssText = 'font-size: 14px; font-weight: bold; cursor: pointer; user-select: none;';
        const timeTitleTextNode = document.createTextNode('');
        timeTitle.appendChild(timeTitleTextNode);

        const timeToggleContainer = document.createElement('div');
        timeToggleContainer.className = 'cf-toggle-switch';
        const timeToggle = document.createElement('input');
        timeToggle.type = 'checkbox';
        timeToggle.checked = appSettings.timeFormat.enabled;
        const timeSlider = document.createElement('span');
        timeSlider.className = 'cf-toggle-slider';
        timeToggleContainer.appendChild(timeToggle);
        timeToggleContainer.appendChild(timeSlider);

        timeTitle.appendChild(timeToggleContainer);
        timeTitle.insertBefore(timeToggleContainer, timeTitle.firstChild);

        timeTitleRow.appendChild(timeTitle);
        timeGroup.appendChild(timeTitleRow);

        const timeInput = document.createElement('input');
        timeInput.type = 'text';
        timeInput.value = appSettings.timeFormat.format;
        timeInput.placeholder = 'YYYY/MM/DD HH:mm';
        timeInput.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; box-sizing: border-box;';

        const timePreview = document.createElement('div');
        timePreview.style.cssText = 'margin-top: 6px; font-size: 12px; color: #666; font-family: monospace; text-align: right;';

        const updatePreview = () => {
            if (timeToggle.checked) {
                const d = new Date();
                timePreview.textContent = t().timeFormatPreview + customFormatTime(d, timeInput.value || 'YYYY/MM/DD HH:mm');
                timeInput.disabled = false;
                timeInput.style.opacity = '1';
            } else {
                timePreview.textContent = t().timeFormatDisabled;
                timeInput.disabled = true;
                timeInput.style.opacity = '0.5';
            }
        };

        timeInput.addEventListener('input', () => { updatePreview(); checkIfChanged(); });
        timeToggle.addEventListener('change', () => { updatePreview(); checkIfChanged(); });

        timeGroup.appendChild(timeInput);
        timeGroup.appendChild(timePreview);
        updatePreview();

        modal.appendChild(timeGroup);

        const saveBtn = document.createElement('button');
        saveBtn.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background 0.2s;
        `;

        checkIfChanged = () => {
            let changed = false;
            if (currentLang !== appSettings.lang) changed = true;
            if (currentDisplayStyle !== appSettings.displayStyle) changed = true;
            if (selectedColor !== appSettings.acBgColor) changed = true;
            if (timeToggle.checked !== appSettings.timeFormat.enabled) changed = true;
            if ((timeInput.value || 'YYYY/MM/DD HH:mm') !== appSettings.timeFormat.format) changed = true;
            if (cbAvatar.checked !== appSettings.show.userAvatar) changed = true;
            if (cbLangIcon.checked !== (appSettings.show.langIcon !== false)) changed = true;
            if (cbShortVerdict.checked !== !!appSettings.show.shortVerdict) changed = true;
            if (parseFloat(langIconSizeInput.value) !== (appSettings.langIconSize || 1.0)) changed = true;
            if (parseFloat(avatarSizeInput.value) !== (appSettings.avatarSize || 1.4)) changed = true;

            showSettingsMap.forEach(item => {
                if (checkBoxes[item.key] && checkBoxes[item.key].checked !== (appSettings.show[item.key] ?? DEFAULT_SETTINGS.show[item.key])) {
                    changed = true;
                }
            });

            if (changed) {
                saveBtn.style.background = '#1890ff';
                saveBtn.style.cursor = 'pointer';
                saveBtn.style.opacity = '1';
                saveBtn.disabled = false;
                saveBtn.onmouseover = () => saveBtn.style.background = '#40a9ff';
                saveBtn.onmouseout = () => saveBtn.style.background = '#1890ff';
            } else {
                saveBtn.style.background = '#d9d9d9';
                saveBtn.style.cursor = 'not-allowed';
                saveBtn.style.opacity = '0.7';
                saveBtn.disabled = true;
                saveBtn.onmouseover = null;
                saveBtn.onmouseout = null;
            }
        };
        saveBtn.onmouseover = () => saveBtn.style.background = '#40a9ff';
        saveBtn.onmouseout = () => saveBtn.style.background = '#1890ff';

        const updateTexts = () => {
            headerTitle.textContent = t().title;
            label1.textContent = t().acColor;
            labelAvatar.textContent = t().locUserAvatar;
            labelAvatarSize.textContent = t().locAvatarSize;
            labelLangIcon.textContent = t().locLangIcon;
            labelLangIconSize.textContent = t().locLangIconSize;
            labelShortVerdict.textContent = t().locShortVerdict;
            showTitle.textContent = t().locationsTitle;
            showSettingsMap.forEach(item => {
                if (item.textNode) item.textNode.textContent = t()[item.labelKey];
            });
            timeTitleTextNode.textContent = t().timeFormatTitle;
            labelStyle.textContent = t().displayStyleTitle;
            styleBlockBtn.textContent = t().styleBlock;
            styleTagBtn.textContent = t().styleTag;
            saveBtn.textContent = t().saveBtn;
            updatePreview();
            updateLangUI();
            checkIfChanged();
        };
        updateTexts();

        saveBtn.onclick = () => {
            appSettings.acBgColor = selectedColor;
            if (!appSettings.show || typeof appSettings.show !== 'object') {
                appSettings.show = { ...DEFAULT_SETTINGS.show };
            }
            appSettings.show.userAvatar = cbAvatar.checked;
            appSettings.show.langIcon = cbLangIcon.checked;
            appSettings.show.shortVerdict = cbShortVerdict.checked;
            appSettings.avatarSize = parseFloat(avatarSizeInput.value);
            appSettings.langIconSize = parseFloat(langIconSizeInput.value);

            showSettingsMap.forEach(item => {
                if (!appSettings.show || typeof appSettings.show !== 'object') {
                    appSettings.show = { ...DEFAULT_SETTINGS.show };
                }
                appSettings.show[item.key] = checkBoxes[item.key].checked;
            });

            if (!appSettings.timeFormat || typeof appSettings.timeFormat !== 'object') {
                appSettings.timeFormat = { ...DEFAULT_SETTINGS.timeFormat };
            }
            appSettings.timeFormat.enabled = timeToggle.checked;
            appSettings.timeFormat.format = timeInput.value || 'YYYY/MM/DD HH:mm';

            appSettings.lang = currentLang;
            appSettings.displayStyle = currentDisplayStyle;

            saveSettings(appSettings);
            location.reload();
        };

        modal.appendChild(saveBtn);

        btn.onclick = () => {
            modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        };

        container.appendChild(modal);
        container.appendChild(btn);
        document.body.appendChild(container);
    }

    // Run when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { init(); createSettingsUI(); });
    } else {
        init();
        createSettingsUI();
    }
})();
