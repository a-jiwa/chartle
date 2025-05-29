export default function LoseModal({ onClose, target, infoDescription, source }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold" style={{ color: '#c43333' }}>Out of guesses</h2>
                    <p className="text-gray-700 mb-6">
                        The correct answer was <strong style={{ color: '#c43333' }}>{target}</strong>.
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
