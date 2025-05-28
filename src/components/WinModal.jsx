import { useState } from "react";

export default function WinModal({ onClose, guesses, target, infoDescription }) {
    const [copied, setCopied] = useState(false);

    const guessCount = guesses.length;

    const shareText = [
        `🌍 Chartle - You won in ${guessCount} guess${guessCount > 1 ? "es" : ""}!`,
        "chartle.netlify.app"
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
                    <p className="text-gray-700">
                        You guessed <strong>{target}</strong> in {guessCount} attempt{guessCount > 1 ? "s" : ""}
                    </p>
                    <p className="text-gray-700">
                        {infoDescription}
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
