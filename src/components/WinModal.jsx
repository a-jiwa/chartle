export default function WinModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-lg">
                <h2 className="mb-4 text-2xl font-bold text-emerald-600">You win! 🎉</h2>
                <button
                    onClick={onClose}
                    className="mt-2 rounded bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
