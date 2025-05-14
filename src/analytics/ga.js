// src/analytics/ga.js
import ReactGA from "react-ga4";

export const initGA = () => {
    ReactGA.initialize("G-Y5KH49S1XK");
};

export const trackPageView = () => {
    ReactGA.send({ hitType: "pageview", page: window.location.pathname });
};

// Track a guess
export const trackGuess = (guess, guessNumber) => {
    ReactGA.event({
        category: "Game",
        action: "Guess",
        label: guess,
        value: guessNumber,
    });
};

// Track game end (won/lost)
export const trackGameEnd = (status, totalGuesses, target) => {
    ReactGA.event({
        category: "Game",
        action: status === "won" ? "Win" : "Lose",
        label: target,
        value: totalGuesses,
    });
};