/* ===================================================================
   AI 日报 - 首页逻辑 (app.js)
   支持 ?date=YYYY-MM-DD 查看历史日报
   =================================================================== */

(function () {
    "use strict";

    // ── 配置 ────────────────────────────────────────────────────
    var DATA_DIR = "./data";
    var ARCHIVE_DIR = "./data/archive";

    // 获取 URL 中的 date 参数
    function getDateParam() {
        var params = new URLSearchParams(location.search);
        return params.get("date") || "";
    }

    function getDataUrl() {
        var d = getDateParam();
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            return ARCHIVE_DIR + "/" + d + ".json";
        }
        return DATA_DIR + "/latest.json";
    }

    // ── DOM 引用 ─────────────────────────────────────────────────
    var $title     = document.getElementById("dailyTitle");
    var $date      = document.getElementById("dateDisplay");
    var $count     = document.getElementById("itemCount");
    var $stats     = document.getElementById("categoryStats");
    var $container = document.getElementById("cardsContainer");
    var $loading   = document.getElementById("loadingState");
    var $themeBtn  = document.getElementById("themeToggle");
    var $liveBadge = document.getElementById("liveBadge");

    // ── 主题切换 ─────────────────────────────────────────────────
    function initTheme() {
        var saved = localStorage.getItem("ai-daily-theme");
        if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.setAttribute("data-theme", "dark");
            $themeBtn.querySelector(".theme-icon").textContent = "\u2600\uFE0F";
        }
    }
    function toggleTheme() {
        var isDark = document.documentElement.getAttribute("data-theme") === "dark";
        if (isDark) {
            document.documentElement.removeAttribute("data-theme");
            $themeBtn.querySelector(".theme-icon").textContent = "\uD83C\uDF19";
            localStorage.setItem("ai-daily-theme", "light");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            $themeBtn.querySelector(".theme-icon").textContent = "\u2600\uFE0F";
            localStorage.setItem("ai-daily-theme", "dark");
        }
    }
    initTheme();
    $themeBtn.addEventListener("click", toggleTheme);

    // ── 分类中文映射 ─────────────────────────────────────────────
    var CAT_NAME = {
        "\u6280\u672F\u52A8\u6001": "\u6280\u672F\u52A8\u6001",
        "AI\u8BBA\u6587":   "AI \u8BBA\u6587",
        "\u65B0\u4EA7\u54C1":   "\u65B0\u4EA7\u54C1",
        "\u884C\u4E1A\u70ED\u70B9": "\u884C\u4E1A\u70ED\u70B9"
    };
    var CAT_KEY = {
        "\u6280\u672F\u52A8\u6001": "tech",
        "AI\u8BBA\u6587":   "paper",
        "\u65B0\u4EA7\u54C1":   "product",
        "\u884C\u4E1A\u70ED\u70B9": "news"
    };

    // ── 加载数据 ─────────────────────────────────────────────────
    async function loadData() {
        var url = getDataUrl();
        var isHistory = !!getDateParam();

        try {
            var resp = await fetch(url + "?t=" + Date.now());
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            var data = await resp.json();
            render(data, isHistory);
        } catch (err) {
            console.error("\u52A0\u8F7D\u6570\u636E\u5931\u8D25\uFF1A", err);
            showError(isHistory);
        }
    }

    // ── 渲染页面 ─────────────────────────────────────────────────
    function render(data, isHistory) {
        $loading.style.display = "none";

        var items = data.items || [];
        var date  = data.date  || "";
        var total = data.total || items.length;

        // 标题 & 日期
        if (isHistory) {
            $title.textContent = "\u5386\u53F2\u65E5\u62A5 \u00B7 " + date;
            if ($liveBadge) $liveBadge.style.display = "none";
        } else {
            $title.textContent = "\u6BCF\u65E5 AI \u8D44\u8BAF\u65E5\u62A5";
        }
        $date.textContent  = formatDate(date);
        $count.textContent = total + " \u6761\u8D44\u8BAF";

        // 分类统计
        renderStats(items);

        // 无内容
        if (items.length === 0) {
            $container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCC7</div><p class="empty-text">\u5F53\u65E5\u8D44\u8BAF\u5C1A\u672A\u751F\u6210\uFF0C\u8BF7\u9009\u62E9\u5176\u4ED6\u65E5\u671F\uFF5E</p></div>';
            return;
        }

        // 卡片列表
        var html = items.map(function(item, i) { return renderCard(item, i); }).join("");
        $container.innerHTML = html;
    }

    // ── 渲染分类统计 ─────────────────────────────────────────────
    function renderStats(items) {
        var counts = {};
        items.forEach(function(it) {
            var cat = it.category || "\u5176\u4ED6";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        var colors = {
            "\u6280\u672F\u52A8\u6001": "#4A90D9",
            "AI\u8BBA\u6587":   "#8B5CF6",
            "\u65B0\u4EA7\u54C1":   "#10B981",
            "\u884C\u4E1A\u70ED\u70B9": "#F59E0B"
        };
        var html = "";
        Object.entries(counts).forEach(function(entry) {
            var cat = entry[0];
            var n = entry[1];
            html += '<span class="stat-chip"><span class="stat-dot" style="background:' + (colors[cat] || "#999") + '"></span> ' + cat + " " + n + "</span>";
        });
        $stats.innerHTML = html;
    }

    // ── 渲染单张卡片 ─────────────────────────────────────────────
    function renderCard(item, index) {
        var cat   = item.category || "\u6280\u672F\u52A8\u6001";
        var catKey = CAT_KEY[cat] || "tech";
        var title = escapeHtml(item.title || "\u65E0\u6807\u9898");
        var summary = escapeHtml(item.summary || "\u6682\u65E0\u6458\u8981");
        var url   = escapeHtml(item.url || "javascript:void(0)");
        var source = item.source || "";
        var color = item.color || "#4A90D9";

        return '<article class="news-card category-' + catKey + '" onclick="window.open(\'' + url + '\',\'_blank\')">' +
            '<div class="card-index">' + (index + 1) + '</div>' +
            '<div class="card-body">' +
            '<span class="card-category" style="color:' + color + ';background:' + color + '18">' + (CAT_NAME[cat] || cat) + "</span>" +
            '<h2 class="card-title">' + title + "</h2>" +
            '<p class="card-summary">' + summary + "</p>" +
            '<div class="card-footer">' +
            (source ? '<span class="card-source">\uD83D\uDCCC ' + source + "</span>" : "") +
            '<span class="card-arrow">\u2192</span>' +
            "</div></div></article>";
    }

    // ── 错误状态 ─────────────────────────────────────────────────
    function showError(isHistory) {
        $loading.style.display = "none";
        var msg = isHistory ? "\u672A\u627E\u5230\u8BE5\u65E5\u671F\u7684\u65E5\u62A5\u6587\u4EF6" : "\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u6216\u7A0D\u540E\u91CD\u8BD5";
        $container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u26A0\uFE0F</div><p class="empty-text">' + msg + "</p></div>";
    }

    // ── 工具函数 ──────────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return "";
        var d = new Date(dateStr + "T00:00:00+08:00");
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        var weekDays = ["\u5468\u65E5","\u5468\u4E00","\u5468\u4E8C","\u5468\u4E09","\u5468\u56DB","\u5468\u4E94","\u5468\u516D"];
        var w = weekDays[d.getDay()];
        return y + " \u5E74 " + m + " \u6708 " + day + " \u65E5 \u00B7 " + w;
    }

    function escapeHtml(str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ── 启动 ─────────────────────────────────────────────────────
    loadData();

    // 每 5 分钟自动刷新（仅在查看最新日报时）
    if (!getDateParam()) {
        setInterval(function() { loadData(); }, 5 * 60 * 1000);
    }

})();
