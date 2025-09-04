/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Geograph", "Open Sans", "system-ui", "sans-serif"],
                geograph: ["Geograph", "Open Sans", "system-ui", "sans-serif"],
                "geograph-edit": ["GeographEdit", "Open Sans", "system-ui", "sans-serif"]
            }
        },
    },
    plugins: [],
};
