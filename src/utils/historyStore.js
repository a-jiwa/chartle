/**
 * historyStore.js
 * – Keeps history in localStorage for guests.
 * – Seamlessly syncs the same object to Firestore for signed‑in users.
 */

import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const LS_KEY = 'chartle-history';

/* ---------- local helpers ---------- */
function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch { return {}; }
}

function writeLocal(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function merge(a = {}, b = {}) {
    const out = { ...a };
    for (const [date, rec] of Object.entries(b)) {
        if (!out[date]) { out[date] = rec; continue; }
        const keepA = out[date].guesses?.length || 0;
        const keepB = rec.guesses?.length || 0;
        out[date] = keepB > keepA ? rec : out[date];
    }
    return out;
}

/* ---------- public API ---------- */

/* 1. synchronous – localStorage only (use during initial render) */
export function loadHistoryLocal() {
    return readLocal();
}

/* 2. asynchronous – merged copy (call after sign‑in or when opening the modal) */
export async function loadHistory() {
    const local = readLocal();
    const user  = auth.currentUser;
    if (!user) return local;                                // guest

    const ref  = doc(db, 'histories', user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {                                   // nothing in cloud
        if (Object.keys(local).length) await setDoc(ref, local);
        return local;
    }

    const remote = snap.data() || {};
    const merged = merge(remote, local);

    writeLocal(merged);
    await setDoc(ref, merged, { merge: true });
    return merged;
}

/* 3. save – always local, plus cloud if signed‑in */
export async function saveHistory(next) {
    writeLocal(next);

    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, 'histories', user.uid), next, { merge: true });
}

/* 4. one‑off listener – push local cache up as soon as a guest logs in */
auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const local = readLocal();
    if (Object.keys(local).length === 0) return;
    await setDoc(doc(db, 'histories', user.uid), local, { merge: true });
});
