/* ─── src/App.jsx ─────────────────────────────────────────── */

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";

import Header     from "./components/Header";
import Chart      from "./components/Chart";
import Guesses    from "./components/Guesses";
import WinModal   from "./components/WinModal";
import LoseModal  from "./components/LoseModal";
import HelpModal  from "./components/HelpModal";
import HistoryModal  from "./components/HistoryModal";
import SettingsModal from "./components/SettingsModal";
import AuthModal     from "./components/AuthModal";

import countryToIso         from "./data/country_to_iso.json";
import countryToRealCountry from "./data/country_to_real_country.json";


// ── Daily persistence helpers ────────────────────────────
import { todayKey }                      from "./utils/date";
import { loadHistoryLocal, loadHistory, saveHistory } from './utils/historyStore.js';
import { getGameDateFromUrl, hasDateOverride, stripDateOverrideFromUrl } from "./utils/gameDate";

import { fetchMeta } from "./utils/fetchMeta";

import { guessColours } from "./data/colors.js";
import { COUNTRIES }    from "./data/countries";
import { initGA, trackPageView, trackGuess, trackGameEnd } from "./analytics/ga";

import canonicalNames   from "./data/canonical_country_names";


const META_URL    = "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/config/001_banana_production.json";
const MAX_GUESSES = 5;

// ── Load today’s save (if any) once, before the component runs ──
const GAME_DATE = getGameDateFromUrl();
const OVERRIDDEN = hasDateOverride();
const history      = loadHistoryLocal();
const todaysRecord = history[GAME_DATE] ?? null;


export default function App() {
    /* ─── state ─────────────────────────────────────────── */
    const [meta,  setMeta]  = useState(null);

    // Seed guesses & status from localStorage so the player can’t replay the same day
    const [guesses, setGuesses] = useState(todaysRecord?.guesses ?? []);
    const [status,  setStatus]  = useState(todaysRecord?.result  ?? "playing"); // "playing" | "won" | "lost" | "done"

    const [showWinModal,  setShowWinModal]  = useState(false);
    const [showLoseModal, setShowLoseModal] = useState(false);
    const [targetData,    setTargetData]    = useState(null);
    const [availableCountries, setAvailableCountries] = useState([]);

    const [panel, setPanel] = useState(null);   // "help" | "history" | "settings" | "auth" | null
    const handleMenuOpen = (id) => setPanel(id);

    /* ── readable date for display ───────────── */
    const GAME_DATE_LABEL_FULL = new Date(GAME_DATE).toLocaleDateString("en-GB", {
        weekday: "short",   // Fri
        day: "2-digit",     // 19
        month: "short",     // Jul
        year: "numeric"     // 2025
    });

    const GAME_DATE_LABEL_SHORT = new Date(GAME_DATE).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    /* ─── analytics initialisation ─────────────────────── */
    useEffect(() => {
        initGA();
        trackPageView();
    }, []);

    /* ─── fetch top-level game config ───────────────────── */
    useEffect(() => {
        fetchMeta(GAME_DATE)
            .then(setMeta)
            .catch(err => console.error(err.message));
    }, []);

    /* ─── drop date from URL ───────────────────── */
    useEffect(() => {
        if (hasDateOverride()) stripDateOverrideFromUrl();
    }, []);


    /* ─── derive target info from meta ──────────────────── */
    const target       = meta?.target ?? null;                   // e.g. "India"
    const targetIso    = target ? countryToRealCountry[target] : null;
    const targetKey    = target ? target.toLowerCase() : null;
    const infoDescription = meta?.infoDescription ?? null;
    const source          = meta?.source ?? null;

    /* ─── fetch per-country hints once ISO known ────────── */
    useEffect(() => {
        if (!targetIso) return; // nothing to fetch yet

        const dataUrl = `https://raw.githubusercontent.com/a-jiwa/chartle-data/main/countries/${targetIso}.json`;

        fetch(dataUrl)
            .then(r => r.json())
            .then(setTargetData)
            .catch(err => console.error("Failed to fetch target country data:", err));
    }, [targetIso]);

    /* ─── confetti sequence ─────────────────────────────── */
    useEffect(() => {
        if (status !== "won") { setShowWinModal(false); return; }

        const confettiDelay = 300;      // ms before confetti starts
        const modalDelay    = confettiDelay + 1000; // modal appears 1 s after confetti

        const confettiTimer = setTimeout(() => {
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
                disableForReducedMotion: true,
                colors: ["#c43333", ...guessColours] // chartle colours
            });
        }, confettiDelay);

        const modalTimer = setTimeout(() => setShowWinModal(true), modalDelay);

        return () => {
            clearTimeout(confettiTimer);
            clearTimeout(modalTimer);
        };
    }, [status]);

    /* ─── to delay lose modal only after line is rendered ─────────── */
    useEffect(() => {
        if (status !== "lost") { setShowLoseModal(false); return; }
        const t = setTimeout(() => setShowLoseModal(true), 3000);
        return () => clearTimeout(t);
    }, [status]);

    /* ─── persist state to localStorage after every change ─ */
    useEffect(() => {
        if (!target) return; // wait until meta fetched

        saveHistory({
            ...loadHistory(),
            [GAME_DATE]: {
                target,
                guesses,
                result: status,
                title: meta.title
            }
        });
    }, [guesses, status, target]);

    /* ─── auto‑reload after midnight ─────────── */
    useEffect(() => {
        if (OVERRIDDEN) return;
        const id = setInterval(() => {
            if (todayKey() !== GAME_DATE) window.location.reload();
        }, 60000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!meta) return;                    // still loading

        const saved = todaysRecord;
        if (!saved) return;                   // nothing stored for today

        const samePuzzle = saved.title === meta.title;
        if (!samePuzzle) {
            // Different data: wipe any carried-over state
            setGuesses([]);
            setStatus("playing");
        }
    }, [meta]);

    /* ─── add a guess (case‑insensitive, max 5) ─────────── */
    const handleAddGuess = (raw) => {
        if (status !== "playing") return;

        const text = raw.trim();
        if (!text) return;

        const key = text.toLowerCase().trim();
        const title = canonicalNames[key] || text.replace(/\b\w/g, c => c.toUpperCase());

        const isValid = COUNTRIES.some(c => c.toLowerCase() === key);
        if (!isValid) return;

        setGuesses(prev => {
            if (prev.some(g => g.toLowerCase() === key) || prev.length >= MAX_GUESSES) {
                return prev;
            }

            const next = [...prev, title];

            trackGuess(title, next.length);

            if (key === targetKey) {
                setStatus("won");
                trackGameEnd("won", next.length, target);
            } else if (next.length >= MAX_GUESSES) {
                setStatus("lost");
                trackGameEnd("lost", next.length, target);
            }

            /* directional hint */
            const guessIso = countryToIso[title];
            if (guessIso && targetData && targetData[guessIso]) {
                const { direction, distance_km } = targetData[guessIso];
                console.log(`Your guess is ${distance_km} km to the ${direction}`);
            }

            return next;
        });
    };

    /* ─── placeholder whilst data loads ─────────────────── */
    if (!meta || !targetIso) {
        return (
            <div className="h-full antialiased flex flex-col items-center justify-center bg-[var(--bg-color)]">
                <div className="text-center px-4">
                    {/* Spinner */}
                    <div className="relative mx-auto mb-6 w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-gray-600 dark:border-t-gray-300 absolute top-0 left-0"></div>
                    </div>
                    
                    {/* Loading text */}
                    <p className="text-lg font-medium text-[var(--text-color)] tracking-wide">
                        Loading
                    </p>
                    
                    {/* Subtle subtitle */}
                    <p className="text-sm text-[var(--axis-text-color)] mt-2">
                        Preparing today's chart
                    </p>
                </div>
            </div>
        );
    }

    /* ─── render ────────────────────────────────────────── */
    return (

        <div className="h-full antialiased flex flex-col items-center overflow-y-scroll">
            <Header
                onOpen={handleMenuOpen}
                dateLabel={GAME_DATE_LABEL_SHORT}
                overridden={OVERRIDDEN}
            />

            <div className="pt-13 flex flex-col w-full max-w-[700px] h-full">
                {/* chart pane */}
                <div className="flex-none h-2/3">
                    {/* title + subtitle + date */}
                    <div className="px-4 pb-2 grid grid-cols-[1fr_auto] items-start gap-y-1">
                        {/* left column */}
                        <div>
                            <h2 className="mt-5 text-left font-semibold text-gray-900 dark:text-white text-[20px] md:text-[22px] leading-tight">
                                {meta.title}
                            </h2>
                            <p className="text-left text-gray-600 dark:text-gray-300 text-[16px] mt-1">
                                {meta.subtitle}
                            </p>
                        </div>

                    </div>

                    <Chart
                        csvUrl={meta.csvUrl}
                        meta={meta}
                        target={target}
                        others={meta.others ?? []}
                        guesses={guesses}
                        guessColours={guessColours}
                        setAvailableCountries={setAvailableCountries}
                    />
                </div>

                {/* bottom pane */}
                <div className="flex-none mt-8">
                    <Guesses
                        guesses={guesses}
                        onAddGuess={handleAddGuess}
                        status={status}
                        max={MAX_GUESSES}
                        guessColours={guessColours}
                        targetData={targetData}
                        countryToIso={countryToIso}
                        validCountries={availableCountries}
                        target={target}
                    />
                </div>
            </div>

            <WinModal
                open={showWinModal}
                onClose={() => setStatus("done")}
                guesses={guesses}
                target={target}
                infoDescription={infoDescription}
                source={source}
                csvUrl={meta.csvUrl}
                title={meta.title}
                subtitle={meta.subtitle}
                maxGuesses={MAX_GUESSES}
                yearStart={meta.yearStart}
                yearEnd={meta.yearEnd}
                gameDate={GAME_DATE_LABEL_SHORT}
                unitSuffix={meta.unitSuffix}
            />

            <LoseModal
                open={showLoseModal}
                onClose={() => setStatus("done")}
                target={target}
                infoDescription={infoDescription}
                source={source}
                csvUrl={meta.csvUrl}
                guesses={guesses}
                title={meta.title}
                subtitle={meta.subtitle}
                maxGuesses={MAX_GUESSES}
            />

            <HelpModal
                open={panel === "help"}
                onClose={() => setPanel(null)}
            />

            <HistoryModal
                open={panel === "history"}
                onClose={() => setPanel(null)}
            />

            <SettingsModal
                open={panel === "settings"}
                onClose={() => setPanel(null)}
            />

            <AuthModal
                open={panel === "auth"}
                onClose={() => setPanel(null)}
            />
        </div>
    );
}
