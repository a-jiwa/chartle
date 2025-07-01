import { useState, useEffect } from "react";
import * as d3 from "d3";

function extractSeries(data, country) {
    return data
        .filter(d => d.Country.toLowerCase() === country.toLowerCase())
        .sort((a, b) => a.Year - b.Year)
        .map(d => d.Production);
}

function getSimilarityScore(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    return a.reduce((acc, val, i) => acc + Math.abs(val - b[i]), 0) / a.length;
}

function getEmojiBlock(score, thresholds) {
    if (score === 0) return "🟦";        // Perfect match
    if (score <= thresholds.green) return "🟩";   // Very close
    if (score <= thresholds.yellow) return "🟨";  // Reasonably close
    if (score <= thresholds.orange) return "🟧";  // Vaguely similar
    return "🟥";                                  // Bad guess
}

export default function WinModal({ onClose, guesses, target, infoDescription, source, csvUrl, title, maxGuesses }) {
    const [copied, setCopied] = useState(false);
    const [emojiString, setEmojiString] = useState("");

    useEffect(() => {
        if (!csvUrl || !target) return;

        d3.csv(csvUrl, d3.autoType).then(rows => {
            const columns = Object.keys(rows[0]);
            const yearCols = columns.filter(c => /^\d{4}$/.test(c));
            let longData;

            if (yearCols.length > 3) {
                const [colCountry, colISO] = columns;
                longData = rows.flatMap(row =>
                    yearCols.map(year => ({
                        Country: row[colCountry],
                        Year: +year,
                        Production: row[year],
                    }))
                );
            } else {
                const [colCountry, colISO, colYear] = columns;
                const colProd = columns.find((col, i) => i > 2 && typeof rows[0][col] === "number");
                longData = rows.map(row => ({
                    Country: row[colCountry],
                    Year: row[colYear],
                    Production: row[colProd],
                }));
            }

            const targetSeries = extractSeries(longData, target);
            const allCountries = Array.from(new Set(longData.map(d => d.Country)));
            const scores = allCountries.map(country => {
                const series = extractSeries(longData, country);
                return {
                    country,
                    score: getSimilarityScore(targetSeries, series),
                };
            }).filter(d => d.score !== Infinity);

            // Compute dynamic score thresholds
            const allScores = scores.map(s => s.score).sort((a, b) => a - b);
            const thresholds = {
                green: d3.quantile(allScores, 0.02),   // top 2%
                yellow: d3.quantile(allScores, 0.05),  // top 5%
                orange: d3.quantile(allScores, 0.15),  // top 15%
            };

            const scoreMap = Object.fromEntries(scores.map(s => [s.country.toLowerCase(), s.score]));

            const emoji = guesses.map(g => {
                const score = scoreMap[g.toLowerCase()];
                return getEmojiBlock(score, thresholds);
            }).join("");

            setEmojiString(emoji);
        });
    }, [csvUrl, target, guesses]);

    const guessCount = guesses.length;

    const shareText = [
        `📈 Chartle — ${title}`,
        `${guessCount}/${maxGuesses} ✅`,
        emojiString,
        "chartle.cc"
    ].join("\n");


    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold text-emerald-600">Congratulations!</h2>
                    <p className="text-gray-700 mb-6">
                        You guessed <strong>{target}</strong> in {guessCount} attempt{guessCount > 1 ? "s" : ""}
                    </p>
                    {infoDescription.split('\n').map((line, index) => (
                        <p key={index} className="text-gray-700 text-left mb-4">
                            {line}
                        </p>
                    ))}
                    <p className="text-sm text-gray-700 text-left">
                        Data source: {source}
                    </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="rounded-xl bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600 transition-colors"
                    >
                        {copied ? "Copied!" : "Share Result"}
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-xl bg-emerald-500 px-5 py-2 text-white font-medium hover:bg-emerald-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
