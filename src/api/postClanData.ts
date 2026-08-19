import * as sauce from '.././a1sauce';

import { ClanVote } from '../data/types';
import { startVoteCountdown } from '../lib';
import { checkDataValidity } from '../lib/checkDataValidity';
import { scanForClanData } from '../lib/scanForClanData';
import { debugLog, helperItems, uuid } from '../utility/helpers';
import { getLastVos } from './getLastVoice';
import { fetchVos } from './getServerData';

//@ts-expect-error plausible gets loaded in index.html
window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments);};

/**
 * Submits Clan data to the server if it is valid and we have not already voted or it is early in the hour
 * @returns Promise<void>
 */
export async function submitClanData(sessionData, debugMode) {

    // Don't vote if we haven't clicked the client in the past 15 minutes - client may have crashed and submits stale data otherwise
    if (alt1.rsLastActive >= 900000) return

    // Don't vote if we are on a Leagues world
    let leaguesWorlds = [143, 146, 147, 172, 173, 174, 175, 190, 208, 209, 220, 221, 240, 241, 248, 260, 261, 262, 263, 264, 265, 266, 270, 271, 272, 273, 274, 275, 276, 277, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 292, 293, 294, 295, 296, 297, 298]
    if (leaguesWorlds.includes(alt1.currentWorld)) {
        return;
    }

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
            /**
             * If our vote failed or encountered a server error - we have not voted
             */
            if (res.status >= 400) {
                sessionData.set('Voted', false);
                return;
            }

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

            // Once we have voted our Last Local Vote is what we just submitted
            sessionData.set('LastLocal', currentVote);

            // Start a countdown timer until our next eligible voting hour
            startVoteCountdown(sessionData);

            //@ts-expect-error plausible gets loaded in index.html
            window.plausible('VoS-Vote', {
                props: {
                    clan_1: currentVote?.clans?.clan_1,
                    clan_2: currentVote?.clans?.clan_2,
                    timestamp: new Date().toUTCString(),
                    uuid: sauce.getSetting('uuid') ?? 0,
                },
            });
            console.log('Sent Analytics');
        })
        .catch((err) => {
            helperItems.VoteOutput.innerHTML = `<p>API Error: Please try again</p>`;
            debugLog(err, debugMode);
        });
}
