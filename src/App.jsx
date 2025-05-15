/* ─── src/App.jsx ─────────────────────────────────────────── */

import { useState, useEffect } from "react";
import Chart    from "./components/Chart";
import Guesses  from "./components/Guesses";
import WinModal from "./components/WinModal";

import { COUNTRIES } from "./data/countries";
import { initGA, trackPageView, trackGuess, trackGameEnd } from "./analytics/ga";

const META_URL = "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/config/003_electric_car_sales_share.json";
const CSV_URL  = "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/data/cleaned_electric_car_sales_share.csv";
const MAX_GUESSES = 5;

export default function App() {
    const [meta,    setMeta]    = useState(null);
    const [guesses, setGuesses] = useState([]);
    const [status,  setStatus]  = useState("playing");   // 'playing' | 'won' | 'lost' | 'done'

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
    const target       = meta.target;          // e.g. "India"
    const targetKey    = target.toLowerCase();

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

            return next;
        });
    };

    return (
        <div className="h-full flex flex-col items-center">
            <div className="flex flex-col w-full max-w-[1000px] h-full">
                {/* chart pane */}
                <div className="flex-none h-2/3">
                    <Chart
                        csvUrl={CSV_URL}
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
                    />
                </div>
            </div>

            {/* win modal */}
            {status === "won" && <WinModal onClose={() => setStatus("done")} />}
        </div>
    );
}
