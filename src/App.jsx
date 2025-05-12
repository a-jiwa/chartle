/* ─── src/App.jsx ─────────────────────────────────────────── */

import { useState } from "react";
import Header   from "./components/Header";
import Chart    from "./components/Chart";
import Guesses  from "./components/Guesses";
import WinModal from "./components/WinModal";

const TARGET       = "India";
const TARGET_KEY   = TARGET.toLowerCase();   // canonical form
const MAX_GUESSES  = 5;

export default function App() {
    const [guesses, setGuesses] = useState([]);
    const [status,  setStatus]  = useState("playing"); // 'playing' | 'won' | 'lost' | 'done'

    /** add a guess (case-insensitive, max 5, ignore dups) */
    const handleAddGuess = (raw) => {
        if (status !== "playing") return;

        const text = raw.trim();
        if (!text) return;

        const key   = text.toLowerCase();                       // normalised key
        const title = text.replace(/\b\w/g, c => c.toUpperCase()); // simple Title-Case

        setGuesses(prev => {
            if (prev.some(g => g.toLowerCase() === key) || prev.length >= MAX_GUESSES) {
                return prev;                                        // duplicate or out of turns
            }

            const next = [...prev, title];

            if (key === TARGET_KEY)          setStatus("won");
            else if (next.length >= MAX_GUESSES) setStatus("lost");

            return next;
        });
    };

    return (
        <div className="h-full flex flex-col items-center">
            {/*<Header />*/}

            <div className="flex flex-col w-full max-w-[1000px] h-full">
                {/* chart pane */}
                <div className="flex-none h-2/3">
                    <Chart
                        target={TARGET}
                        others={["Indonesia", "Ecuador", "Nigeria", "Philippines", "Angola"]}
                        guesses={guesses}
                    />
                </div>

                {/* guess input pane */}
                <div className="flex-none h-1/3">
                    <Guesses
                        guesses={guesses}
                        onAddGuess={handleAddGuess}
                        status={status}
                        max={MAX_GUESSES}
                    />
                </div>
            </div>

            {/* win modal */}
            {status === "won" && <WinModal onClose={() => setStatus("done")} />}
        </div>
    );
}
