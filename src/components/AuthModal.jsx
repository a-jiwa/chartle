import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'

import { auth, googleProvider } from '../lib/firebase'
import Modal from './Modal'
import { GoogleButton } from './GoogleButton.jsx'

function formatDate (ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(
        'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }
    )
}

export default function AuthModal ({ open, onClose }) {
    const [user, setUser] = useState(null)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, setUser)
        return unsub
    }, [])

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
            onClose()
        } catch (err) {
            console.error(err)
            window.alert('Google sign‑in failed. Please try again.')
        }
    }

    const handleLogout = () => signOut(auth)

    return (
        <Modal
            title={user ? 'Account' : 'Log in / Sign‑up'}
            open={open}
            onClose={onClose}
            footer={
                <button
                    onClick={onClose}
                    className='ms-auto rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300'
                >
                    Close
                </button>
            }
        >
            {user ? (
                <div className='flex w-full flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900 sm:flex-row sm:items-center'>
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt=''
                            className='h-10 w-10 rounded-full'
                            referrerPolicy='no-referrer'
                        />
                    )}

                    {/* name, email, dates */}
                    <div className='grow overflow-hidden'>
                        <p className='font-medium text-gray-900 dark:text-gray-100'>
                            {user.displayName}
                        </p>
                        <p className='truncate text-sm text-gray-600 dark:text-gray-400'>
                            {user.email}
                        </p>
                        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                            <span className='font-medium'>Member since:</span>{' '}
                            <span className='font-bold'>{formatDate(user.metadata.creationTime)}</span>
                        </p>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            <span className='font-medium'>Last sign‑in:</span>{' '}
                            <span className='font-bold'>{formatDate(user.metadata.lastSignInTime)}</span>
                        </p>
                    </div>

                    {/* sign‑out */}
                    <button
                        onClick={handleLogout}
                        className='shrink-0 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 sm:ms-auto'
                    >
                        Sign out
                    </button>
                </div>
            ) : (
                <div className='flex justify-center py-4'>
                    <GoogleButton onClick={handleLogin} />
                </div>
            )}
        </Modal>
    )
}
