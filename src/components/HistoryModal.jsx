import Modal from "./Modal";

export default function HistoryModal({ open, onClose }) {
    return (
        <Modal
            title="History"
            open={open}
            onClose={onClose}
            footer={
                <button
                    onClick={onClose}
                    className="ms-auto rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    Close
                </button>
            }
        >
            <p>Your play history will appear here.</p>
        </Modal>
    );
}
