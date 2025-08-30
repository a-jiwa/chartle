import Modal from "./Modal";

export default function HelpModal({ open, onClose }) {
    return (
        <Modal open={open} onClose={onClose}>
            <div className="space-y-4">
                <h2 className="text-xl font-semibold [color:var(--text-color)]">
                    How to play Chartle
                </h2>
                <p className="[color:var(--text-color)]">
                    Guess the country highlighted in{" "}
                    <span style={{ color: "var(--target-red)" }} className="font-bold">red</span> in today’s chart.
                </p>
                <p className="[color:var(--text-color)]">
                    Type any country in the world into the box below the chart to see how it compares to the red target country.
                </p>
                <p className="[color:var(--text-color)]">
                    That’s it, no other clues. Good luck!
                </p>

                <div className="flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </Modal>
    );
}
