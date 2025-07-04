import { useState } from "react";
import { COUNTRIES } from "../data/countries";
import { guessColours } from "../data/colors.js";

/* ─────────────────────────── Levenshtein helper ─────────────────────────── */
function levenshtein(a = "", b = "") {
    const rows = b.length + 1;
    const cols = a.length + 1;
    const d = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => (i === 0 ? j : i))
    );

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            d[i][j] =
                b[i - 1] === a[j - 1]
                    ? d[i - 1][j - 1]
                    : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
        }
    }
    return d[rows - 1][cols - 1];
}

const compassSequence = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];

/* ─────────────────────────────── Component ──────────────────────────────── */
export default function Guesses({
                                    guesses,
                                    onAddGuess,
                                    status,
                                    max,
                                    targetData,
                                    countryToIso,
                                    clue = false,
                                    validCountries = [],
                                    target,
                                }) {
    const [value, setValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState("");
    const [spinningEmojis, setSpinningEmojis] = useState({});
    const [distanceTicks, setDistanceTicks] = useState({}); // ── NEW
    const [highlightedIndex, setHighlightedIndex] = useState(-1);


    const disabled = status !== "playing";
    const trimmed = value.trim();
    const lcTrimmed = trimmed.toLowerCase();

    const currentGuess = Math.min(guesses.length + 1, max);

    /* — Valid country? — */
    const isDataCountry = validCountries.includes(trimmed);
    const isValidCountry = COUNTRIES.some((c) => c.toLowerCase() === lcTrimmed) && isDataCountry;

    /* — Ranked suggestions — */
    const filtered = COUNTRIES.filter(
        (c) => c.toLowerCase().includes(lcTrimmed) && lcTrimmed
    )
        .sort((a, b) => {
            const aLc = a.toLowerCase();
            const bLc = b.toLowerCase();

            /* startsWith comes first */
            const aStarts = aLc.startsWith(lcTrimmed);
            const bStarts = bLc.startsWith(lcTrimmed);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            /* Levenshtein distance */
            const distA = levenshtein(aLc, lcTrimmed);
            const distB = levenshtein(bLc, lcTrimmed);
            if (distA !== distB) return distA - distB;

            /* Alphabetical fallback */
            return a.localeCompare(b);
        })
        .reverse();

    /* ───────────────── distance animation helper ─────────────────────
       Variable STEP SIZE
       • Far away  → big jumps  (fast)
       • Near goal → 1-km steps (slow)                      */
    function animateDistance(label, finalValue) {
        if (finalValue == null || finalValue <= 0) {
            setDistanceTicks((p) => ({ ...p, [label]: finalValue ?? 0 }));
            return;
        }

        const SLOW_ZONE       = 50;   // once ≤150 km left; step = 1
        const BASE_DELAY      = 8;    // ms between ticks while cruising
        const EXTRA_SLOW_MAX  = 180;   // max additional delay for very last tick

        let current = 0;

        function tick() {
            setDistanceTicks((p) => ({ ...p, [label]: current }));

            if (current >= finalValue) return;

            /* ───── determine step size ───── */
            const remaining = finalValue - current;
            const step =
                remaining > SLOW_ZONE
                    // Far away: chunk size scales with remaining distance
                    ? Math.max(1, Math.round(remaining / 60))
                    // Near goal: 1-by-1
                    : 1;

            current = Math.min(current + step, finalValue);

            /* ───── determine delay ───── */
            let delay = BASE_DELAY;

            if (remaining <= SLOW_ZONE) {
                // cubic slow-down for the final zone
                const progress = 1 - (remaining - step) / SLOW_ZONE; // 0→1
                delay += EXTRA_SLOW_MAX * Math.pow(progress, 3);
            }

            setTimeout(tick, delay);
        }

        tick();
    }




    /* — Submit guess — */
    const submit = (e) => {
        e.preventDefault();

        if (!trimmed) {
            setError("Please enter a country.");
            return;
        }
        if (!isValidCountry) {
            setError("Invalid country. Please select from the list.");
            return;
        }
        if (!isDataCountry) {
            setError("This country has no data available.");
            return;
        }
        if (guesses.some((g) => g.toLowerCase() === lcTrimmed)) {
            setError("You already guessed that country.");
            return;
        }

        setError("");
        onAddGuess(trimmed);

        const guess = trimmed;
        const guessIso = countryToIso[guess];
        const dataForGuess = targetData?.[guessIso];
        const finalDirection = dataForGuess?.direction || "🎯";
        const finalDistance = dataForGuess?.distance_km ?? 0;

        /* ── start distance counter ── */
        if (clue) {
            animateDistance(guess, finalDistance);
        } else {
            setDistanceTicks((prev) => ({ ...prev, [guess]: finalDistance }));
        }

        if (clue) {
            /* ── start compass spin ── */
            const targetIndex = compassSequence.indexOf(finalDirection);
            const totalSteps = compassSequence.length * 4 + targetIndex; // 3 spins + land

            let currentStep = 0;
            function spinStep() {
                const delay = 50 + Math.pow(currentStep, 1.4); // exponential easing
                const nextIndex = currentStep % compassSequence.length;
                const nextEmoji = compassSequence[nextIndex];

                setSpinningEmojis((prev) => ({
                    ...prev,
                    [guess]: nextEmoji,
                }));

                currentStep++;
                if (currentStep <= totalSteps) setTimeout(spinStep, delay);
            }
            spinStep();
        }

        /* ── clear input ── */
        setValue("");
        setShowSuggestions(false);
    };

    /* — Choose a suggestion — */
    const selectSuggestion = (country) => {
        setValue(country);
        setShowSuggestions(false);
        setError("");
    };

    return (
        <div className="flex flex-col items-center gap-3 py-5">
            {/* ── instruction ── */}
            {guesses.length === 0 && (
                <p className="text-m font-medium text-gray-800 pt-0.5">
                    Guess the country in{" "}
                    <span className="font-semibold" style={{ color: "#c43333" }}>
                        red
                    </span>
                </p>
            )}

            {/* ─────────── Input form ─────────── */}
            <form onSubmit={submit} className="w-full px-[50px]">
                <div className="relative">
                    {/* ─────────── Input + button ─────────── */}
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 20 20"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 19l-4-4m0-7a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>

                    <input
                        id="guess-input"
                        type="text"
                        placeholder="Enter country"
                        value={value}
                        disabled={disabled}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setShowSuggestions(true);
                            setHighlightedIndex(-1);  // Reset highlight on new input
                            setError("");
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setShowSuggestions(true);
                                setHighlightedIndex((idx) =>
                                idx < filtered.length - 1 ? idx + 1 : 0
                                );
                            } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setShowSuggestions(true);
                                setHighlightedIndex((idx) =>
                                idx > 0 ? idx - 1 : filtered.length - 1
                                );
                            } else if (e.key === "Enter") {
                                if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
                                e.preventDefault();
                                selectSuggestion(filtered[highlightedIndex]);
                                setHighlightedIndex(-1);
                                } else if (!isValidCountry && filtered.length) {
                                e.preventDefault();
                                selectSuggestion(filtered[filtered.length - 1]);
                                }
                            }
                        }}
                        onBlur={() =>
                            setTimeout(() => setShowSuggestions(false), 100)
                        }
                        className={`block w-full p-4 pl-10 text-sm rounded-lg bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 outline-none ${
                            trimmed && !isValidCountry
                                ? "border border-red-500"
                                : "border border-gray-300"
                        }`}
                        autoComplete="on"
                    />

                    <button
                        type="submit"
                        disabled={!isValidCountry || disabled || guesses.length >= max}
                        className={`text-white absolute right-2 bottom-2 font-medium rounded-lg text-sm px-4 py-2 disabled:bg-gray-400 ${
                            isValidCountry && !disabled && guesses.length < max
                                ? "bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-300"
                                : "bg-gray-300 text-gray-700 cursor-not-allowed"
                        }`}
                    >
                        {`Guess ${currentGuess}/${max}`}
                    </button>


                    {/* ─────────── Suggestions ─────────── */}
                    {showSuggestions && filtered.length > 0 && (
                        <ul
                            className="absolute left-0 right-0 bottom-full mb-2 z-50 w-full max-h-60
                           bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto"
                        >
                            {filtered.map((country, idx) => {
                                const hasData = validCountries.includes(country);
                                const isInactive = !hasData;

                                return (
                                    <li
                                    key={country}
                                    className={`cursor-pointer py-4 px-4 text-sm flex justify-between items-center ${
                                        idx === highlightedIndex
                                        ? "bg-emerald-50 font-semibold"
                                        : "hover:bg-gray-100"
                                    } ${isInactive ? "text-gray-400" : "text-gray-800"}`}
                                    onMouseDown={() => {
                                        if (!isInactive) {
                                        selectSuggestion(country);
                                        setHighlightedIndex(-1);
                                        }
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    >
                                    <span>{country}</span>
                                    {isInactive && <span className="text-xs ml-2">(no data)</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </form>

            {/* ─────────── Error ─────────── */}
            {error && (
                <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
            )}

            {/* ─────────── Previous guesses ─────────── */}
            {guesses.length > 0 && (
                <div className="w-full px-[50px] flex flex-col space-y-2">
                    {[...guesses].reverse().map((g, idx) => {
                        const i = guesses.length - 1 - idx; // Adjust index to match original order
                        const guessIso = countryToIso[g];
                        const match = targetData?.[guessIso];
                        const direction = match?.direction;
                        const emoji = clue ? (spinningEmojis[g] || direction || "") : "";
                        const distance =
                            distanceTicks[g] ?? match?.distance_km ?? 0;

                        return (
                            <div
                                key={g}
                                className="flex justify-between items-center w-full p-3 rounded-lg border border-gray-300 bg-white"
                            >
                                {/* Left: numbered country */}
                                <span
                                    className="font-semibold"
                                    style={{
                                        color: g.trim().toLowerCase() === target.trim().toLowerCase()
                                        ? "#c43333"
                                        : guessColours[i] ?? "#2A74B3"
                                    }}
                                    >
                                    {`${i + 1}. ${g}`}
                                </span>

                                {/* Right: arrow + distance */}
                                {match && clue && (
                                    <span className="flex items-center gap-1 text-gray-700 text-sm font-medium">
                                        <span>{emoji}</span>
                                        <span>{distance} km</span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
