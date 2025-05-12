import { useState } from "react";

export default function Guesses({ guesses, onAddGuess, status, max }) {
    const [value, setValue] = useState("");

    const submit = e => {
        e.preventDefault();
        onAddGuess(value);
        setValue("");
    };

    const disabled = status !== "playing";

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
            <p className="text-lg text-gray-700">
                Guesses: <span className="font-semibold">{guesses.length}</span> / {max}
            </p>

            <form onSubmit={submit} className="flex w-full max-w-xs">
                <input
                    type="text"
                    placeholder="Enter country"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={disabled}
                    className="flex-1 rounded-l border border-gray-300 px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-emerald-500
                     disabled:bg-gray-100"
                />
                <button
                    type="submit"
                    disabled={disabled}
                    className="rounded-r bg-emerald-500 px-4 py-2 text-white
                     hover:bg-emerald-600 disabled:bg-gray-400"
                >
                    Enter
                </button>
            </form>

            {guesses.length > 0 && (
                <ul className="space-y-1">
                    {guesses.map(g => <li key={g}>{g}</li>)}
                </ul>
            )}
        </div>
    );
}
