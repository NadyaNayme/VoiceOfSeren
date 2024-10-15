import { DateTime } from 'luxon';

import { ClanVote } from '../data/types';
import { debugLog } from '../utility/helpers';
import { scanForClanData } from './scanForClanData';
import { checkTimeDifference, getCurrentEpoch } from '../utility/epochs';

const dailyVotes: ClanVote[] = [];

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
        checkTimeDifference(
            lastLocal?.timestamp,
            getCurrentEpoch(),
            1000 * 60 * 2,
        )
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
    if (
        checkTimeDifference(currentVote?.timestamp, getCurrentEpoch(), 60 * 5)
    ) {
        reasons.push(`Invalid Data: Current is older than 5 minutes`);
        sessionData.delete('Current');
    }

    /**
     * During the first minute - data is invalid for the first 30 seconds if we don't have Last (local) data
     */
    if (lastLocal?.timestamp > 0 && now.minute === 0 && now.second <= 30) {
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

    return appendClanVote(dailyVotes, currentVote, debugMode);
}

function appendClanVote(
    dailyVotes: ClanVote[],
    currentVote: ClanVote,
    debugMode: boolean,
) {
    const currentHour = Math.floor(currentVote.timestamp / 3600);

    // Check if our incoming vote is for the same hour (primetime vote) or for a different hour
    if (dailyVotes.length > 0) {
        const lastVote = dailyVotes[dailyVotes.length - 1];
        const lastHour = Math.floor(lastVote.timestamp / 3600);

        const lastClan_1 = dailyVotes[dailyVotes.length - 1].clans.clan_1;
        const lastClan_2 = dailyVotes[dailyVotes.length - 1].clans.clan_2;

        // We won't append the data to dailyVotes - but it is still valid data for primetime voting
        if (
            lastHour === currentHour &&
            lastClan_1 === currentVote.clans.clan_1 &&
            lastClan_2 === currentVote.clans.clan_2
        ) {
            return true;
        }
    }

    // Check for the last two votes to see if they both match the current vote
    const recentVotes = dailyVotes.slice(-2);
    const matches = recentVotes.filter((vote: ClanVote) => {
        return (
            vote.clans.clan_1 === currentVote.clans.clan_1 &&
            vote.clans.clan_2 === currentVote.clans.clan_2
        );
    });

    if (matches.length >= 2) {
        debugLog(
            `Invalid Data Found. Stale Vote (vote matches votes from previous 3 hours)`,
            debugMode,
        );
        return false;
    }

    dailyVotes.push(currentVote);
    console.log('Daily Votes:')
    console.log(dailyVotes);
    return true;
}
