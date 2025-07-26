import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Header({ onOpen }) {
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    /* avatar (desktop) or fallback label */
    const accountLabel = user
        ? user.photoURL
            ? (
                <img
                    src={user.photoURL}
                    alt="Account"
                    className="h-6 w-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                />
            )
            : (
                <span
                    aria-label="Account"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 text-xs font-semibold text-white"
                >
            {user.displayName?.charAt(0).toUpperCase()}
          </span>
            )
        : 'Sign in';

    const items = [
        { id: 'help',     label: 'Help' },
        { id: 'history',  label: 'History' },
        { id: 'settings', label: 'Settings' },
        { id: 'auth',     label: accountLabel },
    ];

    const handleClick = (id) => {
        onOpen?.(id);
        setMenuOpen(false);
    };

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-300 dark:border-gray-700 bg-[#f9f9f9]/60 dark:bg-[#111]/60 backdrop-blur-md">
            <div className="relative mx-auto flex w-full max-w-[700px] flex-wrap items-center justify-center px-4 py-3">
                {/* title */}
                <h1 className="text-xl font-[Menlo,_monospace] tracking-wide text-gray-800 dark:text-white">
                    chartle
                </h1>

                {/* hamburger (mobile) */}
                <button
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="absolute right-4 inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 md:hidden"
                >
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {/* desktop buttons */}
                <nav className="ml-auto hidden gap-6 md:flex md:w-auto">
                    {items.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => handleClick(id)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                {/* mobile dropdown */}
                {menuOpen && (
                    <nav className="absolute inset-x-0 top-full origin-top bg-white dark:bg-[#1a1a1a] shadow-md md:hidden">
                        <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map(({ id, label }) => (
                                <li key={id}>
                                    <button
                                        onClick={() => handleClick(id)}
                                        className="block w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        {id === 'auth' && user
                                            ? 'Account'
                                            : typeof label === 'string'
                                                ? label
                                                : 'Account'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
}
