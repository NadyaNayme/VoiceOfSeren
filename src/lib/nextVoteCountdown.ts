import { getCurrentEpoch, getNextHourEpoch } from "../utility/epochs";
import { updateSessionData } from "../utility/helpers";

/**
 * Begins a countdown to the next hour in the format: \dH \dM \dS
 *
 * When the countdown is nearly complete - moves "Current" to "Last" then deletes "Current" and "Voted" data
 */
export function startVoteCountdown(sessionData): void {
    const countdownElement = document.getElementById('Countdown');

    const interval = setInterval(() => {
        const currentTime = getCurrentEpoch();
        const timeRemaining = getNextHourEpoch() - currentTime;

        if (timeRemaining <= 2) {
            updateSessionData(sessionData);
            clearInterval(interval);
            countdownElement.textContent = 'The next vote is available!';
        } else {
            const hours = Math.floor(timeRemaining / 3600);
            const minutes = Math.floor((timeRemaining % 3600) / 60);
            const seconds = timeRemaining % 60;

            countdownElement.textContent = `Next vote available in: ${minutes}M ${hours == 0 && minutes == 0 ? seconds + ' seconds' : ''}`;
        }
    }, 1000);
}
