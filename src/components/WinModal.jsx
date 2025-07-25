import { useState, useEffect } from "react";
import Modal from "./Modal";

// function extractSeries(data, country) {
//     return data
//         .filter(d => d.Country.toLowerCase() === country.toLowerCase())
//         .sort((a, b) => a.Year - b.Year)
//         .map(d => d.Production);
// }
//
// function getSimilarityScore(a, b) {
//     if (!a || !b || a.length !== b.length) return Infinity;
//     return a.reduce((acc, val, i) => acc + Math.abs(val - b[i]), 0) / a.length;
// }
//
// function getEmojiBlock(score, thresholds) {
//     if (score === 0) return "🟦";        // Perfect match
//     if (score <= thresholds.green) return "🟩";   // Very close
//     if (score <= thresholds.yellow) return "🟨";  // Reasonably close
//     if (score <= thresholds.orange) return "🟧";  // Vaguely similar
//     return "🟥";                                  // Bad guess
// }

export default function WinModal({
                                     open,
                                     onClose,
                                     guesses,
                                     target,
                                     infoDescription,
                                     source,
                                     csvUrl,
                                     title,
                                     maxGuesses,
                                 }) {
    const [copied, setCopied] = useState(false);
    const [emojiString, setEmojiString] = useState("");

    /* ── D3 work – unchanged ───────────────────────────────────────── */
    useEffect(() => {
        if (!csvUrl || !target) return;
        /* …same D3 logic… */
    }, [csvUrl, target, guesses]);

    /* ── share text -------------------------------------------------- */
    const shareText = [
        `📈 Chartle — ${title}`,
        `${guesses.length}/${maxGuesses} ✅`,
        emojiString,
        "chartle.cc",
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

    /* ── modal body -------------------------------------------------- */
    return (
        <Modal
            title="Congratulations!"
            open={open}
            onClose={onClose}
            footer={
                <button
                    onClick={onClose}
                    className="ms-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300"
                >
                    Close
                </button>
            }
        >
            {/* Add horizontal padding with px‑5 */}
            <div className="px-5">
                <p className="text-center mb-4">
                    You guessed <strong>{target}</strong> in{" "}
                    {guesses.length} attempt{guesses.length > 1 ? "s" : ""}.
                </p>

                {infoDescription.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                ))}

                <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">Data source: {source}</p>

                <button
                    onClick={handleCopy}
                    className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    {copied ? "Copied!" : "Share result"}
                </button>
            </div>
        </Modal>
    )
}
