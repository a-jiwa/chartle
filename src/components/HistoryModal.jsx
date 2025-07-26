import { useEffect, useState } from 'react';
import Modal from './Modal';
import { loadHistory } from '../utils/historyStore.js';
import { guessColours } from '../data/colors.js';

const TARGET_COLOUR = '#c43333';
const LIGHT_BORDER  = '#d1d5db';
const DARK_BORDER   = '#4b5563';

/* Helpers */
function dateKey(d) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function goToDate(iso) {
    const url = new URL(window.location.href);
    url.searchParams.set('d', iso);
    url.hash = '';
    window.location.href = url.toString();
}

export default function HistoryModal({ open, onClose }) {
    const [rows, setRows] = useState([]);

    /* rebuild the table every time the modal opens */
    useEffect(() => {
        if (!open) return;

        (async () => {
            const history = await loadHistory();
            const out = [];

            const stop = new Date('2025-07-01');
            const cur  = new Date();

            while (cur >= stop) {
                const key = dateKey(cur);
                const rec = history[key] || {};

                out.push({
                    key,
                    date: new Date(cur),
                    guesses: Array.isArray(rec.guesses) ? rec.guesses.slice(0, 5) : [],
                    target: rec.target || null,
                });

                cur.setDate(cur.getDate() - 1);
            }
            setRows(out);
        })();
    }, [open]);

    return (
        <Modal
            title="History"
            open={open}
            onClose={onClose}
            footer={
                <button
                    onClick={onClose}
                    className="ms-auto rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-500"
                >
                    Close
                </button>
            }
        >
            <ul className="max-h-[60vh] px-4 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map(({ key, date, guesses, target }) => {
                    const played = guesses.length > 0;

                    const fullDate = date.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    });
                    const numericDate = date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                    });

                    return (
                        <li key={key}>
                            <button
                                type="button"
                                onClick={() => goToDate(key)}
                                className="w-full flex items-center justify-between sm:px-1 px-3 sm:py-3 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700"
                            >
                                {/* date label */}
                                <span
                                    className={`text-sm ${
                                        played
                                            ? 'font-bold text-gray-900 dark:text-white'
                                            : 'font-medium text-gray-800 dark:text-gray-300'
                                    }`}
                                >
                  <span className="inline sm:hidden">{numericDate}</span>
                  <span className="hidden sm:inline">{fullDate}</span>
                </span>

                                {/* guess circles */}
                                <div className="flex gap-2">
                                    {Array.from({ length: 5 }, (_, i) => {
                                        let fill   = 'white';
                                        let border = LIGHT_BORDER;

                                        if (i < guesses.length) {
                                            const g = guesses[i] || '';
                                            const correct =
                                                target && g.toLowerCase() === target.toLowerCase();
                                            fill   = correct ? TARGET_COLOUR : guessColours[i];
                                            border = fill;
                                        }

                                        return (
                                            <span
                                                key={i}
                                                className="block sm:h-4 sm:w-4 h-5 w-5 rounded-full border dark:border-gray-600"
                                                style={{ backgroundColor: fill, borderColor: border || DARK_BORDER }}
                                            />
                                        );
                                    })}
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Modal>
    );
}
