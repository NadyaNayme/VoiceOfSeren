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

let helperItems = {
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

var clanImages = a1lib.webpackImages({
	amlodd: require('./asset/data/Amlodd_Clan.data.png'),
	cadarn: require('./asset/data/Cadarn_Clan.data.png'),
	crwys: require('./asset/data/Crwys_Clan.data.png'),
	hefin: require('./asset/data/Hefin_Clan.data.png'),
	iorwerth: require('./asset/data/Iorwerth_Clan.data.png'),
	ithell: require('./asset/data/Ithell_Clan.data.png'),
	meilyr: require('./asset/data/Meilyr_Clan.data.png'),
	trahaearn: require('./asset/data/Trahaearn_Clan.data.png'),
});

helperItems.Button.addEventListener('click', (e) => {
	if (helperItems.Button.dataset.state == 'get') {
		setButtonText('Fetching data...', 'scanning');
		setTimeout(function() {
			scanForClanData();
		}, 50);
	}
	if (helperItems.Button.dataset.state == 'scanready') {
		setButtonText('Scanning for clans', 'scanning');
		scanForClanData();
	}
	if (helperItems.Button.dataset.state == 'voteready') {
		submitClanData();
	}
});

let clanVote = [];
let lastClanVote = [];
let lastVos = [];
let automaticScanning = sauce.getSetting('automaticScanning');

function setButtonText(text: string, state: string) {
	helperItems.Button.innerText = text;
	helperItems.Button.dataset.state = state;
}

function getButtonDataState() {
	return helperItems.Button.dataset.state;
}

function setButtonDisabledState(disabled: string) {
	helperItems.Button.setAttribute('disabled', disabled);
}

function getButtonDisabledState() {
	let state = helperItems.Button.getAttribute('disabled');
	if (state === 'true') {
		return true;
	} else {
		return false;
	}
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

	// Skip scanning for clan data - we have already voted so already have data for the hour
	if (getButtonDataState() == 'voted') {
		console.log('Skipping scan. Reason: already voted');
		return;
	}
	console.log('Scanning for clan data');
	// Turn the {clan_1: {x,y}, clan_2: {x,y}} into an array
	let foundClans = Object.entries(tryFindClans());

	// If we captured 0 instead of 2 clans we are not in Prif so return early after a 20s delay
	// If we only found 1 clan it is possible the other clan was obscured. Disallow votes due to potentially bad data
	if (
		Object.keys(foundClans).length == 0 ||
		Object.keys(foundClans).length == 1
	) {
		// Bad data so empty the voting data
		clanVote = [];
		console.log(
			'Skpping scan. Reason: Outside of Prifddinas'
		);
		sauce.timeout(1000 * 20);
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

	console.log(clanVote);

	if (!clanVote[0] || !clanVote[1]) {
		if (
			!automaticScanning &&
			helperItems.Button.dataset.state == 'scanning'
		) {
			setButtonText('No data - scan again?', 'scanready');
		}
		helperItems.VoteOutput.innerHTML =
			'<p>You must be in Prifddinas to scan for data!</p>';
		clanVote = [];
		console.log(
			`Skipping scan. Reason: user not in Prifddinas. Resetting vote data: ${clanVote[0]} & ${clanVote[1]}`
		);
	} else {
		helperItems.VoteInput.innerHTML =
			`<p style="white-space:normal!important;">Detected clans!</br>${clanVote[0]} and ${clanVote[1]}</br><small>Incorrect? Contact Nyu.</small></p>`;
		helperItems.VoteOutput.innerHTML = '';
		if (
			!automaticScanning &&
			helperItems.Button.dataset.state == 'scanning'
		) {
			setButtonText('Submit vote!', 'voteready');
		}
	}
}

const callWithRetry = async (fn, depth = 0) => {
	try {
		console.log(`Attempting to connect to API again after error...`);
		sauce.timeout(1000);
		return fn();
	} catch (e) {
		if (depth > 7) {
			throw e;
		}
		console.log(
			`Attempting to connect to API again after error... Attempt #${depth}/7`
		);
		await new Promise((resolve) => setTimeout(resolve, 2 ** depth * 10));

		return callWithRetry(fn, depth + 1);
	}
};

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
			if (vos['clan_1'] == undefined || vos['clan_2'] == undefined) {
				alt1.setTitleBarText('');
				helperItems.Current.innerHTML =
					'<p>No data found. You can help by visiting Prifddinas and submitting data!</p>';
				if (!automaticScanning) {
					setButtonText('Get VoS', 'get');
				}
				return;
			}
			let clan_1: string = titleCase(vos['clan_1']);
			let clan_2: string = titleCase(vos['clan_2']);
			if (clan_1 !== lastClanVote[0] && clan_2 !== lastClanVote[1]) {
				updateTitleBar(clan_1, clan_2);
			}
			updateTimestamp();
			if (
				!automaticScanning &&
				helperItems.Button.dataset.state == 'fetching'
			) {
				setButtonText('Data received!', 'received');
				setTimeout(() => {
					setButtonText('Scan for clans', 'scanready');
				}, 1500);
			}
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

function submitClanData() {
	if (getButtonDataState() == 'voted') {
		console.log('Skipping vote. Reason: already voted');
		return;
	}
	console.log('Validation: Checking if clan data is two different clans');
	// Check to see if we have already voted and that our data is valid
	if (!hasValidData()) {
		helperItems.VoteInput.innerHTML = `<p style="white-space:normal!important;">Not in Prifddinas</p>`;
		console.log(`Skipping vote. Reason: invalid data - ${clanVote[0]} & ${clanVote[1]}`);
		return;
	}

	// If our vote data matches data in last vos our data is outdated and we are not allowed to vote
	if (dataMatchesLastHour()) {
		console.log('Skipping vote. Reason: vote matches last VoS');
		return;
	}

	if (sauce.getSetting('justVoted')) {
		let now = DateTime.now();
		if (now.minute <= 2) {
			console.log('Skipping vote. Reason: recently voted (during primetime)');
			if (!automaticScanning) {
				setButtonText('Voted!', 'voted');
				setButtonDisabledState('true');
			}
			setTimeout(() => {
				sauce.updateSetting('justVoted', false);
				if (!automaticScanning) {
					setButtonText('Voted!', 'voted');
					setButtonDisabledState('true');
				}
			}, 1000 * 30);
			return;
		}
		console.log('Skipping vote. Reason: recently voted (after primetime)');
		if (!automaticScanning) {
			setButtonText('Voted!', 'voted');
			setButtonDisabledState('true');
		}
		setTimeout(() => {
			sauce.updateSetting('justVoted', false);
			if (!automaticScanning) {
				setButtonText('Get VoS', 'get');
				setButtonDisabledState('false');
			}
		}, 1000 * 60 * 15);
		return;
	}

	if (
		hasValidData() &&
		!dataMatchesLastHour() &&
		!sauce.getSetting('justVoted')
	) {
		getLastVos().then((res) => {
			console.log('Validation: Checking data does not match last VoS');
			let uuid = sauce.getSetting('uuid');
			if (uuid == undefined) {
				uuid = 0;
			}
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
					console.log(`Voted for ${clanVote[0]} & ${clanVote[1]}. Fetching live data from server.`);
					fetchVos();
				}).then((res) => {
					lastClanVote = clanVote;
					console.log(lastClanVote);
					clanVote = [];
					sauce.updateSetting('justVoted', true);
					if (!automaticScanning && helperItems.Button.dataset.role == 'voteready') {
						setButtonText('Voted!', 'voted');
						setButtonDisabledState('true');
					}
				})
				.catch((err) => {
					helperItems.VoteOutput.innerHTML = `<p>API Error: Please try again</p>`;
				});
		});
	}
}

async function automaticScan() {
	if (!sauce.getSetting('automaticScanning')) {
		return;
	}
	if (!alt1.rsActive) {
		console.log(
			`Skipping scan. Reason: RuneScape is not active`
		);
		clanVote = [];
		return;
	}
	if (clanVote.length) {
		console.log(`Skipping scan. Reason: already scanned! Current vote: ${clanVote[0]} & ${clanVote[1]}`);
		clanVote = [];
		return;
	}
	let now = DateTime.now();
	if (sauce.getSetting('justVoted') && now.minute <= 2) {
		console.log(
			`Skipping scan. Reason: voted recently (voted for ${lastClanVote[0]} and ${lastClanVote[1]})`
		);
		setTimeout(() => {
			sauce.updateSetting('justVoted', false);
		}, 1000 * 20);
	return;
	} else {
		clanVote = [];
		await scanForClanData();
		new Promise((resolve) => setTimeout(resolve, 50));
		await submitClanData();
	}
}

function titleCase(string) {
	return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

function updateTitleBar(clan_1, clan_2) {
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
	helperItems.Timestamp.innerHTML = `Data Last Updated: ${
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
}

function dataMatchesLastHour() {
	let lastServerData =
		lastVos.includes(clanVote[0]) || lastVos.includes(clanVote[1]);
	let lastLocalData =
		lastClanVote.includes(clanVote[0]) || lastClanVote.includes(clanVote[1]);
	return (lastServerData || lastLocalData)
}

function hasValidData() {
	return clanVote[0] && clanVote[1] && clanVote[0] != clanVote[1];
}

let recentlyFetched = false;
function fetchHourly() {
	let date = DateTime.now();
	if (
		(date.minute == 2 ||
		date.minute == 5 ||
		date.minute == 10 ||
		date.minute == 15 ||
		date.minute == 20 ||
		date.minute == 25 ||
		date.minute == 30 )
		&& automaticScanning
		&& !recentlyFetched)
	{
		recentlyFetched = true;
		let delay = Math.random() * 3000;
		setTimeout(() => {
			fetchVos();
		}, delay);
		setTimeout(() => {
			recentlyFetched = false;
		}, delay * 10);
	}
}

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
				automaticScanning: true,
				votedCount: 0,
				uiScale: '100',
			})
		);
	}
	getByID('app').style.transform = `scale(${sauce.getSetting('uiScale')})`;
	if (sauce.getSetting('automaticScanning')) {
		setButtonText('Automatic Mode Enabled', 'automatic');
		setButtonDisabledState('true');
	}
}

const settingsObject = {
	settingsHeader: sauce.createHeading('h2', 'Settings'),
	automaticScanning: sauce.createCheckboxSetting(
		'automaticScanning',
		'Automatic Mode',
		sauce.getSetting('automaticScanning') ?? true
	),
	uiScale: sauce.createRangeSetting('uiScale', 'Resize VoS app', {
		defaultValue: sauce.getSetting('uiScale') ?? '100',
		min: 30,
		max: 200,
		unit: '%',
	}),
};

settingsObject.automaticScanning.addEventListener('change', (e) => {
	location.reload();
})

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
		checkVersion('1.1.0');
		setInterval(() => {
			checkVersion('1.1.0');
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
