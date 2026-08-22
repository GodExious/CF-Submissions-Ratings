// ==UserScript==
// @name         CF-Submissions-Ratings
// @name:zh-CN   Codeforces 提交页/状态页 难度分显示
// @namespace    https://github.com/GodExious/CF-Submissions-Ratings
// @version      1.3.5
// @description  Fetches and displays problem difficulty ratings. Adds a new Rating column to status and submissions tables with color-coded backgrounds.
// @description:zh-CN 自动获取并显示 Codeforces 题目难度分。在 Status 和 Submissions 表格最右侧新增 Rating 列并带有 Codeforces Analytics 风格的色彩高亮，同时完美兼容个人提交记录背景。
// @author       GodExious & Antigravity
// @supportURL   https://github.com/GodExious/CF-Submissions-Ratings/issues
// @match        *://codeforces.com/*
// @match        *://*.codeforces.com/*
// @icon         https://codeforces.com/favicon.ico
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

        // 1. Handle Status Tables (table.status-frame-datatable) by adding a new Rating column
        const statusTables = document.querySelectorAll('table.status-frame-datatable');
        statusTables.forEach(table => {
            // First check if header is processed
            const headerRow = table.querySelector('tr');
            if (headerRow && !headerRow.hasAttribute('data-cf-rating-processed')) {
                headerRow.setAttribute('data-cf-rating-processed', 'true');

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
            const dataRows = table.querySelectorAll('tr:not([data-cf-rating-processed])');
            dataRows.forEach(row => {
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
                        break;
                    }
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
                    const ratingSpan = document.createElement('span');
                    ratingSpan.textContent = ` *${info.rating}*`;
                    ratingSpan.style.color = getRatingTextColor(info.rating);
                    ratingSpan.style.marginLeft = '4px';
                    ratingSpan.style.fontSize = '0.9em';
                    ratingSpan.title = `Difficulty Rating: ${info.rating}`;
                    ratingSpan.className = 'cf-rating-helper-label';

                    link.parentNode.insertBefore(ratingSpan, link.nextSibling);
                }
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
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initialization
    async function init() {
        const ratingsMap = await getRatings();
        applyRatings(ratingsMap);
        setupObserver(ratingsMap);
    }

    // Run when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
