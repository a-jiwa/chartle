/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Open Sans Variable", "system-ui", "sans-serif"]
            }
        },
    },
    plugins: [],
};
