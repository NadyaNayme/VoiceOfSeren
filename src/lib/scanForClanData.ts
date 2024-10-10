import * as sauce from '.././a1sauce';
import { submitClanData } from '../api/postClanData';

import { CapitalizedClanString, ClanVote } from '../data/types';
import {
	checkTimeDifference,
    getCurrentEpoch,
    getNextHourEpoch
} from '../utility/epochs';
import {
    debugLog,
    helperItems,
    titleCase,
    updateSessionData,
} from '../utility/helpers';
import { displayCurrentClanVote } from './displayClanVote';
import { tryFindClans } from './tryFindClans';

/**
 * Scans for Clan data if player needs to scan and is eligible to vote
 * @returns Promise<void>
 */
export async function scanForClanData(
    sessionData,
    debugMode: boolean,
): Promise<void> {
	const nextEligibleVote: number = sessionData.get('NextEligible');
	const throttled: boolean = sessionData.get('Throttled');
    const current: ClanVote = sessionData.get('Current');
    const voted: boolean = sessionData.get('Voted');
    if (current && !throttled) {
        /**
         * If Now > NextEligibleVotingHour then set "Current" to "LastLocal"
         */
        if (getCurrentEpoch() > nextEligibleVote) {
            updateSessionData(sessionData);
        }

        // If we have voted - we should skip scanning
        if (voted) {
            debugLog(
                `Skipping scan. Reason: Already voted this hour: ${current?.clans?.clan_1} & ${current?.clans?.clan_2}`,
                debugMode,
            );
            displayCurrentClanVote(sessionData);
            return;
        }

        debugLog(
            `Skipping scan. Reason: Already have valid data: ${current?.clans?.clan_1} & ${current?.clans?.clan_2}`,
            debugMode,
        );
        return;
    }

    // Turn the {clan_1: {x,y}, clan_2: {x,y}} into an array
    let foundClans = Object.entries(tryFindClans());

    // If we captured 0 instead of 2 clans we are not in Prif so return early after a 20s delay
    // If we only found 1 clan it is possible the other clan was obscured. Disallow votes due to potentially bad data
    if (
        Object.keys(foundClans).length == 0 ||
        Object.keys(foundClans).length == 1
    ) {
        // If our data is bad - we should clear our vote.
        // Most likely this is because we are outside of Prifddinas
        sessionData.delete('Current');
        debugLog(
            'Invalid Data. Reason: Outside of Prifddinas (likely)',
            debugMode,
        );
        await sauce.timeout(1000 * 20);
        return;
    }

    let firstClan = <CapitalizedClanString>titleCase(foundClans[0][0]);
    let firstClanPos: number = foundClans[0][1].x;

    let secondClan = <CapitalizedClanString>titleCase(foundClans[1][0]);
    let secondClanPos: number = foundClans[1][1].x;

    // Compare the clan positions and set priority appropriately
    let vote: ClanVote = {
        timestamp: getCurrentEpoch(),
        clans: {
            clan_1: firstClan,
            clan_2: secondClan,
        },
    };

    // Swap priority based on positioning
    if (firstClanPos > secondClanPos) {
        vote = {
            timestamp: getCurrentEpoch(),
            clans: {
                clan_1: secondClan,
                clan_2: firstClan,
            },
        };
    }

    // Update the "Found Clans!" messaging with our detected clans
    helperItems.VoteInput.innerHTML = `<p style="white-space:normal!important;">Found clans!</br>${vote.clans.clan_1} and ${vote.clans.clan_2}</p>`;
    helperItems.VoteOutput.innerHTML = '';

    // The data we have is valid - set it as our Current vote
    sessionData.set('Current', vote);
	sessionData.set('NextEligible', getNextHourEpoch());

    // If we have not voted and have recent data (<30s old) - try and vote
    if (
        !voted &&
        current &&
        !checkTimeDifference(current?.timestamp, getCurrentEpoch(), 30)
    ) {
        await submitClanData(sessionData, debugMode);
    }
}
