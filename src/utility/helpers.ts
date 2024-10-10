import * as a1lib from 'alt1';
import * as sauce from '.././a1sauce';
import { CapitalizedClanString, ClanVote } from '../data/types';
import { getCurrentEpoch, isLastVoteInvalid } from './epochs';
import { startVoteCountdown } from '../lib';
import { getLastVos } from '../api/getLastVoice';
import { fetchVos } from '../api/getServerData';

/**
 * UUID is only used for Server-side statistics
 * to determine how many data Seeders/Leeches we have
 */
export const uuid: string = sauce.getSetting('uuid') ?? '0';

/**
 * Utility function to type fewer characters for getElementById
 * @param id String ID for the desired element
 * @returns HTMLElement | null
 */
export function getByID(id: string): HTMLElement | null {
    return document.getElementById(id);
}

/**
 * Utility function to capitalize the first letter of a string
 * @param string - The string that should be capitalized
 * @returns string - The same string with the first letter capitalized
 */
export function titleCase(string: string) {
    return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Utility function to only log if DebugMode is enabled
 * @param msg - what you want to console.log()
 * @returns void
 */
export function debugLog(msg: string, debugMode: boolean): void {
    if (!debugMode) return;
    console.log(msg);
}

/**
 * Utility object to hold getByID() calls in a single place
 */
export const helperItems = {
    Output: getByID('output'),
    Current: getByID('current'),
    Button: getByID('button'),
    Last: getByID('last'),
    VoteOutput: getByID('vote_output'),
    VoteInput: getByID('vote_input'),
    Vote: getByID('send_vote'),
    settings: getByID('Settings'),
    Timestamp: getByID('Timestamp'),
};

/**
 * Promise containing image data for each of the Elf Clans
 */
export const clanImages = a1lib.webpackImages({
    amlodd: require('.././asset/data/Amlodd_Clan.data.png'),
    cadarn: require('.././asset/data/Cadarn_Clan.data.png'),
    crwys: require('.././asset/data/Crwys_Clan.data.png'),
    hefin: require('.././asset/data/Hefin_Clan.data.png'),
    iorwerth: require('.././asset/data/Iorwerth_Clan.data.png'),
    ithell: require('.././asset/data/Ithell_Clan.data.png'),
    meilyr: require('.././asset/data/Meilyr_Clan.data.png'),
    trahaearn: require('.././asset/data/Trahaearn_Clan.data.png'),
});

/**
 * Retry with incremental backoff - throwing an error after `depth` attempts
 * @param fn - Function to attempt and retry with
 * @param depth - Default 0 and recursively calls itself while incrementing depth until depth > 7
 * @returns `fn`
 */
export const callWithRetry = async (fn, depth = 0) => {
    try {
        await sauce.timeout(1000);
        return fn();
    } catch (e) {
        if (depth > 7) {
            throw e;
        }
        debugLog(
            `Attempting to connect to API again after error... Attempt #${depth}/7`,
            true,
        );
        await new Promise((resolve) => setTimeout(resolve, 2 ** depth * 10));

        return callWithRetry(fn, depth + 1);
    }
};

/**
 * Creates the Current/Last Voice of Seren Clan Display element and returns it as a string
 * @param clan_1 - First Voice of Seren Clan
 * @param clan_2 - Second Voice of Seren Clan
 * @returns string
 */
export function createClanDisplay(
    clan_1: CapitalizedClanString,
    clan_2: CapitalizedClanString,
) {
    return `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;
}

/**
 * Creates the Alt1 TitleBar Element and returns it as a string
 * @param clan_1 - First Voice of Seren Clan
 * @param clan_2 - Second Voice of Seren Clan
 * @returns string
 */
export function createClanTitleBar(
    clan_1: CapitalizedClanString,
    clan_2: CapitalizedClanString,
) {
    let title = `The Voice of Seren is currently at ${clan_1} and ${clan_2}.`;
    return `<span title='${title}'><img width='80' height='80' src='./asset/resource/${clan_1}.png'/><img src='./asset/resource/${clan_2}.png'/></span>`;
}

/**
 * Updates the Title Bar when the Voice of Seren changes
 * @param clan_1 - First Voice of Seren Clan
 * @param clan_2 - Second Voice of Seren Clan
 */
export function updateTitleBar(
    clan_1: CapitalizedClanString,
    clan_2: CapitalizedClanString,
) {
    helperItems.Current.innerHTML = createClanDisplay(clan_1, clan_2);
    setTimeout(() => {
        alt1.setTitleBarText(createClanTitleBar(clan_1, clan_2));
    }, 300);
}

/**
 * If the 'Current' vote is still valid for a 'LastLocal' vote - set it to 'LastLocal'
 *
 * If we have a 'LastLocal' vote and our 'Current' is invalid - delete the 'LastLocal'
 * for also being invalid
 *
 * Finally - deletes 'Voted' to allow us to vote again
 */
export function updateSessionData(sessionData) {
    const mostRecentVote: ClanVote = sessionData.get('Current');
    if (mostRecentVote && !isLastVoteInvalid(mostRecentVote?.timestamp)) {
        sessionData.set('LastLocal', mostRecentVote);
    } else {
        sessionData.delete('LastLocal');
    }

    // Either we moved it to 'LastLocal' or it is invalid. Either way it should be deleted
    sessionData.delete('Current');

    /* We are also eligible to vote again */
    sessionData.set('Voted', false);
}

/**
 * Updates the "Last Server Check" and "Next Vote Available" countdowns
 * @param sessionData Map containing all session data for the app
 * @param debugMode Whether the app is in Debug Mode or not
 * @returns  void
 */
export async function updateTimestamps(sessionData, debugMode: boolean) {
    if (
        sessionData.get('Current') ||
        (sessionData.get('Voted') && getByID('Countdown').textContent === '')
    ) {
        startVoteCountdown(sessionData);
    }

    const lastServer: ClanVote = sessionData.get('LastServer');
    if (!lastServer) {
        await getLastVos(sessionData, debugMode);
        return;
    }
    const lastFetchEpoch = lastServer?.timestamp - 1;
    const now = getCurrentEpoch();

    const diffInSeconds = now - lastFetchEpoch;

    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);

    let timeAgo = '';
    if (hours > 0) {
        timeAgo += `${hours}H `;
    }
    if (minutes > 0 || hours > 0) {
        timeAgo += `${minutes}M `;
    } else {
        timeAgo += '<1m ';
    }
    timeAgo += 'ago';

    helperItems.Timestamp.innerHTML = `Last Server Check: ${timeAgo}`;

	// Fetch from server again if data is >1h 1m old
	if (hours > 1 && minutes > 1) {
		fetchVos(sessionData, debugMode);
	}

}

/**
 * Checks if the Alt1 permissions for the app have been enabled and if not gives the user a warning that they are not enabled
 * @returns void
 */
export function permissionChecks() {
	if (!alt1.permissionPixel) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`,
		);
		return;
	}
	if (!alt1.permissionOverlay) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`,
		);
		return;
	}
}
