const LS_KEY = "chartle-history";

export function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch {
        return {};
    }
}

export function saveHistory(history) {
    localStorage.setItem(LS_KEY, JSON.stringify(history));
}