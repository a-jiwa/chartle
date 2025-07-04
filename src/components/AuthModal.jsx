import Modal from "./Modal";

export default function AuthModal({ open, onClose }) {
    return (
        <Modal
            title="Log in / Sign-up"
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
            <p>Authentication coming soon.</p>
        </Modal>
    );
}
