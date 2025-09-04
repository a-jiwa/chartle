import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

// Detect dark mode using a media query
function useDarkMode() {
    const [isDark, setIsDark] = useState(
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setIsDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isDark;
}

export default function Header({ onOpen, dateLabel, overridden }) {
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const isDark = useDarkMode();

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
        { id: 'auth',     label: accountLabel },
    ];

    const handleClick = (id) => {
        onOpen?.(id);
        setMenuOpen(false);
    };

    // Handle clicks outside the menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-300 dark:border-gray-700 backdrop-blur-md" style={{ backgroundColor: 'var(--header-bg-color)' }}>
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
                <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <img
                        src={isDark ? "/Chartle_web_header_darkmode.jpg" : "/Chartle_web_header.jpg"}
                        alt="Chartle logo"
                        className="h-9 sm:h-10 w-auto"
                        style={{ display: 'inline-block' }}
                    />
                </h1>

                {/* Hamburger button (always right) */}
                <button
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-lg p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 active:bg-gray-300 dark:active:bg-gray-700 touch-manipulation"
                >
                    {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Dropdown menu (mobile + desktop) */}
                {menuOpen && (
                    <div ref={menuRef}>
                        {/* Backdrop for mobile */}
                        <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpen(false)}
                        />
                        <nav className="absolute right-4 top-full w-48 origin-top rounded-md [background-color:var(--guessed-box)] shadow-md z-50">
                        <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map(({ id, label }) => (
                                <li key={id}>
                                    <button
                                        onClick={() => handleClick(id)}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 touch-manipulation"
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
                    </div>
                )}
            </div>
        </header>
    );
}
