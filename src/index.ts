// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import { DateTime } from 'luxon';
import * as sauce from './a1sauce';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './version.json';
import './icon.png';
import './css/styles.css';

function getByID(id: string) {
	return document.getElementById(id);
}

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

const uuid: string = sauce.getSetting('uuid') ?? '0';
let debugMode = sauce.getSetting('debugMode') ?? false;
let clanVote = [];
let lastClanVote = [];
let lastVos = [];

// Contains three keys: "Last", "Current", and "Voted"
// Is not persisted between runs
// Prevents voting if "Voted" or "Current" exist
// Moves "Current" to "Last" and deletes "Current" at the start of each hour when running
const voteHistory = new Map();

function getCurrentEpoch() {
	return Math.floor(Date.now() / 1000);
}

function getNextHourEpoch() {
	const currentEpoch = getCurrentEpoch();
	const currentMinute = Math.floor(currentEpoch / 60) % 60;

	// If we're exactly at the hour mark move to the next hour
	if (currentMinute === 0) return currentEpoch + 3600;

	return (Math.floor(currentEpoch / 3600) + 1) * 3600;
}

function isLastVoteInvalid(lastVoteTimestamp) {
	const currentEpoch = getCurrentEpoch();

	// Get the most recent hour mark of the current epoch
	const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;

	// Calculate the timestamp for 2 hours ago from the most recent hour mark
	const twoHoursAgo = currentHourMark - 7200;

	// 'Last' votes older than 2 hours ago are invalid
	return lastVoteTimestamp >= twoHoursAgo;
}

function isRecentVote(votedTimestamp) {
	const currentEpoch = getCurrentEpoch();

	// Get the most recent hour mark of the current epoch
	const currentHourMark = Math.floor(currentEpoch / 3600) * 3600;

	// Calculate the timestamp for 4 minutes ago from the most recent hour mark
	const fourMinutesAgo = currentHourMark - 240;

	// 'Current' votes older than 4 minutes ago are recent
	return votedTimestamp >= fourMinutesAgo;
}

function startVoteCountdown() {
	const countdownElement = document.getElementById('Countdown');

	const interval = setInterval(() => {
		const currentTime = getCurrentEpoch();
		const timeRemaining = getNextHourEpoch() - currentTime;

		if (timeRemaining <= 2) {
			updateVoteHistory();
			clanVote = [];
			clearInterval(interval);
			countdownElement.textContent = 'The next vote is available!';
		} else {
			const hours = Math.floor(timeRemaining / 3600);
			const minutes = Math.floor((timeRemaining % 3600) / 60);
			const seconds = timeRemaining % 60;

			countdownElement.textContent = `Next vote available at: ${hours}h ${minutes}m ${seconds}s`;
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

function tryFindClans() {
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
		foundClans[key] === undefined ? delete foundClans[key] : {}
	);

	// Returns the 2 captured clans as {clan: {x,y}, clan: {x, y}}
	return foundClans;
}

async function scanForClanData() {
	const mostRecentVote = voteHistory.get('Current');
	const voted = voteHistory.get('Voted');
	if (mostRecentVote) {
		// Check if "Now" is past the timestamp for our next voting hour
		const nextVotingHour = mostRecentVote.timestamp;

		/**
		 * If Now > EligibleVotingHour then we can delete "Last" and
		 * set "Current" to "Last". Otherwise we can safely skip the scan.
		 */
		if (getCurrentEpoch() > nextVotingHour) {
			updateVoteHistory();
		} else if (voted || !isRecentVote(mostRecentVote.timestamp)) {
			if (debugMode) {
				console.log(
					`Skipping scan. Reason: Already voted this hour: ${titleCase(
						mostRecentVote.clans.clan_1
					)} & ${titleCase(mostRecentVote.clans.clan_2)}`
				);
			}
			displayCurrentClanVote(mostRecentVote);
			return;
		}

		if (mostRecentVote.clans.clan_1 === clanVote[0] || mostRecentVote.clans.clan_2 === clanVote[1]) {
			if (debugMode) {
				console.log(`Skipping scan. Reason: Already have valid data: ${titleCase(
						mostRecentVote.clans.clan_1
					)} & ${titleCase(mostRecentVote.clans.clan_2)}`)
			}
			return;
		}
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
		clanVote = [];
		if (debugMode)
			console.log('Invalid Data. Reason: Outside of Prifddinas (likely)');
		await sauce.timeout(1000 * 20);
		return;
	}

	let firstClan = foundClans[0][0];
	let firstClanPos = foundClans[0][1].x;

	let secondClan = foundClans[1][0];
	let secondClanPos = foundClans[1][1].x;

	// Compare the clan positions and set priority appropriately
	if (firstClanPos < secondClanPos) {
		clanVote[0] = firstClan;
		clanVote[1] = secondClan;
	} else {
		clanVote[1] = firstClan;
		clanVote[0] = secondClan;
	}

	if (!clanVote[0] || !clanVote[1]) {
		helperItems.VoteOutput.innerHTML =
			'<p>You must be in Prifddinas to scan for data!</p>';
		if (debugMode)
			console.log(
				`Invalid Data. Reason: user not in Prifddinas. Resetting vote data: ${clanVote[0]} & ${clanVote[1]}`
			);
	} else {
		helperItems.VoteInput.innerHTML = `<p style="white-space:normal!important;">Found clans!</br>${clanVote[0]} and ${clanVote[1]}</p>`;
		helperItems.VoteOutput.innerHTML = '';
		const vote = {
			timestamp: getNextHourEpoch(),
			clans: {
				clan_1: clanVote[0],
				clan_2: clanVote[1],
			},
		};

		voteHistory.set('Current', vote);
		if (debugMode) console.log(voteHistory);
	}

	// If we have not voted and have recent data - try and vote
	if (
		!voted &&
		mostRecentVote &&
		isRecentVote(mostRecentVote.timestamp)
	) {
		submitClanData();
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
		if (debugMode)
			console.log(
				`Attempting to connect to API again after error... Attempt #${depth}/7`
			);
		await new Promise((resolve) => setTimeout(resolve, 2 ** depth * 10));

		return callWithRetry(fn, depth + 1);
	}
};

/*
 * If the 'Current' vote is still valid for a 'Last' vote - set it to 'Last'
 * and if we have a 'Last' vote and our 'Current' is invalid - delete the 'Last'
 * for also being invalid
 * */
function updateVoteHistory() {
	const mostRecentVote = voteHistory.get('Current');
	if (mostRecentVote && !isLastVoteInvalid(mostRecentVote.timestamp)) {
		voteHistory.set('Last', mostRecentVote);
	} else {
		voteHistory.delete('Last');
	}

	// Either we moved it to 'Last' or it is invalid. Either way it should be deleted
	voteHistory.delete('Current');

	/* We are also eligible to vote again */
	voteHistory.set('Voted', false);
}

function fetchVos() {
	callWithRetry(getLastVos);
	callWithRetry(getCurrentVos);
}

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
			let currentVote = voteHistory.get('Current');
			if (vos['clan_1'] == undefined || vos['clan_2'] == undefined) {
				alt1.setTitleBarText('');
				helperItems.Current.innerHTML =
					'<p>No data found. You can help by visiting Prifddinas and submitting data!</p>';
				return;
			}
			let clan_1: string = titleCase(vos['clan_1']);
			let clan_2: string = titleCase(vos['clan_2']);
			if (clan_1 !== lastClanVote[0] || clan_2 !== lastClanVote[1]) {
				updateTitleBar(clan_1, clan_2);
				alertFavorite(clan_1, clan_2);
			}

			if (currentVote && titleCase(currentVote.clans.clan_1) !== clan_1) {
				if (debugMode)
					console.log(
						'Invalid Data: Vote does not match server data. Deleting Current vote and attempting to scan again.'
					);
				voteHistory.delete('Current');
				scanForClanData();
			}
			updateTimestamp();
		})
		.catch((err) => {
			helperItems.Current.innerHTML = `<p>API Error: Please try again in a minute</p>`;
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
			helperItems.Last.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;

			lastVos = [];
			// Only push new clans to the array - if the clans already exist its because we refetched data
			if (!lastVos.includes(last_vos['clan_1'])) {
				lastVos.push(last_vos['clan_1']);
			}
			if (!lastVos.includes(last_vos['clan_2'])) {
				lastVos.push(last_vos['clan_2']);
			}
		})
		.catch((err) => {
			helperItems.Last.innerHTML = `<p>API Error: Please try again in a minute</p>`;
		});
}

function displayCurrentClanVote(mostRecentVote) {
	/* If we don't have a vote - return */
	if (!mostRecentVote) return;

	/* If we're already showing the current clans - do nothing */
	if (helperItems.Current.innerHTML.includes('asset/resource')) return;

	let clan_1 = titleCase(mostRecentVote.clans.clan_1)
	let clan_2 = titleCase(mostRecentVote.clans.clan_2);

	/* Otherwise update the display to show the player's most recent vote */
	helperItems.Current.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;
}

function submitClanData() {

	const currentVote = voteHistory.get('Current');

	// Checks to see if we have already voted and that our data is valid
	// If our vote data matches data in last vos our data is outdated and we are not allowed to vote
	if (dataMatchesLastHour()) {
		// We already voted which is logged elsewhere - so avoid a redundant log
		if (currentVote) return;

		if (debugMode)
			console.log('Skipping vote. Reason: Vote matches last Voice of Seren');
		return;
	}

	if (voteHistory.get('Voted')) {
		let now = DateTime.now();
		if (now.minute <= 2) {
			if (debugMode)
				console.log(
					'Skipping vote. Reason: recently voted (during primetime)'
				);
			return;
		}
		if (debugMode)
			console.log(
				'Skipping vote. Reason: recently voted (after primetime)'
			);
		setTimeout(() => {
			voteHistory.set('Voted', false);
		}, 1000 * 60 * 15);
		return;
	}

	if (debugMode)
		console.log('Validation: Checking if clan data is two different clans');
	if (!hasValidData()) {
		if (debugMode)
			console.log(
				`Skipping vote. Reason: invalid data - ${clanVote[0]} & ${clanVote[1]}`
			);
		if (debugMode) console.log(`Rescanning for data...`);
		scanForClanData();
		return;
	}

	// Our data is recent and valid and we haven't voted - we can vote!
	getLastVos().then((res) => {
		if (debugMode)
			console.log(
				'Validation: Checking data does not match last VoS'
			);
		fetch('https://vos-alt1.fly.dev/increase_counter', {
			method: 'POST',
			body: JSON.stringify({
				clans: clanVote,
				uuid: uuid,
			}),
			headers: {
				'Content-type': 'application/json; charset=UTF-8',
			},
		})
			.then((res) => {
				sauce.updateSetting(
					'votedCount',
					sauce.getSetting('votedCount') + 1
				);
				if (debugMode)
					console.log(
						`Voted for ${titleCase(clanVote[0])} & ${titleCase(clanVote[1])}. Fetching live data from server.`
					);
				voteHistory.set('Voted', true);
				fetchVos();
			})
			.then((res) => {
				lastClanVote = clanVote;
				if (debugMode) console.log(lastClanVote);
				startVoteCountdown();
			})
			.catch((err) => {
				helperItems.VoteOutput.innerHTML = `<p>API Error: Please try again</p>`;
			});
	});
}

async function automaticScan() {
	if (!alt1.rsActive) {
		if (debugMode)
			console.log(`Skipping scan. Reason: RuneScape is not active`);
		return;
	}
	let now = DateTime.now();
	if (
		voteHistory.get('Voted') &&
		now.minute <= 2 &&
		voteHistory.get('Current')
	) {
		if (debugMode)
			console.log(
				`Skipping scan. Reason: voted recently (voted for ${lastClanVote[0]} and ${lastClanVote[1]})`
			);
		setTimeout(() => {
			voteHistory.set('Voted', false);
		}, 1000 * 20);
		return;
	} else {
		await scanForClanData();
		await sauce.timeout(50);
		submitClanData();
	}

	// If we have not voted and have recent data - try and vote
	if (
		!voteHistory.get('Voted') &&
		voteHistory.get('Current') &&
		isRecentVote(voteHistory.get('Current').timestamp)
	) {
		submitClanData();
	}
}

function titleCase(string) {
	return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

function updateTitleBar(clan_1: string, clan_2: string) {
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
				".png'/></span>"
		);
	}, 300);
}

function updateTimestamp() {
	let timestamp = new Date(Date.now());
	helperItems.Timestamp.innerHTML = `Last Data Fetch: ${
		timestamp.getUTCHours() < 10
			? '0' + timestamp.getUTCHours()
			: timestamp.getUTCHours()
	}:${
		timestamp.getUTCMinutes() < 10
			? '0' + timestamp.getUTCMinutes()
			: timestamp.getUTCMinutes()
	}:${
		timestamp.getUTCSeconds() < 10
			? '0' + timestamp.getUTCSeconds()
			: timestamp.getUTCSeconds()
	}`;
	if (voteHistory.get('Current') || voteHistory.get('Voted')) {
		startVoteCountdown();
	}
}

function showTooltip(tooltip: string = '') {
	if (tooltip == '') {
		alt1.clearTooltip();
		return;
	}

	if (!alt1.setTooltip(tooltip)) {
		if (debugMode) console.log('Error: No tooltip permission');
	}
}

function alertFavorite(clan_1: string, clan_2: string) {
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
		`The Voice of Seren is currently active in: ${alertClans.join(' and ')}`
	);
	setTimeout(alt1.clearTooltip, 5000);
}

/**
 * Whether our current vote data matches the previous vote or previous hour's data
 * @returns boolean
 */
function dataMatchesLastHour() {
	let lastServerData =
		lastVos.includes(clanVote[0]) || lastVos.includes(clanVote[1]);

	// If the server is missing data - always return false
	if (lastVos.includes(undefined)) {
		lastServerData = false
	}

	let lastLocalData =
		lastClanVote.includes(clanVote[0]) ||
		lastClanVote.includes(clanVote[1]);

	// If we do not have a local vote - always return false
	if (lastClanVote.includes(undefined)) {
		lastLocalData = false;
	}

	return lastServerData || lastLocalData;
}

/**
 * Our data is valid if:
 *   - We have two clans to vote for
 *   - The clans are not equivalent to one another
 *   - The clan is not a part of our LAST vote
 * @returns boolean
 */
function hasValidData() {
	let lastVote = voteHistory.get('Last');
	let lastVoteCheck;

	// If our 'Last' vote is older than 2 hours it is invalid
	// Since it is an invalid vote we can delete it - but since we already hold a reference
	// to the value we need to set the held value to be undefined to ensure the next condition always returns true
	if (lastVote && isLastVoteInvalid(lastVote.timestamp)) {
		voteHistory.delete('Last');
		lastVote = undefined;
	};

	// If we have a "Last" vote check that it is not equal to our "Current" vote
	if (lastVote && lastVote.timestamp) {
		const lastClan_1 = lastVote.clans.clan_1;
		const lastClan_2 = lastVote.clans.clan_2;
		lastVoteCheck =
			clanVote[0] !== lastClan_1 && clanVote[1] !== lastClan_2;
		if (debugMode)
			console.log('Invalid Data. Current vote matches last vote.');
	} else {
		// If we do not have a last vote we cannot match against it
		lastVoteCheck = true;
	}

	return (
		clanVote[0] &&
		clanVote[1] &&
		clanVote[0] != clanVote[1] &&
		lastVoteCheck
	);
}

let recentlyFetched = false;
function fetchHourly() {
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
				if (debugMode)
					console.log(
						`App is running latest version. Expected version: ${latestVersion.version} ; found: ${version}`
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
			})
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
		false
	),
};

function createClanCheckbox(clanName: string): HTMLElement {
	// Checkbox automatically updates the default value based on localStorage.
	let clanCheckbox = sauce.createCheckboxSetting(
		`favorite${clanName}`,
		clanName,
		false
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
		settingsObject.uiScale.querySelector('input').value
	);
	getByID('app').style.transform = `scale(${
		parseInt(settingsObject.uiScale.querySelector('input').value, 10) / 100
	})`;
});

export function startvos() {
	if (!window.alt1) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div>You need to run this page in alt1 to capture the screen</div>`
		);
		return;
	}
	if (!alt1.permissionPixel) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`
		);
		return;
	}
	if (!alt1.permissionOverlay) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`
		);
		return;
	}

	if (
		a1lib.hasAlt1Version('1.6.0') &&
		sauce.getSetting('uuid') == undefined
	) {
		sauce.updateSetting('uuid', crypto.randomUUID());
	}
	fetchVos();
	setInterval(fetchHourly, 15000);
	setInterval(automaticScan, 3000);

	if (sauce.getSetting('uiScale')) {
		getByID('app').style.transform = `scale(${
			parseInt(settingsObject.uiScale.querySelector('input').value, 10) /
			100
		})`;
	}
}

window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed

		// if (!a1lib.hasAlt1Version('1.6.0')) {
		// 	helperItems.Output.innerHTML =
		// 		'<strong style="color:red;">OUTDATED ALT1 INSTALL FOUND- PLEASE UPDATE TO VERSION 1.6.0 - THIS MAY REQUIRE A MANUAL UPDATE BY REINSTALLING FROM <a href="https://runeapps.org/">RUNEAPPS.ORG</a></strong>';
		// 	return;
		// }

		// check version on startup then check again every 12 hours
		checkVersion('1.1.2');
		setInterval(() => {
			checkVersion('1.1.2');
		}, 1000 * 60 * 60 * 12);

		alt1.identifyAppUrl('./appconfig.json');
		Object.values(settingsObject).forEach((val) => {
			helperItems.settings.before(val);
		});
		initSettings();
		startvos();
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
		`
		);
	}
};
