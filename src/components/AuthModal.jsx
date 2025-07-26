import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { auth, googleProvider } from '../lib/firebase';
import Modal from './Modal';
import { GoogleButton } from './GoogleButton.jsx';

export default function AuthModal({ open, onClose }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, setUser);
        return unsub;
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            onClose();
        } catch (err) {
            console.error(err);
            window.alert('Google sign‑in failed. Please try again.');
        }
    };

    const handleLogout = () => signOut(auth);

    return (
        <Modal
            title={user ? 'Account' : 'Log in / Sign‑up'}
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
            {user ? (
                <div className="flex w-full items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900">
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt=""
                            className="h-10 w-10 rounded-full"
                            referrerPolicy="no-referrer"
                        />
                    )}
                    <div className="grow">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                            {user.displayName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {user.email}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300"
                    >
                        Sign out
                    </button>
                </div>
            ) : (
                <div className="flex justify-center py-4">
                    <GoogleButton onClick={handleLogin} />
                </div>
            )}
        </Modal>
    );
}
