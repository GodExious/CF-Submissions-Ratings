// ==UserScript==
// @name         CF-Submissions-Ratings
// @name:zh-CN   Codeforces 提交页/状态页 难度分显示
// @namespace    https://github.com/GodExious/CF-Submissions-Ratings
// @version      1.4.1
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

    // Fine-grained background colors matching Codeforces Analytics / extended rating systems
    function getRatingBgColor(rating) {
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

        // 1. Handle Status Tables and Hacks Tables by adding a new Rating column
        const statusTables = document.querySelectorAll('table.status-frame-datatable, div.datatable table:not(.standings):not(.problems)');
        statusTables.forEach(table => {
            const headerRow = table.querySelector('tr');
            if (!headerRow) return;

            // Find Time/When column index
            let timeColIdx = -1;
            let isHacks = window.location.href.includes('/hacks');
            Array.from(headerRow.cells).forEach((th, idx) => {
                const text = th.textContent.toLowerCase();
                if (timeColIdx === -1 && (text.includes('when') || text.includes('time') || text.includes('时间') || text.includes('когда') || text.includes('date'))) {
                    timeColIdx = idx;
                }
                if (text.includes('hacker') || text.includes('defender')) {
                    isHacks = true;
                }
            });

            if (isHacks) {
                timeColIdx = -1; // Skip time formatting for hacks page
            }

            // Process Header (Rating Column and Time)
            if (!headerRow.hasAttribute('data-cf-rating-processed')) {
                headerRow.setAttribute('data-cf-rating-processed', 'true');

                // Append timezone to Time column header
                if (timeColIdx !== -1) {
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
                    th.style.setProperty('white-space', 'nowrap', 'important');
                }

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

            // Process data rows
            const dataRows = table.querySelectorAll('tr:not(:first-child)');
            dataRows.forEach(row => {
                // Time Formatting
                if (timeColIdx !== -1) {
                    const timeCell = row.cells[timeColIdx];
                    if (timeCell) {
                        const text = timeCell.textContent.trim();
                        // Prevent re-formatting if it already has our format (starts with YYYY/MM/DD or YYYY-MM-DD)
                        if (!/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(text) && text.length >= 8 && /\d/.test(text)) {
                            const newTime = formatTimeStr(text);
                            if (newTime) {
                                timeCell.innerHTML = newTime;
                            }
                        }
                        timeCell.style.setProperty('white-space', 'nowrap', 'important');
                    }
                }

                if (row.hasAttribute('data-cf-rating-processed')) return;
                row.setAttribute('data-cf-rating-processed', 'true');

                // Skip empty/info rows (like "No submissions found")
                if (row.cells.length <= 1) {
                    if (row.cells.length === 1) {
                        row.cells[0].colSpan = (parseInt(row.cells[0].colSpan) || 1) + 1;
                    }
                    return;
                }

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
                    td.textContent = problemRating;
                    // Use !important to override Codeforces' `.highlighted-row` CSS
                    td.style.setProperty('background-color', getRatingBgColor(problemRating), 'important');
                    td.style.setProperty('color', 'black', 'important');
                } else {
                    td.textContent = '';
                }
                row.appendChild(td);
            });
        });

        // 1.5 Handle Standings tables specifically (adding a whole new row under the header)
        const standingsTables = document.querySelectorAll('table.standings:not([data-cf-rating-standings-processed])');
        standingsTables.forEach(table => {
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
                        newCell.textContent = info.rating;
                        // Color the entire cell just like submission/status
                        newCell.style.cssText = `background-color: ${getRatingBgColor(info.rating)} !important; color: #000 !important; text-align: center; font-size: 0.9em; padding: 0.2em; font-weight: normal;`;

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
            table.setAttribute('data-cf-rating-problems-processed', 'true');

            const headerRow = table.querySelector('tr');
            if (headerRow) {
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

                const td = document.createElement('td');
                td.className = 'left';
                td.style.textAlign = 'center';
                td.style.verticalAlign = 'middle';

                const prevTd = row.firstElementChild;
                if (prevTd && prevTd.classList.contains('left')) {
                    prevTd.classList.remove('left');
                }

                const idCell = row.querySelector('td.id');
                const link = idCell ? idCell.querySelector('a') : row.querySelector('a[href*="/problem/"]');

                if (link) {
                    const info = getProblemRatingFromHref(link.href);
                    if (info && info.rating) {
                        td.textContent = info.rating;
                        // Always keep the difficulty background color for the Rating cell
                        td.style.cssText = `background-color: ${getRatingBgColor(info.rating)} !important; color: #000 !important; text-align: center; font-weight: normal;`;
                    }

                    const rowLinks = row.querySelectorAll('a[href*="/problem/"]');
                    rowLinks.forEach(l => l.setAttribute('data-cf-rating-added', 'true'));
                }

                row.insertBefore(td, row.firstElementChild);

                // Fix the CF accepted/rejected status styling
                if (row.classList.contains('accepted-problem')) {
                    // Remove the green border from the # cell (so it doesn't show in the middle)
                    if (idCell) idCell.style.setProperty('border-left', '1px solid #e1e1e1', 'important');

                    // Paint ALL other cells in the row with the green background
                    Array.from(row.cells).forEach(cell => {
                        if (cell !== td) cell.style.setProperty('background-color', '#d4edc9', 'important');
                    });
                } else if (row.classList.contains('rejected-problem')) {
                    // Remove the red border from the # cell
                    if (idCell) idCell.style.setProperty('border-left', '1px solid #e1e1e1', 'important');

                    // Paint ALL other cells in the row with the red background
                    Array.from(row.cells).forEach(cell => {
                        if (cell !== td) cell.style.setProperty('background-color', '#ffe3e3', 'important');
                    });
                }
            });
        });

        // 2. Handle other standalone problem links (e.g. outside status tables)
        const links = document.querySelectorAll('a[href*="/problem/"]:not([data-cf-rating-added])');
        links.forEach(link => {
            if (!link.textContent || link.textContent.trim().length === 0) return;

            // If inside a status table, we already handled it by adding a column
            if (link.closest('table.status-frame-datatable')) {
                link.setAttribute('data-cf-rating-added', 'true');
                return;
            }

            const info = getProblemRatingFromHref(link.href);
            if (info) {
                link.setAttribute('data-cf-rating-added', 'true');
                if (info.rating) {
                    // Regular inline links, remove the * and use brackets
                    const ratingSpan = document.createElement('span');
                    ratingSpan.textContent = `[${info.rating}]`;
                    ratingSpan.style.color = getRatingTextColor(info.rating);
                    ratingSpan.style.marginLeft = '6px';
                    ratingSpan.style.fontSize = '0.9em';
                    ratingSpan.title = `Difficulty Rating: ${info.rating}`;
                    ratingSpan.className = 'cf-rating-helper-label';

                    link.parentNode.insertBefore(ratingSpan, link.nextSibling);
                }
            }
        });

        // 3. Handle actual Problem Page tags (sidebar tags)
        const tagBoxes = document.querySelectorAll('span.tag-box:not([data-cf-rating-added])');
        tagBoxes.forEach(tag => {
            const text = tag.textContent.trim();
            if (text.startsWith('*')) {
                const ratingMatch = text.match(/^\*\s*(\d+)$/);
                if (ratingMatch && ratingMatch[1]) {
                    const rating = parseInt(ratingMatch[1], 10);
                    tag.setAttribute('data-cf-rating-added', 'true');

                    const bgColor = getRatingBgColor(rating);
                    const borderColor = getRatingBorderColor(rating);

                    // Codeforces wraps the actual tag text in a div.roundbox
                    // We must color the parent div so the color fills the original padding and border radius
                    const parentBox = tag.closest('.roundbox');
                    if (parentBox) {
                        parentBox.style.setProperty('background-color', bgColor, 'important');
                        parentBox.style.setProperty('border-color', borderColor, 'important');
                    }

                    // Style the inner text span
                    tag.style.setProperty('color', '#000', 'important');
                    tag.style.setProperty('background-color', 'transparent', 'important');
                }
            }
        });
    }

    function formatTimeStr(text) {
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
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');

            return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
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
                setTimeout(applyTimeFormatting, 500);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initialization
    async function init() {
        const ratingsMap = await getRatings();
        applyRatings(ratingsMap);
        setTimeout(applyTimeFormatting, 500);
        setupObserver(ratingsMap);
    }

    // Run when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
