import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Header({ onOpen, dateLabel, overridden }) {
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

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
            <div className="relative mx-auto w-full max-w-[700px] px-4 py-3 h-[52px]">
                {/* Date label (always left) */}
                <span
                    className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
                        overridden
                            ? "bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 rounded text-yellow-800 dark:text-yellow-300"
                            : "text-[color:var(--axis-text-color)]"
                    }`}
                >
                    {dateLabel}
                </span>

                {/* Title centered */}
                <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-[Menlo,_monospace] tracking-wide text-gray-800 dark:text-white">
                    chartle
                </h1>

                {/* Hamburger button (always right) */}
                <button
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                >
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {/* Dropdown menu (mobile + desktop) */}
                {menuOpen && (
                    <nav className="absolute right-4 top-full w-48 origin-top rounded-md [background-color:var(--guessed-box)] shadow-md">
                        <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map(({ id, label }) => (
                                <li key={id}>
                                    <button
                                        onClick={() => handleClick(id)}
                                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
