import * as sauce from '.././a1sauce';

import { ClanVote } from '../data/types';
import { startVoteCountdown } from '../lib';
import { checkDataValidity } from '../lib/checkDataValidity';
import { scanForClanData } from '../lib/scanForClanData';
import { debugLog, helperItems, uuid } from '../utility/helpers';
import { getLastVos } from './getLastVoice';
import { fetchVos } from './getServerData';

/**
 * Submits Clan data to the server if it is valid and we have not already voted or it is early in the hour
 * @returns Promise<void>
 */
export async function submitClanData(sessionData, debugMode) {
    const currentVote: ClanVote = sessionData.get('Current');
    const voted: Boolean = sessionData.get('Voted');

    // If we have already voted - skip voting
    // No debugLog because we're skipping scan for the same reason
    if (voted) return;

    // Ensure our Last data is fully up-to-date for validity checking purposes
    await getLastVos(sessionData, debugMode);

    // If data is invalid - do not proceed with voting and try and obtain new data
    if (!checkDataValidity(sessionData, debugMode)) {
        debugLog('Skipping vote. Reason: Invalid Data', debugMode);
        sessionData.delete('Current');
        await scanForClanData(sessionData, debugMode);
        return;
    }

    // Everything has checked out - let's vote!
    fetch('https://vos-alt1.fly.dev/increase_counter', {
        method: 'POST',
        body: JSON.stringify({
            clans: [
                currentVote?.clans?.clan_1.toLowerCase(),
                currentVote?.clans?.clan_2.toLowerCase(),
            ],
            uuid: uuid,
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        },
    })
        .then((res) => {
            sauce.updateSetting(
                'votedCount',
                sauce.getSetting('votedCount') + 1,
            );
            debugLog(
                `Voted for ${currentVote?.clans?.clan_1} & ${currentVote?.clans?.clan_2}.`,
                debugMode,
            );
            sessionData.set('Voted', true);

            // This is done to update our "Current Voice of Seren" display
            fetchVos(sessionData, debugMode);
        })
        .then((res) => {
            sessionData.set('LastLocal', currentVote);
            startVoteCountdown(sessionData);
        })
        .catch((err) => {
            helperItems.VoteOutput.innerHTML = `<p>API Error: Please try again</p>`;
            debugLog(err, debugMode);
        });
}
