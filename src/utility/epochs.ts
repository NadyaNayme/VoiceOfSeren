/**
 * Returns the current time as Unix Time
 * @returns number
 */
export function getCurrentEpoch(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * Returns the difference between two epochs
 * @returns number
 */
export function getEpochDifference(one: number, two: number) {
	if (one >= two) {
		return one - two;
	} else {
		return two - one;
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
 * Returns "True" if provided Unix Time timestamp is older than 2 hours
 * @param timestamp - Unix Time to check against
 * @returns boolean
 */
export function isLastVoteInvalid(timestamp: number): boolean {
	if (timestamp === 0) return false;
    const currentEpoch = getCurrentEpoch();
    const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;
    const twoHoursAgo = currentHourMark - 7200;

    return timestamp >= twoHoursAgo;
}

/**
 * Returns "True" if provided timestamp is older than 4 minutes
 * @param timestamp - Unix Time to check against
 * @returns boolean
 */
export function isRecentVote(timestamp: number): boolean {
	if (timestamp === 0) return false;
    const currentEpoch = getCurrentEpoch();
    const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;
    const fourMinutesAgo = currentHourMark - 240;

    return timestamp >= fourMinutesAgo;
}

/**
 * Returns "true" if provided timestamp is older than 30 seconds
 * @param timestamp - Unix Time to check again
 * @returns boolean
 */
export function isPrimetimeVote(timestamp: number): boolean {
	if (timestamp === 0) return false;
    const currentEpoch = getCurrentEpoch();
    const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;
    const thirtySecondsAgo = currentHourMark - 30;

    return timestamp >= thirtySecondsAgo;
}
