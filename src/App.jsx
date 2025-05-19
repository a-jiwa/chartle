/* ─── src/App.jsx ─────────────────────────────────────────── */

import { useState, useEffect } from "react";
import Chart    from "./components/Chart";
import Guesses  from "./components/Guesses";
import WinModal from "./components/WinModal";

import countryToIso from "./data/country_to_iso.json";
import countryToRealCountry from "./data/country_to_real_country.json";

import { COUNTRIES } from "./data/countries";
import { initGA, trackPageView, trackGuess, trackGameEnd } from "./analytics/ga";

const META_URL = "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/config/006_deaths_in_armed_conflicts.json";
const MAX_GUESSES = 5;

export default function App() {
    const [meta,    setMeta]    = useState(null);
    const [guesses, setGuesses] = useState([]);
    const [status,  setStatus]  = useState("playing");   // 'playing' | 'won' | 'lost' | 'done'
    const [targetData, setTargetData] = useState(null);

    useEffect(() => {
        initGA();
        trackPageView();
    }, []);

    /* pull the config once */
    useEffect(() => {
        fetch(META_URL)
            .then(r => r.json())
            .then(setMeta);
    }, []);

    /* show nothing until config arrives */
    if (!meta) return null;

    const guessColours = meta.guessColours;
    const target = meta.target; // e.g. "India"
    const targetIso = countryToRealCountry[target]; // Get real country ISO code

    if (!targetIso) return;    const targetKey    = target.toLowerCase();

    const dataUrl = `https://raw.githubusercontent.com/a-jiwa/chartle-data/main/countries/${targetIso}.json`;

    fetch(dataUrl)
        .then((res) => res.json())
        .then((data) => setTargetData(data))
        .catch((err) => console.error("Failed to fetch target country data:", err));

    /** add a guess (case-insensitive, max 5, ignore dups) */
    const handleAddGuess = (raw) => {
        if (status !== "playing") return;

        const text   = raw.trim();
        if (!text) return;

        const key    = text.toLowerCase();
        const title  = text.replace(/\b\w/g, c => c.toUpperCase());

        const isValid = COUNTRIES.some(c => c.toLowerCase() === key);
        if (!isValid) return; // ignore invalid guesses

        setGuesses(prev => {
            if (prev.some(g => g.toLowerCase() === key) || prev.length >= MAX_GUESSES) {
                return prev;
            }

            const next = [...prev, title];

            // Track the guess
        trackGuess(title, next.length);

        if (key === targetKey) {
            setStatus("won");
            trackGameEnd("won", next.length, target);
        } else if (next.length >= MAX_GUESSES) {
            setStatus("lost");
            trackGameEnd("lost", next.length, target);
        }

            // Get direction + distance for hint
            const guessIso = countryToIso[title];
            if (guessIso && targetData[guessIso]) {
                const { direction, distance_km } = targetData[guessIso];
                console.log(`Your guess is ${distance_km}km to the ${direction}`);
            }

            return next;
        });
    };

    return (
        <div className="h-full flex flex-col items-center">
            <div className="flex flex-col w-full max-w-[1000px] h-full">
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

                {/* guess input pane */}
                <div className="flex-none h-1/3">
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

            {/* win modal */}
            {status === "won" && <WinModal onClose={() => setStatus("done")} />}
        </div>
    );
}
