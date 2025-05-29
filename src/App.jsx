/* ─── src/App.jsx ─────────────────────────────────────────── */

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";

import Header from "./components/Header";
import Chart     from "./components/Chart";
import Guesses   from "./components/Guesses";
import WinModal  from "./components/WinModal";
import LoseModal from "./components/LoseModal";

import countryToIso         from "./data/country_to_iso.json";
import countryToRealCountry from "./data/country_to_real_country.json";

import { COUNTRIES } from "./data/countries";
import { initGA, trackPageView, trackGuess, trackGameEnd } from "./analytics/ga";

const META_URL    = "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/config/010_share_elec_prod_nuclear.json";
const MAX_GUESSES = 5;

export default function App() {
    /* ─── state ─────────────────────────────────────────── */
    const [meta,         setMeta]         = useState(null);
    const [guesses,      setGuesses]      = useState([]);
    const [status,       setStatus]       = useState("playing");   // 'playing' | 'won' | 'lost' | 'done'
    const [showWinModal, setShowWinModal] = useState(false);
    const [targetData,   setTargetData]   = useState(null);
    const [showLoseModal, setShowLoseModal] = useState(false);


    /* ─── analytics initialisation ─────────────────────── */
    useEffect(() => {
        initGA();
        trackPageView();
    }, []);

    /* ─── fetch top-level game config ───────────────────── */
    useEffect(() => {
        fetch(META_URL)
            .then(r => r.json())
            .then(setMeta)
            .catch(err => console.error("Failed to fetch meta:", err));
    }, []);

    /* ─── derive target info from meta ──────────────────── */
    const target       = meta?.target ?? null;                       // e.g. "India"
    const targetIso    = target ? countryToRealCountry[target] : null;
    const targetKey    = target ? target.toLowerCase() : null;
    const guessColours = meta?.guessColours ?? [];
    const infoDescription = meta?.infoDescription ?? null;  
    const source = meta?.source ?? null;  

    /* ─── fetch per-country hints once ISO known ────────── */
    useEffect(() => {
        if (!targetIso) return;                                      // nothing to fetch yet
        const dataUrl =
            `https://raw.githubusercontent.com/a-jiwa/chartle-data/main/countries/${targetIso}.json`;

        fetch(dataUrl)
            .then(r => r.json())
            .then(setTargetData)
            .catch(err => console.error("Failed to fetch target country data:", err));
    }, [targetIso]);

    /* ─── confetti sequence ─────────────────────────────── */
    useEffect(() => {
        if (status !== "won") {
            setShowWinModal(false);
            return;
        }

        const confettiDelay = 300;          // ms before confetti starts
        const modalDelay    = confettiDelay + 1000; // modal appears 1 s after confetti

        const confettiTimer = setTimeout(() => {
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
                disableForReducedMotion: true,
                colors: ["#c43333", "#3b9e9e", "#4f7cac", "#b48f2b", "#8c6fa8", "#d17968"] // chartle colours
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
            if (status === "lost") {
                const timeout = setTimeout(() => {
                    setShowLoseModal(true);
                }, 3000); // 3 seconds delay

                return () => clearTimeout(timeout);
            } else {
                setShowLoseModal(false);
            }
        }, [status]);


    /* ─── add a guess (case-insensitive, max 5) ─────────── */
    const handleAddGuess = (raw) => {
        if (status !== "playing") return;

        const text = raw.trim();
        if (!text) return;

        const key   = text.toLowerCase();
        const title = text.replace(/\b\w/g, c => c.toUpperCase());

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
    if (!meta || !targetIso) return null;

    /* ─── render ────────────────────────────────────────── */
    return (
        <div className="h-full flex flex-col items-center">
            <Header />
            <div className="pt-12 flex flex-col w-full max-w-[700px] h-full">
                {/* chart pane */}
                <div className="flex-none h-2/3">
                    <Chart
                        csvUrl={meta.csvUrl}
                        meta={meta}
                        target={target}
                        others={meta.others ?? []}
                        guesses={guesses}
                        guessColours={guessColours}
                    />
                </div>

                {/* bottom pane */}
                <div className="flex-none">
                        <Guesses
                            guesses={guesses}
                            onAddGuess={handleAddGuess}
                            status={status}
                            max={MAX_GUESSES}
                            guessColours={guessColours}
                            targetData={targetData}
                            countryToIso={countryToIso}
                        />
                </div>

            </div>

            {/* win modal (appears after confetti) */}
            {showWinModal && (
                <WinModal
                    onClose={() => setStatus("done")}
                    guesses={guesses}
                    target={target}
                    infoDescription={infoDescription}
                    source={source}
                />
            )}

            {/* lose modal */}
            {showLoseModal && (
                <LoseModal 
                    onClose={() => setStatus("done")} 
                    target={target}
                    infoDescription={infoDescription}
                    source={source}
                 />
            )}
        </div>
    );
}
