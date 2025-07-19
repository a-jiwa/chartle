/* ─── src/utils/gameDate.js ───────────────────────────── */

import { todayKey } from "./date";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ── private helpers ──────────────────────────────────── */
function offsetFromToday(delta) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Number(delta));
    return d.toISOString().slice(0, 10);
}

/* ── date resolver ────────────────────────────────────── */
export function getGameDateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const query  = params.get("d") || params.get("date");

    let hashVal  = null;
    if (!query && window.location.hash) {
        const m = window.location.hash.match(/(?:^|[&#])d=([^&#]+)/);
        if (m) hashVal = decodeURIComponent(m[1]);
    }

    const raw = query || hashVal;
    if (!raw) return todayKey();

    if (ISO_DATE_RE.test(raw)) return raw;
    if (raw === "yesterday")   return offsetFromToday(-1);
    if (raw === "tomorrow")    return offsetFromToday(1);
    if (raw === "today")       return todayKey();
    if (/^[+-]\d+$/.test(raw)) return offsetFromToday(raw);

    return todayKey();
}

/* ── detection & strip helpers ────────────────────────── */
export function hasDateOverride() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("d") || params.get("date")) return true;
    if (window.location.hash && /(?:^|[&#])d=/.test(window.location.hash)) return true;
    return false;
}

export function stripDateOverrideFromUrl() {
    if (!hasDateOverride()) return;

    const url = new URL(window.location.href);

    /* remove ?d=… or ?date=… */
    url.searchParams.delete("d");
    url.searchParams.delete("date");

    /* remove #d=… if present */
    if (url.hash) {
        const cleaned = url.hash
            .replace(/^[#]/, "")
            .split(/[&#]/)
            .filter(part => !part.startsWith("d="))
            .join("&");
        url.hash = cleaned ? `#${cleaned}` : "";
    }

    /* replaceState avoids adding a new history entry */
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
