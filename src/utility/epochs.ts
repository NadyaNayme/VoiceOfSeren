import { UnixEpoch, Second } from '../data/types';

/**
 * Returns the current time as Unix Time (rounded to nearest second instead of millisecond)
 * @returns UnixEpoch
 */
export function getCurrentEpoch(): UnixEpoch {
    return Math.floor(Date.now() / 1000);
}

/**
 * Returns the difference as seconds between two epochs
 * @returns number
 */
export function getEpochDifference(epoch_1: UnixEpoch, epoch_2: UnixEpoch): Second {
    if (epoch_1 >= epoch_2) {
        return epoch_1 - epoch_2;
    } else {
        return epoch_2 - epoch_1;
    }
}

/**
 * Provides the upcoming hour as Unix Time
 * @returns number
 */
export function getNextHourEpoch(): UnixEpoch {
    const currentEpoch = getCurrentEpoch();
    const currentMinute = Math.floor(currentEpoch / 60) % 60;

    // If we're exactly at the hour mark move to the next hour
    if (currentMinute === 0) return currentEpoch + 3600;

    return (Math.floor(currentEpoch / 3600) + 1) * 3600;
}

/**
 * Compares the difference between two epoch timestamps and returns
 * "true" if the difference in seconds is >= threshold.
 *
 * The order of epoch parameters is irrelevant
 * @param epoch_1 - An Unix Time timestamp
 * @param epoch_2 - An Unix Time timestamp
 * @param expectedTimeDifference - The expected difference between the two times
 * @return True if expected time difference is larger than actual difference
 */
export function checkTimeDifference(
    epoch_1: UnixEpoch,
    epoch_2: UnixEpoch,
    expectedTimeDifference: number,
): boolean {
    let difference = getEpochDifference(epoch_1, epoch_2);
    return difference >= expectedTimeDifference;
}
