import { forwardRef } from 'react';

export const GoogleButton = forwardRef(function GoogleButton(
    { children = 'Sign in with Google', className = '', ...props },
    ref
) {
    return (
        <button
            ref={ref}
            aria-label="Sign in with Google"
            className={`group inline-flex items-center overflow-hidden rounded-md border
        border-gray-300 bg-white px-0.5 pr-4 text-gray-700 shadow
        hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-300
        dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200
        dark:hover:bg-gray-700 dark:focus:ring-gray-600
        ${className}`}
            {...props}
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                >
                    <path
                        fill="#4285f4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34a853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#fbbc05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="#ea4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
            </div>

            <span className="ml-3 whitespace-nowrap text-sm tracking-wider">
        {children}
      </span>
        </button>
    );
});
