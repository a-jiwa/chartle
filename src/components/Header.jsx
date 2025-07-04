import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Header({ onOpen }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const items = [
        { id: "help",     label: "Help" },
        { id: "history",  label: "History" },
        { id: "settings", label: "Settings" },
        { id: "auth",     label: "Login / Sign-up" },
    ];

    const handleClick = (id) => {
        onOpen?.(id);
        setMenuOpen(false);
    };

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-300 bg-[#f9f9f9]/60 backdrop-blur-md">
            <div className="relative mx-auto flex w-full max-w-[700px] flex-wrap items-center justify-center px-4 py-3">
                {/* title */}
                <h1 className="text-xl font-[Menlo,_monospace] tracking-wide text-gray-800">
                    chartle
                </h1>

                {/* hamburger (mobile) */}
                <button
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="absolute right-4 inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 md:hidden"
                >
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {/* desktop buttons */}
                <nav className="ml-auto hidden gap-6 md:flex md:w-auto">
                    {items.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => handleClick(id)}
                            className="text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                {/* mobile dropdown – full-width */}
                {menuOpen && (
                    <nav className="absolute inset-x-0 top-full origin-top bg-white shadow-md md:hidden">
                        <ul className="flex flex-col divide-y divide-gray-200">
                            {items.map(({ id, label }) => (
                                <li key={id}>
                                    <button
                                        onClick={() => handleClick(id)}
                                        className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        {label}
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
