import { ClanVote } from "../data/types";
import { createClanDisplay, helperItems } from "../utility/helpers";

/**
 * Updates the "Current Voice of Seren" display with the user's Current Vote data
 * @returns void
 */
export function displayCurrentClanVote(sessionData) {
    const mostRecentVote: ClanVote = sessionData.get('Current');
    // If we don't have a vote
    if (!mostRecentVote) return;

    // If we're already showing the current clans using server data
    if (helperItems.Current.innerHTML.includes('asset/resource')) return;

    let clan_1 = mostRecentVote?.clans?.clan_1;
    let clan_2 = mostRecentVote?.clans?.clan_2;
    helperItems.Current.innerHTML = createClanDisplay(clan_1, clan_2);
}
