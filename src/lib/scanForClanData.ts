import * as sauce from '.././a1sauce';
import { submitClanData } from '../api/postClanData';

import { CapitalizedClanString, ClanVote } from '../data/types';
import {
    getCurrentEpoch,
    getNextHourEpoch,
    isRecentVote,
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
    const mostRecentVote: ClanVote = sessionData.get('Current');
    const voted: boolean = sessionData.get('Voted');
    if (mostRecentVote) {
        /**
         * If Now > EligibleVotingHour then we can delete "LastLocal" and
         * set "Current" to "LastLocal". Otherwise we can safely skip the scan.
         */
        if (getCurrentEpoch() > mostRecentVote?.timestamp) {
            updateSessionData(sessionData);
        } else if (voted || !isRecentVote(mostRecentVote?.timestamp)) {
            debugLog(
                `Skipping scan. Reason: Already voted this hour: ${mostRecentVote?.clans?.clan_1} & ${mostRecentVote?.clans?.clan_2}`,
                debugMode,
            );
            displayCurrentClanVote(sessionData);
            return;
        }
        debugLog(
            `Skipping scan. Reason: Already have valid data: ${mostRecentVote?.clans?.clan_1} & ${mostRecentVote?.clans?.clan_2}`,
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
        timestamp: getNextHourEpoch(),
        clans: {
            clan_1: firstClan,
            clan_2: secondClan,
        },
    };

    // Swap priority based on positioning
    if (firstClanPos > secondClanPos) {
        vote = {
            timestamp: getNextHourEpoch(),
            clans: {
                clan_1: secondClan,
                clan_2: firstClan,
            },
        };
    }

    // If our current vote does not match what we scanned - delete our current vote
    if (
        mostRecentVote?.clans?.clan_1 !== vote.clans.clan_1 ||
        mostRecentVote?.clans?.clan_2 !== vote.clans.clan_2
    ) {
        debugLog(
            `Invalid Data. Reason: Scanned data does not match Current Vote. Resetting vote data: ${mostRecentVote?.clans?.clan_1} & ${mostRecentVote?.clans?.clan_2}`,
            debugMode,
        );
        sessionData.delete('Current');
        sessionData.set('Voted', false);
    }

    // Update the "Found Clans!" messaging with our detected clans
    helperItems.VoteInput.innerHTML = `<p style="white-space:normal!important;">Found clans!</br>${vote.clans.clan_1} and ${vote.clans.clan_2}</p>`;
    helperItems.VoteOutput.innerHTML = '';

    // The data we have is valid - set it as our Current vote
    sessionData.set('Current', vote);

    // If we have not voted and have recent data - try and vote
    if (!voted && mostRecentVote && isRecentVote(mostRecentVote?.timestamp)) {
        await submitClanData(sessionData, debugMode);
    }
}
