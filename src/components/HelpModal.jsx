import Modal from "./Modal";

export default function HelpModal({ open, onClose }) {
    return (
        <Modal
            title="How to play Chartle"
            open={open}
            onClose={onClose}
            footer={
                <button
                    onClick={onClose}
                    className="ms-auto rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-500"
                >
                    Got it
                </button>
            }
        >
            <p className="text-gray-700 dark:text-gray-200">
                Guess the country behind today’s chart. You have five guesses.
            </p>
        </Modal>
    );
}
