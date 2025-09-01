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
//     if (score === 0) return "🟦";
//     if (score <= thresholds.green) return "🟩";
//     if (score <= thresholds.yellow) return "🟨";
//     if (score <= thresholds.orange) return "🟧";
//     return "🟥";
// }

export default function LoseModal({
                                      open,
                                      onClose,
                                      target,
                                      infoDescription,
                                      source,
                                      csvUrl,
                                      guesses,
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
        `X/${maxGuesses} ❌`,
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
            title="Out of guesses"
            open={open}
            onClose={onClose}
            footer={
                <div className="flex justify-center w-full">
                    <button
                        onClick={handleCopy}
                        className="w-full sm:w-auto rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:ring-4"
                        style={{
                            backgroundColor: 'var(--first-guess)',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--first-guess-dark)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--first-guess)'}
                    >
                        {copied ? "Copied!" : "Share result"}
                    </button>
                </div>
            }
        >
            <div className="text-center max-h-[60vh] overflow-y-auto">
                <p className="text-center mb-4 [color:var(--text-color)]">
                    The correct answer was <strong>{target}</strong>.
                </p>

                <div className="mb-4 space-y-3 [color:var(--text-color)] text-left">
                    {infoDescription.split("\n").map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                <p className="text-sm [color:var(--text-color)] mb-8 text-left">
                    Data source: {source}
                </p>
            </div>
        </Modal>
    );
}
