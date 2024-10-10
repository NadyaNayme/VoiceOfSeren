import { DateTime } from 'luxon';

import { ClanVote } from '../data/types';
import { debugLog } from '../utility/helpers';
import { scanForClanData } from './scanForClanData';
import { checkTimeDifference, getCurrentEpoch } from '../utility/epochs';

/**
 * Checks Current and Last voting data for validity.
 * "LastLocal" data is deleted if it is more than 2 hours old
 * "Current" data is invalid if it is missing or matches "LastLocal" data
 * "Current" data is also invalid if it is older than 4 minutes
 * @returns boolean
 */
export function checkDataValidity(sessionData, debugMode: boolean): boolean {
    let now = DateTime.now();
    let currentVote: ClanVote = sessionData.get('Current');
    let lastLocal: ClanVote = sessionData.get('LastLocal');
    let lastServer: ClanVote = sessionData.get('LastServer');

	const reasons: String[] = [];

    /**
     * Last Vote data is invalid if it is >=2 hours old
     */
    if (
        lastLocal !== undefined &&
		checkTimeDifference(lastLocal?.timestamp, getCurrentEpoch(), 1000 * 60 * 2)
    ) {
        reasons.push(
            `Invalid Data: "LastLocal" data older than 2 hours. Age: ${lastLocal?.timestamp}`,
        );
        sessionData.set('LastLocal', undefined);
        lastLocal = undefined;
    }

    /**
     * Data is invalid if we do not have any data
     */
    if (
        !currentVote?.timestamp ||
        !currentVote?.clans.clan_1 ||
        !currentVote?.clans.clan_2
    ) {
        reasons.push(`Invalid data: Missing Current data`);
        sessionData.delete('Current');
        scanForClanData(sessionData, debugMode);
    }

    /**
     *  Data is invalid if Current hour's data === Last hour's data (Local)
     **/
    if (
        lastLocal?.timestamp &&
        currentVote?.clans?.clan_1 === lastLocal?.clans?.clan_1
    ) {
        reasons.push(`Invalid Data: Current matches Last (Local)`);
        sessionData.delete('Current');
		scanForClanData(sessionData, debugMode);
    }

    /**
     * Data is invalid if we have data but it is undefined
     */
    if (currentVote?.clans?.clan_1 === undefined) {
        reasons.push(`Invalid data: Data is undefined`);
    }

    /**
     * Data is invalid if Current hour's data === Last hour's data (Server)
     */
    if (currentVote?.clans?.clan_1 === lastServer?.clans?.clan_1) {
        reasons.push(`Invalid Data: Current matches Last (Server)`);
        sessionData.delete('Current');
    }

    /**
     * Data is invalid if it is older than 5 minutes
     */
    if (checkTimeDifference(currentVote?.timestamp, getCurrentEpoch(), 60 * 5)) {
        reasons.push(
            `Invalid Data: Current is older than 5 minutes`,
        );
        sessionData.delete('Current');
    }

    /**
     * During the first minute - data is invalid for the first 30 seconds if we don't have Last (local) data
     */
    if (lastLocal?.timestamp > 0 && now.minutes === 0 && now.seconds <= 30) {
        reasons.push(`Invalid Data: Voice unlikely to have changed`);
        sessionData.delete('Current');
    }

	if (reasons.length > 0) {
		reasons.forEach((reason) => {
			debugLog(`${reason}`, debugMode);
		});
		if (debugMode) {
			console.log(sessionData);
		}
		return false;
	}

    /**
     * If all of the above checks passed - our data is valid for the current hour
     */
    debugLog(
        `Valid Data Found\nClan 1: ${currentVote?.clans?.clan_1}\nClan 2: ${currentVote?.clans?.clan_2}\nTimestamp: ${currentVote?.timestamp}`,
        debugMode,
    );
    return true;
}
