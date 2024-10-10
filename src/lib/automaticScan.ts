import { DateTime } from 'luxon';
import * as sauce from '.././a1sauce';

import { submitClanData } from '../api/postClanData';
import { ClanVote } from '../data/types';
import { checkTimeDifference, getCurrentEpoch, getEpochDifference } from '../utility/epochs';
import { debugLog } from '../utility/helpers';
import { checkDataValidity } from './checkDataValidity';
import { scanForClanData } from './scanForClanData';

const voteTimer = new Map();
const primeTime = 2;

/**
 * Scans the screen looking for Clan data
 *
 * Skips scanning if player is not eligible to vote
 * @returns Promise<void>
 */
export async function automaticScan(sessionData, debugMode: boolean): Promise<void> {
    let now = DateTime.now();
    let voted: ClanVote = sessionData.get('Voted');
    let current: ClanVote = sessionData.get('Current');
    let lastLocal: ClanVote = sessionData.get('LastLocal');
	let lastServer: ClanVote = sessionData.get('LastServer');

    // The "now" check is to allow alts to scan and vote for first few minutes of the hour
    if (!alt1.rsActive && now.minute > primeTime) {
        debugLog(
            `Skipping scan. Reason: RuneScape is not active window outside of primetime`,
            debugMode,
        );
        return;
    }


	// Skip scanning if we are currently being throttled
	if (voteTimer.get('Throttled')) {
		debugLog(`Skipping scan. Reason: Vote is being throttled`, debugMode);
		return;
	}

	// During primetime allow a vote every 30 seconds to better seed data
	if (voted && now.minutes <= primeTime) {
        debugLog(
            `Primetime vote! Already voted but is being allowed to vote again if data is still recent enough.`,
            debugMode,
        );
        sessionData.set('Voted', false);
        voteTimer.set('Throttled', true);
        setTimeout(() => {
            voteTimer.set('Throttled', false);
        }, 1000 * 30);
    }

	/**
	 * If our data is older than 2 minutes and still matches the previous hour's data
	 * delete our current data and set it to last. This is to account for the Voice
	 * of Seren not reseting at xx:00 but typically at xx:00:30 or even later.
	 */
    if (
        voted &&
        now.minute <= primeTime &&
        (current?.clans?.clan_1 === lastLocal?.clans?.clan_1 || current?.clans?.clan_1 === lastServer?.clans?.clan_1) &&
        getEpochDifference(current?.timestamp, lastLocal?.timestamp) > 120
    ) {
        debugLog(
            `Skipping scan. Current data matches data from last hour.`,
            debugMode,
        );
        sessionData.set('LastLocal', current);
        sessionData.delete('Current');
        return;
    }

	await scanForClanData(sessionData, debugMode);
	await sauce.timeout(50);
	await submitClanData(sessionData, debugMode);

	// Set voted to true here so that the below check will fail and we won't hit this branch again on the next scan
	sessionData.set('Voted', true);

    // If we have not voted and have data gathered in the past 30 seconds - try and vote
    if (!voted && current && checkTimeDifference(current?.timestamp - 3600, getCurrentEpoch(), 30)) {
        await submitClanData(sessionData, debugMode);
    }
}
