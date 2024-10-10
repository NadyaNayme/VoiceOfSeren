import { DateTime } from 'luxon';
import { fetchVos } from '../api/getServerData';

let recentlyFetched = false;

/**
 *
 * @returns void
 */
export function fetchHourly(sessionData, debugMode: boolean): void {
    let date = DateTime.now();

    // Do not fetch if we have recently fetched
    if (recentlyFetched) return;

    // Otherwise try and fetch frequently
    if (
        date.minute == 2 ||
        date.minute == 3 ||
        date.minute == 4 ||
        (date.minute % 5 == 0 && date.minute <= 30)
    ) {
        recentlyFetched = true;

        // Give everyone a partially randomized delay to prevent smashing the server
        let delay = Math.random() * 5000;
        setTimeout(() => {
            fetchVos(sessionData, debugMode);
        }, delay);

        // A short time after our delay we're elligible to attempt to fetch again
        setTimeout(() => {
            recentlyFetched = false;
        }, delay * 5);
    }
}
