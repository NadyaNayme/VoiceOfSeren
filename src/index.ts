import * as a1lib from 'alt1';
import { DateTime } from 'luxon';
import * as sauce from './a1sauce';

import './index.html';
import './appconfig.json';
import './version.json';
import './icon.png';
import './css/styles.css';

/**
 * Utility function to type fewer characters for getElementById
 * @param id String ID for the desired element
 * @returns HTMLElement | null
 */
function getByID(id: string): HTMLElement | null {
    return document.getElementById(id);
}

/**
 * Utility function to only log if DebugMode is enabled
 * @param msg - what you want to console.log()
 * @returns void
 */
function debugLog(msg: string): void {
    if (!debugMode) return;
    console.log(msg);
}

/**
 * Utility object to hold getByID() calls in a single place
 */
const helperItems = {
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
const clanImages = a1lib.webpackImages({
    amlodd: require('./asset/data/Amlodd_Clan.data.png'),
    cadarn: require('./asset/data/Cadarn_Clan.data.png'),
    crwys: require('./asset/data/Crwys_Clan.data.png'),
    hefin: require('./asset/data/Hefin_Clan.data.png'),
    iorwerth: require('./asset/data/Iorwerth_Clan.data.png'),
    ithell: require('./asset/data/Ithell_Clan.data.png'),
    meilyr: require('./asset/data/Meilyr_Clan.data.png'),
    trahaearn: require('./asset/data/Trahaearn_Clan.data.png'),
});

/**
 * UUID is only used for Server-side statistics
 * to determine how many data Seeders/Leeches we have
 */
const uuid: string = sauce.getSetting('uuid') ?? '0';

/**
 * Whether or not Debug Mode is enabled
 */
let debugMode = sauce.getSetting('debugMode') ?? false;

/**
 * Contains the following keys:
 *
 * LastLocal | LastServer | Current | Voted
 *
 * Data is not persisted between sessions
 */
const sessionData = new Map();

/**
 * Returns the current time as Unix Time
 * @returns number
 */
function getCurrentEpoch(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * Provides the upcoming hour as Unix Time
 * @returns number
 */
function getNextHourEpoch(): number {
    const currentEpoch = getCurrentEpoch();
    const currentMinute = Math.floor(currentEpoch / 60) % 60;

    // If we're exactly at the hour mark move to the next hour
    if (currentMinute === 0) return currentEpoch + 3600;

    return (Math.floor(currentEpoch / 3600) + 1) * 3600;
}

/**
 * Returns "True" if provided Unix Time timestamp is older than 2 hours
 * @param timestamp - Unix Time to check against
 * @returns boolean
 */
function isLastVoteInvalid(timestamp: number): boolean {
    const currentEpoch = getCurrentEpoch();
    const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;
    const twoHoursAgo = currentHourMark - 7200;

    return timestamp >= twoHoursAgo;
}

/**
 * Returns "True" if provided timestamp is older than 4 minutes
 * @param timestamp - Unix Time to check against
 * @returns boolean
 */
function isRecentVote(timestamp: number): boolean {
    const currentEpoch = getCurrentEpoch();
    const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;
    const fourMinutesAgo = currentHourMark - 240;

    return timestamp >= fourMinutesAgo;
}

/**
 * Returns "true" if provided timestamp is older than 30 seconds
 * @param timestamp - Unix Time to check again
 * @returns
 */
function isPrimetimeVote(timestamp: number): boolean {
    const currentEpoch = getCurrentEpoch();
    const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;
    const thirtySecondsAgo = currentHourMark - 30;

    return timestamp >= thirtySecondsAgo;
}

/**
 * Begins a countdown to the next hour in the format: \dH \dM \dS
 *
 * When the countdown is nearly complete - moves "Current" to "Last" then deletes "Current" and "Voted" data
 */
function startVoteCountdown(): void {
    const countdownElement = document.getElementById('Countdown');

    const interval = setInterval(() => {
        const currentTime = getCurrentEpoch();
        const timeRemaining = getNextHourEpoch() - currentTime;

        if (timeRemaining <= 2) {
            updateSessionData();
            clearInterval(interval);
            countdownElement.textContent = 'The next vote is available!';
        } else {
            const hours = Math.floor(timeRemaining / 3600);
            const minutes = Math.floor((timeRemaining % 3600) / 60);
            const seconds = timeRemaining % 60;

            countdownElement.textContent = `Next vote available in: ${minutes}M ${hours == 0 && minutes == 0 ? seconds + ' seconds' : ''}`;
        }
    }, 1000);
}

function getFavoriteClans(): Set<string> {
    const settingValue = sauce.getSetting('favoriteClans');
    if (!settingValue || Object.keys(settingValue).length === 0) {
        return new Set<string>();
    }

    return new Set<string>(settingValue);
}

function updateFavoriteClans(favoriteClans: Set<string>) {
    // We need to convert the Set to an Array since Sets cannot be stringified to json.
    sauce.updateSetting('favoriteClans', Array.from(favoriteClans));
}

/**
 * Captures the game window and scans it for Clan icons
 * If the icons exist - returns the x,y coordinates of the icons
 * @returns {clan: {x,y}, clan: {x,y}}
 */
function tryFindClans(): object {
    // Capture RS Window
    let client_screen = a1lib.captureHoldFullRs();

    // Check screen for clan icons
    let clanIcons = {
        amlodd: client_screen.findSubimage(clanImages.amlodd),
        cadarn: client_screen.findSubimage(clanImages.cadarn),
        crwys: client_screen.findSubimage(clanImages.crwys),
        hefin: client_screen.findSubimage(clanImages.hefin),
        iorwerth: client_screen.findSubimage(clanImages.iorwerth),
        ithell: client_screen.findSubimage(clanImages.ithell),
        meilyr: client_screen.findSubimage(clanImages.meilyr),
        trahaearn: client_screen.findSubimage(clanImages.trahaearn),
    };

    // Get the x,y of any captured clans -- 6 of these will return as `undefined`
    let foundClans = {
        amlodd: clanIcons.amlodd[0],
        cadarn: clanIcons.cadarn[0],
        crwys: clanIcons.crwys[0],
        hefin: clanIcons.hefin[0],
        iorwerth: clanIcons.iorwerth[0],
        ithell: clanIcons.ithell[0],
        meilyr: clanIcons.meilyr[0],
        trahaearn: clanIcons.trahaearn[0],
    };

    // Filter out `undefined` leaving only two clans
    Object.keys(foundClans).forEach((key) =>
        foundClans[key] === undefined ? delete foundClans[key] : {},
    );

    // Returns the 2 captured clans as {clan: {x,y}, clan: {x, y}}
    return foundClans;
}

/**
 * Scans for Clan data if player needs to scan and is eligible to vote
 * @returns Promise<void>
 */
async function scanForClanData(): Promise<void> {
    const mostRecentVote = sessionData.get('Current');
    const voted = sessionData.get('Voted');
    if (mostRecentVote) {
        /**
         * If Now > EligibleVotingHour then we can delete "LastLocal" and
         * set "Current" to "LastLocal". Otherwise we can safely skip the scan.
         */
        if (getCurrentEpoch() > mostRecentVote?.timestamp) {
            updateSessionData();
        } else if (voted || !isRecentVote(mostRecentVote?.timestamp)) {
            debugLog(
                `Skipping scan. Reason: Already voted this hour: ${titleCase(
                    mostRecentVote?.clans?.clan_1,
                )} & ${titleCase(mostRecentVote?.clans?.clan_2)}`,
            );
            displayCurrentClanVote();
            return;
        }
		debugLog(
            `Skipping scan. Reason: Already have valid data: ${titleCase(
                mostRecentVote?.clans?.clan_1,
            )} & ${titleCase(mostRecentVote?.clans?.clan_2)}`,
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
        debugLog('Invalid Data. Reason: Outside of Prifddinas (likely)');
        await sauce.timeout(1000 * 20);
        return;
    }

    let firstClan = foundClans[0][0];
    let firstClanPos = foundClans[0][1].x;

    let secondClan = foundClans[1][0];
    let secondClanPos = foundClans[1][1].x;

    // Compare the clan positions and set priority appropriately
	let vote = {
		timestamp: 0,
		clans: {
			clan_1: '',
			clan_2: ''
		}
	};
    if (firstClanPos < secondClanPos) {
        vote = {
            timestamp: getNextHourEpoch(),
            clans: {
                clan_1: firstClan,
                clan_2: secondClan,
            },
        };
    } else {
        vote = {
            timestamp: getNextHourEpoch(),
            clans: {
                clan_1: secondClan,
                clan_2: firstClan,
            },
        };
    }

    if (!firstClan || !secondClan) {
        helperItems.VoteOutput.innerHTML =
            '<p>You must be in Prifddinas to scan for data!</p>';
        debugLog(
            `Invalid Data. Reason: user not in Prifddinas. Resetting vote data: ${titleCase(vote.clans.clan_1)} & ${titleCase(vote.clans.clan_2)}`,
        );
    } else {
        helperItems.VoteInput.innerHTML = `<p style="white-space:normal!important;">Found clans!</br>${titleCase(vote.clans.clan_1)} and ${titleCase(vote.clans.clan_2)}</p>`;
        helperItems.VoteOutput.innerHTML = '';

        sessionData.set('Current', vote);
    }

    // If we have not voted and have recent data - try and vote
    if (!voted && mostRecentVote && isRecentVote(mostRecentVote.timestamp)) {
        await submitClanData();
    }
}

const callWithRetry = async (fn, depth = 0) => {
    try {
        await sauce.timeout(1000);
        return fn();
    } catch (e) {
        if (depth > 7) {
            throw e;
        }
        debugLog(
            `Attempting to connect to API again after error... Attempt #${depth}/7`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2 ** depth * 10));

        return callWithRetry(fn, depth + 1);
    }
};

/**
 * If the 'Current' vote is still valid for a 'LastLocal' vote - set it to 'LastLocal'
 *
 * If we have a 'LastLocal' vote and our 'Current' is invalid - delete the 'LastLocal'
 * for also being invalid
 *
 * Finally - deletes 'Voted' to allow us to vote again
 */
function updateSessionData() {
    const mostRecentVote = sessionData.get('Current');
    if (mostRecentVote && !isLastVoteInvalid(mostRecentVote.timestamp)) {
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
 * Fetches VoS data from the server for both Current and Last hour
 */
function fetchVos() {
    callWithRetry(getLastVos);
    callWithRetry(getCurrentVos);
}

/**
 * Retrieves the current Voice of Seren from the server and updates the App Window
 */
async function getCurrentVos() {
    fetch('https://vos-alt1.fly.dev/vos', {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        },
    })
        .then((res) => res.text())
        .then((data) => {
            let vos = JSON.parse(data);
            let currentVote = sessionData.get('Current');
            let lastServer = sessionData.get('LastServer');
            if (vos['clan_1'] == undefined || vos['clan_2'] == undefined) {
                alt1.setTitleBarText('');
                helperItems.Current.innerHTML =
                    '<p>No data found. You can help by visiting Prifddinas and submitting data!</p>';
                return;
            }
            let clan_1: string = vos['clan_1'];
            let clan_2: string = vos['clan_2'];

            // If data is new, update the title bar and alert user of favorited hour
            if (
                clan_1 !== lastServer?.clans?.clan_1 &&
                clan_2 !== lastServer?.clans?.clan_2
            ) {
                updateTitleBar(clan_1, clan_2);
                alertFavorite(clan_1, clan_2);
            }

			// If our current voting data does not match what the server says it is
			// attempt to scan for new data - this does not affect our ability to vote
            if (clan_1 !== currentVote?.clans?.clan_1) {
                debugLog(
                    'Invalid Data: Vote does not match server data. Deleting Current vote and attempting to scan again.',
                );
                sessionData.delete('Current');
                scanForClanData();
            }

			// Update the time stamps to let the user know when data was last fetched and voting will next be available
            updateTimestamps();
        })
        .catch((err) => {
            helperItems.Current.innerHTML = `<p>API Error: Please try again in a minute</p>`;
			debugLog(err);
        });
}

async function getLastVos() {
    fetch('https://vos-alt1.fly.dev/last_vos', {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        },
    })
        .then((res) => res.text())
        .then((data) => {
            let last_vos = JSON.parse(data);
            if (
                last_vos['clan_1'] == undefined ||
                last_vos['clan_2'] == undefined
            ) {
                helperItems.Last.innerHTML =
                    '<p>Server was reset - no data for previous hour.</p>';
                return;
            }
            let clan_1 = titleCase(last_vos['clan_1']);
            let clan_2 = titleCase(last_vos['clan_2']);

			// Update the "Last Voice of Seren" section of the App Window
            helperItems.Last.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;

			// If we do not have data from the server or our data does not match - update it
			const lastServer = sessionData.get('LastServer');
			const lastServerData = {
                timestamp: getCurrentEpoch(),
                clans: {
                    clan_1: last_vos['clan_1'],
                    clan_2: last_vos['clan_2'],
                },
            };
			if (
                !lastServer && lastServer?.clans?.clan_1 !== lastServerData.clans.clan_1
            ) {
                sessionData.set('LastServer', lastServerData);
            }
        })
        .catch((err) => {
            helperItems.Last.innerHTML = `<p>API Error: Please try again in a minute</p>`;
			debugLog(err);
        });
}

/**
 * Updates the "Current Voice of Seren" display with the user's Current Vote data
 * @returns void
 */
function displayCurrentClanVote() {
	const mostRecentVote = sessionData.get('Current');
    // If we don't have a vote
    if (!mostRecentVote) return;

    // If we're already showing the current clans using server data
    if (helperItems.Current.innerHTML.includes('asset/resource')) return;

    let clan_1 = titleCase(mostRecentVote.clans.clan_1);
    let clan_2 = titleCase(mostRecentVote.clans.clan_2);
    helperItems.Current.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;
}

/**
 * Submits Clan data to the server if it is valid and we have not already voted or it is early in the hour
 * @returns Promise<void>
 */
async function submitClanData() {
    const currentVote = sessionData.get('Current');
    const voted = sessionData.get('Voted');

    // If we have already voted - skip voting
	// No debugLog because we're skipping scan for the same reason
	if (voted) return;

    // Ensure our Last data is fully up-to-date for validity checking purposes
    await getLastVos();

    // If data is invalid - do not proceed with voting and try and obtain new data
    if (!checkDataValidity()) {
        debugLog('Skipping vote. Reason: Invalid Data');
        sessionData.delete('Current');
        await scanForClanData();
        return;
    }

    // Everything has checked out - let's vote!
    fetch('https://vos-alt1.fly.dev/increase_counter', {
        method: 'POST',
        body: JSON.stringify({
            clans: [currentVote.clans.clan_1, currentVote.clans.clan_2],
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
                `Voted for ${titleCase(currentVote.clans.clan_1)} & ${titleCase(currentVote.clans.clan_2)}.`,
            );
            sessionData.set('Voted', true);

            // This is done to update our "Current Voice of Seren" display
            fetchVos();
        })
        .then((res) => {
            sessionData.set('LastLocal', currentVote);
            startVoteCountdown();
        })
        .catch((err) => {
            helperItems.VoteOutput.innerHTML = `<p>API Error: Please try again</p>`;
            debugLog(err);
        });
}

/**
 * Scans the screen looking for Clan data
 *
 * Skips scanning if player is not eligible to vote
 * @returns Promise<void>
 */
async function automaticScan(): Promise<void> {
	let now = DateTime.now();
	let voted = sessionData.get('Voted');
	let current = sessionData.get('Current');
	let last = sessionData.get('LastLocal');

	// The "now" check is to allow alts to scan and vote for first few minutes of the hour
    if (!alt1.rsActive && now.minute >= 3) {
        debugLog(`Skipping scan. Reason: RuneScape is not active`);
        return;
    }

	if (voted && now.minutes <= 3 && isPrimetimeVote(current.timestamp)) {
        debugLog(
            `Primetime vote! Already voted but is being allowed to vote again if data is still recent enough.`,
        );
		sessionData.set('Voted', false);
    }

    if (voted && now.minute <= 2 && checkDataValidity()) {
        if (
            current.clans.clan_1 === last?.clans.clan_1
        ) {
            debugLog(
                `Skipping scan. Current data matched data from last hour.`,
            );
            sessionData.delete('Current');
            return;
        }
    } else {
        await scanForClanData();
        await sauce.timeout(50);
        await submitClanData();

        // Set voted to true here so that the below check will fail and we won't hit this branch again on the next scan
        sessionData.set('Voted', true);
    }

    // If we have not voted and have recent data - try and vote
    if (
        !voted &&
        current &&
        isRecentVote(current.timestamp)
    ) {
        await submitClanData();
    }
}

function titleCase(string) {
    return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

function updateTitleBar(clan_1: string, clan_2: string) {
	clan_1 = titleCase(clan_1);
	clan_2 = titleCase(clan_2);
    helperItems.Current.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;
    setTimeout(() => {
        let title =
            'The Voice of Seren is currently at ' +
            clan_1 +
            ' and ' +
            clan_2 +
            '.';
        alt1.setTitleBarText(
            "<span title='" +
                title +
                "'><img width='80' height='80' src='./asset/resource/" +
                clan_1 +
                ".png'/><img src='./asset/resource/" +
                clan_2 +
                ".png'/></span>",
        );
    }, 300);
}

async function updateTimestamps() {

    if (sessionData.get('Current') || sessionData.get('Voted') && getByID('Countdown').textContent === '') {
        startVoteCountdown();
    }

	const lastServer = sessionData.get('LastServer');
    if (!lastServer) {
		await getLastVos();
		return;
	}
    const lastFetchEpoch = lastServer.timestamp - 1;
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
}

function showTooltip(tooltip: string = '') {
    if (tooltip == '') {
        alt1.clearTooltip();
        return;
    }

    if (!alt1.setTooltip(tooltip)) {
        debugLog('Error: No tooltip permission');
    }
}

function alertFavorite(clan_1: string, clan_2: string) {
	clan_1 = titleCase(clan_1);
	clan_2 = titleCase(clan_2);
    let alertClans = [];
    if (getFavoriteClans().has(clan_1)) {
        alertClans.push(clan_1);
    }
    if (getFavoriteClans().has(clan_2)) {
        alertClans.push(clan_2);
    }
    if (alertClans.length == 0) {
        return;
    }

    // Note: for some reason the '&' does not work for tooltips.
    showTooltip(
        `The Voice of Seren is currently active in: ${alertClans.join(' and ')}`,
    );
    setTimeout(alt1.clearTooltip, 5000);
}

/**
 * Checks Current and Last voting data for validity.
 * "LastLocal" data is deleted if it is more than 2 hours old
 * "Current" data is invalid if it is missing or matches "LastLocal" data
 * "Current" data is also invalid if it is older than 4 minutes
 * @returns boolean
 */
function checkDataValidity(): boolean {
    let currentVote = sessionData.get('Current');
    let lastLocal = sessionData.get('LastLocal');
    let lastServer = sessionData.get('LastServer');

    /**
     * Last Vote data is invalid if it is >=2 hours old
     */
    if (lastLocal && isLastVoteInvalid(lastLocal.timestamp)) {
        debugLog(`Invalid Data: "LastLocal" data older than 2 hours`);
        sessionData.delete('LastLocal');
        lastLocal = undefined;
    }

    /**
     * Data is invalid if we do not have any data
     */
    if (!currentVote) {
        debugLog(`Invalid data: Missing Current data`);
        return false;
    }

    /**
     *  Data is invalid if Current hour's data === Last hour's data (Local)
     **/
    if (lastLocal && currentVote.clan_1 === lastLocal.clans.clan_1) {
        debugLog(`Invalid Data: Current matches Last (Local)`);
        sessionData.delete('Current');
        return false;
    }

    /**
     * Data is invalid if we have data but it is undefined
     */
    if (currentVote.clans.clan_1 === undefined) {
        debugLog(`Invalid data: Data is undefined`);
        return false;
    }

    /**
     * Data is invalid if Current hour's data === Last hour's data (Server)
     */
    if (currentVote.clans.clan_1 === lastServer?.clans?.clan_1) {
        debugLog(`Invalid Data: Current matches Last (Server)`);
        sessionData.delete('Current');
        return false;
    }

    /**
     * Data is invalid if it is older than 4 minutes
     */
    if (!isRecentVote(currentVote.timestamp)) {
        debugLog(`Invalid Data: Current is older than 4 minutes`);
        sessionData.delete('Current');
        return false;
    }

    /**
     * If all of the above checks passed - our data is valid for the current hour
     */
    debugLog(
        `Valid Data Found\nClan 1: ${titleCase(currentVote.clans.clan_1)}\nClan 2: ${titleCase(currentVote.clans.clan_2)}\nTimestamp: ${currentVote.timestamp}`,
    );
    return true;
}

let recentlyFetched = false;

/**
 *
 * @returns void
 */
function fetchHourly(): void {
    let date = DateTime.now();

    // Do not fetch if we have recently fetched
    if (recentlyFetched) return;

    // Otherwise try and fetch frequently
    if (
        date.minute == 2 ||
        date.minute == 3 ||
        date.minute == 4 ||
        (date.minute % 5 == 0 && date.minute <= 30)
    ) {
        recentlyFetched = true;

        // Give everyone a partially randomized delay to prevent smashing the server
        let delay = Math.random() * 5000;
        setTimeout(() => {
            fetchVos();
        }, delay);

        // A short time after our delay we're elligible to attempt to fetch again
        setTimeout(() => {
            recentlyFetched = false;
        }, delay * 5);
    }
}

/**
 * Check that the version hard coded in checkVersion matches the version.json
 * @param version: string - the current version
 */
function checkVersion(version: string) {
    fetch('./version.json', {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        },
    })
        .then((res) => {
            let latestVersion = res.json();
            return latestVersion;
        })
        .then((latestVersion) => {
            if (version != latestVersion.version) {
                helperItems.Output.innerHTML = `<p>App is out of date. Expected version: ${latestVersion.version} ; found: ${version} - reloading in 3 seconds to update...</p>`;
                setTimeout(() => {}, 3000);
                location.reload();
            } else {
                debugLog(
                    `App is running latest version. Expected version: ${latestVersion.version} ; found: ${version}`,
                );
            }
        });
}

function initSettings() {
    if (!localStorage.VoiceOfSeren) {
        localStorage.setItem(
            'VoiceOfSeren',
            JSON.stringify({
                votedCount: 0,
                uiScale: '100',
                favoriteClans: new Set<string>(),
            }),
        );
    }
    getByID('app').style.transform = `scale(${sauce.getSetting('uiScale')})`;
    getByID('debugMode').addEventListener('click', (e) => {
        let el = <HTMLInputElement>getByID('debugMode');
        debugMode = el.checked;
    });
}

const settingsObject = {
    settingsHeader: sauce.createHeading('h2', 'Settings'),
    uiScale: sauce.createRangeSetting('uiScale', 'Resize VoS app', {
        defaultValue: sauce.getSetting('uiScale') ?? '100',
        min: 30,
        max: 200,
        unit: '%',
    }),
    favoriteHeader: sauce.createHeading('h3', 'Alert for clans:'),
    favoriteClans: sauce.createGroup([
        createClanCheckbox('Amlodd'),
        createClanCheckbox('Cadarn'),
        createClanCheckbox('Crwys'),
        createClanCheckbox('Hefin'),
        createClanCheckbox('Iorwerth'),
        createClanCheckbox('Ithell'),
        createClanCheckbox('Meilyr'),
        createClanCheckbox('Trahaearn'),
    ]),
    sep: sauce.createSeperator(),
    debugLogging: sauce.createCheckboxSetting(
        'debugMode',
        'Enable Console Debug Logging',
        false,
    ),
};

function createClanCheckbox(clanName: string): HTMLElement {
    // Checkbox automatically updates the default value based on localStorage.
    let clanCheckbox = sauce.createCheckboxSetting(
        `favorite${clanName}`,
        clanName,
        false,
    );

    clanCheckbox.addEventListener('change', (e) => {
        const isFavorite = clanCheckbox.querySelector('input').checked;
        let newFavoriteClans: Set<string> = getFavoriteClans();
        if (isFavorite) {
            newFavoriteClans.add(clanName);
        } else {
            newFavoriteClans.delete(clanName);
        }

        updateFavoriteClans(newFavoriteClans);
    });

    return clanCheckbox;
}

settingsObject.uiScale.addEventListener('change', (e) => {
    sauce.updateSetting(
        'uiScale',
        settingsObject.uiScale.querySelector('input').value,
    );
    getByID('app').style.transform = `scale(${
        parseInt(settingsObject.uiScale.querySelector('input').value, 10) / 100
    })`;
});

/**
 * Starts the main app functionality: scanning for clan data and voting
 * @returns void
 */
export function startvos(): void {
    if (!window.alt1) {
        helperItems.Output.insertAdjacentHTML(
            'beforeend',
            `<div>You need to run this page in alt1 to capture the screen</div>`,
        );
        return;
    }
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

	/**
	 * randomUUID() does not exist for 1.5.6 so this only runs for 1.6.0
	 * users on 1.5.6 will collectively have a UUID of "0"
	 */
    if (
        a1lib.hasAlt1Version('1.6.0') &&
        sauce.getSetting('uuid') == undefined
    ) {
        sauce.updateSetting('uuid', crypto.randomUUID());
    }

    fetchVos();
    setInterval(fetchHourly, 15000);
    setInterval(automaticScan, 3000);
	setInterval(updateTimestamps, 60000);

	/**
	 * Update the Scale of everything in the app based on the user's settings
	 */
    if (sauce.getSetting('uiScale')) {
        getByID('app').style.transform = `scale(${
            parseInt(settingsObject.uiScale.querySelector('input').value, 10) /
            100
        })`;
    }
}

window.onload = function () {
    if (window.alt1) {

        // check version on startup then check again every 12 hours
		const version = '2.0.0';
        checkVersion(version);
        setInterval(
            () => {
                checkVersion(version);
            },
            1000 * 60 * 60 * 12,
        );

        alt1.identifyAppUrl('./appconfig.json');

		/**
		 * Create the settings and initialize any event listeners
		 */
        Object.values(settingsObject).forEach((val) => {
            helperItems.settings.before(val);
        });
        initSettings();

		/**
		 * Finally - start the application
		 */
        startvos();

		/**
		 * For fun statistics so a person can see how many times they have voted
		 */
        if (!sauce.getSetting('votedCount')) {
            sauce.updateSetting('votedCount', 0);
        }
    } else {
        let addappurl = `alt1://addapp/${
            new URL('./appconfig.json', document.location.href).href
        }`;
        helperItems.Output.insertAdjacentHTML(
            'beforeend',
            `
			Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
		`,
        );
    }
};
