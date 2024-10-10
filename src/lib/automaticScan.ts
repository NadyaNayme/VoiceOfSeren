import { DateTime } from 'luxon';
import * as sauce from '.././a1sauce';

import { submitClanData } from '../api/postClanData';
import { ClanVote } from '../data/types';
import { isPrimetimeVote, isRecentVote } from '../utility/epochs';
import { debugLog } from '../utility/helpers';
import { checkDataValidity } from './checkDataValidity';
import { scanForClanData } from './scanForClanData';

const voteTimer = new Map();

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
    let last: ClanVote = sessionData.get('LastLocal');

    // The "now" check is to allow alts to scan and vote for first few minutes of the hour
    if (!alt1.rsActive && now.minute >= 3) {
        debugLog(`Skipping scan. Reason: RuneScape is not active`, debugMode);
        return;
    }

	if (voteTimer.get('VoteThrottle')) {
		debugLog(`Skipping scan. Reason: Vote is being throttled`, debugMode);
		return;
	}

	if (voted && now.minutes <= 3 && isPrimetimeVote(current?.timestamp)) {
		debugLog(
			`Primetime vote! Already voted but is being allowed to vote again if data is still recent enough.`,
			debugMode,
		);
		sessionData.set('Voted', false);
		voteTimer.set('VoteThrottle', true);
		setTimeout(() => {
			voteTimer.set('VoteThrottle', false);
		}, 1000 * 30);
	}

    if (voted && now.minute <= 2 && checkDataValidity(sessionData, debugMode)) {
        if (current?.clans?.clan_1 === last?.clans?.clan_1) {
            debugLog(
                `Skipping scan. Current data matched data from last hour.`,
                debugMode,
            );
            sessionData.delete('Current');
            return;
        }
    } else {
        await scanForClanData(sessionData, debugMode);
        await sauce.timeout(50);
        await submitClanData(sessionData, debugMode);

        // Set voted to true here so that the below check will fail and we won't hit this branch again on the next scan
        sessionData.set('Voted', true);
    }

    // If we have not voted and have recent data - try and vote
    if (!voted && current && isRecentVote(current?.timestamp)) {
        await submitClanData(sessionData, debugMode);
    }
}
