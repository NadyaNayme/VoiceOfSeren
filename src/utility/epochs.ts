/**
 * Returns the current time as Unix Time rounded to nearest second
 * @returns number
 */
export function getCurrentEpoch(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * Returns the difference between two epochs
 * @returns number
 */
export function getEpochDifference(epoch_1: number, epoch_2: number) {
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
export function getNextHourEpoch(): number {
    const currentEpoch = getCurrentEpoch();
    const currentMinute = Math.floor(currentEpoch / 60) % 60;

    // If we're exactly at the hour mark move to the next hour
    if (currentMinute === 0) return currentEpoch + 3600;

    return (Math.floor(currentEpoch / 3600) + 1) * 3600;
}

/**
 * Compares the difference between two epoch timestamps and returns
 * "true" if the difference exceeds the provided threshold.
 *
 * The order of epoch parameters is irrelevant
 * @param epoch_1 - An Unix Time timestamp
 * @param epoch_2 - An Unix Time timestamp
 * @param expectedTimeDifference - The expected difference between the two times
 * @return If the expected difference is larger than the measured difference
 */
export function checkTimeDifference(epoch_1: number, epoch_2: number, expectedTimeDifference: number) {
	let difference = getEpochDifference(epoch_1, epoch_2)
	return difference >= expectedTimeDifference
}
