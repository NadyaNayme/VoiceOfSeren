// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import { DateTime } from 'luxon';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/styles.css';

function getByID(id: string) {
	return document.getElementById(id);
}

let helperItems = {
	Output: getByID('output'),
	Current: getByID('current'),
	Get: getByID('get'),
	Last: getByID('last'),
	Clan1: <HTMLSelectElement>getByID('clan1'),
	Clan2: <HTMLSelectElement>getByID('clan2'),
	VoteOutput: getByID('vote_output'),
	Vote: getByID('send_vote'),
	settings: getByID('Settings'),
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

function tryFindClans() {
	let client_screen = a1lib.captureHoldFullRs();
	let foundClans = {
		amlodd: client_screen.findSubimage(clanImages.amlodd).length,
		cadarn: client_screen.findSubimage(clanImages.cadarn).length,
		crwys: client_screen.findSubimage(clanImages.crwys).length,
		hefin: client_screen.findSubimage(clanImages.hefin).length,
		iorwerth: client_screen.findSubimage(clanImages.iorwerth).length,
		ithell: client_screen.findSubimage(clanImages.ithell).length,
		meilyr: client_screen.findSubimage(clanImages.meilyr).length,
		trahaearn: client_screen.findSubimage(clanImages.trahaearn).length,
	}
	console.log(foundClans);
	return foundClans;
}

let clanVote = [];

helperItems.Clan1.addEventListener('change', (e) => {
	clanVote[0] = helperItems.Clan1.value;
	validateVotes();
});

helperItems.Clan2.addEventListener('change', (e) => {
	clanVote[1] = helperItems.Clan2.value;
	validateVotes();
});

helperItems.Clan1.addEventListener('mouseenter', (e) => {
	let findClans = tryFindClans();
	let foundClans = [];
	for (let [key, value] of Object.entries(findClans)) {
		if (value > 0) {
			foundClans.push(key.toString());
			helperItems.Clan1.value = foundClans[0];
			helperItems.Clan2.value = foundClans[1];
		}
	}
});

helperItems.Clan2.addEventListener('mouseenter', (e) => {
	let findClans = tryFindClans();
	let foundClans = [];
	for (let [key, value] of Object.entries(findClans)) {
		if (value > 0) {
			foundClans.push(key.toString());
			helperItems.Clan1.value = foundClans[0];
			helperItems.Clan2.value = foundClans[1];
		}
	}
});

function validateVotes() {
	if (!clanVote[0] || !clanVote[1]) {
		helperItems.VoteOutput.innerHTML =
			'<p>You must make a selection for both clans to vote.</p>';
			helperItems.Vote.setAttribute('disabled', 'true');
	}
	else if (clanVote[0] == clanVote[1]) {
		helperItems.VoteOutput.innerHTML =
			'<p>You must select two different clans to vote.</p>';
			helperItems.Vote.setAttribute('disabled', 'true');
	} else {
		helperItems.VoteOutput.innerHTML = '';
		helperItems.Vote.removeAttribute('disabled');
	}
}

helperItems.Get.addEventListener('click', (e) => {
	fetchVos();
});

helperItems.Vote.addEventListener('click', (e) => {
	voteVos();
});

function setNextTime() {
	let now = DateTime.now();
	let nextTime = now.plus({ hours: 1 });
	return nextTime;
}

function canFetchAgain() {
	let nextFetchTime = DateTime.fromISO(getSetting('nextFetchTime'));
	if (nextFetchTime == undefined) {
		updateSetting('nextFetchTime', setNextTime());
	}
	let currentTime = DateTime.now();
	if (nextFetchTime.minute + 2 > currentTime.minute) {
		helperItems.Get.innerText = 'Please wait...';
		helperItems.Get.setAttribute('disabled', 'true');
		return false;
	} else {
		helperItems.Get.innerText = 'Update';
		helperItems.Get.removeAttribute('disabled');
		return true;
	}
}

function fetchVos() {
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
				helperItems.Current.innerHTML =
					'<p>No data found. You can help by visiting Prifddinas and submitting data!</p>';
				return;
			}
			let clan_1 = titleCase(vos['clan_1']);
			let clan_2 = titleCase(vos['clan_2']);
			helperItems.Current.innerHTML = `<img src="./asset/resource/${clan_1}.png"> <img src="./asset/resource/${clan_2}.png">`;
		});
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
				helperItems.Output.innerHTML =
					'Server was reset - no data for previous hour.';
				return;
			}
			let clan_1 = titleCase(last_vos['clan_1']);
			let clan_2 = titleCase(last_vos['clan_2']);
			helperItems.Last.innerHTML = `<img src="./asset/resource/${clan_1}.png"> <img src="./asset/resource/${clan_2}.png">`;
		});
	helperItems.Get.setAttribute('disabled', 'true');
	updateSetting('nextFetchTime', setNextTime());
}

function canVoteAgain() {
	let nextVoteTime = DateTime.fromISO(getSetting('nextVoteTime'));
	if (nextVoteTime == undefined) {
		updateSetting('nextVoteTime', setNextTime());
	}
	let currentTime = DateTime.now();
	if (nextVoteTime.hour > currentTime.hour) {
		helperItems.Vote.innerText = 'Already Submitted';
		helperItems.Vote.setAttribute('disabled', 'true');
		return false;
	} else {
		helperItems.Vote.innerText = 'Submit Data';
		helperItems.Vote.removeAttribute('disabled');
		return true;
	}
}

function voteVos() {
	if (!canVoteAgain()) {
		return;
	}
	if (clanVote[0] && clanVote[1] && clanVote[0] != clanVote[1]) {
		fetch('https://vos-alt1.fly.dev/increase_counter', {
			method: 'POST',
			body: JSON.stringify({
				clans: clanVote,
			}),
			headers: {
				'Content-type': 'application/json; charset=UTF-8',
			},
		});
		helperItems.Vote.setAttribute('disabled', 'true');
	}
	updateSetting('nextVoteTime', setNextTime());
}

function titleCase(string) {
	return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

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

	if (getSetting('uuid') == undefined) {
		updateSetting('uuid', crypto.randomUUID());
	}
	fetchVos();
	setInterval(checkTime, 1000);

	//setInterval(updateOverlay, 100);
}

function checkTime() {
	if (canVoteAgain()) {
		helperItems.Vote.innerText = 'Submit Data';
		helperItems.Vote.removeAttribute('disabled');
	}
	if (canFetchAgain()) {
		helperItems.Get.innerText = 'Update';
		helperItems.Get.removeAttribute('disabled');
	}
}

function updateLocation(e) {
	updateSetting('overlayPosition', {
		x: Math.floor(
			e.x
		),
		y: Math.floor(
			e.y
		),
	});
	updateSetting('updatingOverlayPosition', false);
	alt1.overLayClearGroup('overlayPositionHelper');
}

async function updateOverlay() {
	let overlayPosition = getSetting('overlayPosition');

	alt1.overLaySetGroup('vos');
	alt1.overLayFreezeGroup('vos');

	alt1.overLayClearGroup('vos');

	alt1.overLayRefreshGroup('vos');
	await new Promise((done) => setTimeout(done, 300));
}

function initSettings() {
	if (!localStorage.vos) {
		setDefaultSettings();
	}
}

function setDefaultSettings() {
	localStorage.setItem(
		'vos',
		JSON.stringify({
			overlayPosition: { x: 100, y: 100 },
			updatingOverlayPosition: false,
		})
	);
}

let posBtn = getByID('OverlayPosition');
posBtn.addEventListener('click', setOverlayPosition);
async function setOverlayPosition() {
	a1lib.once('alt1pressed', updateLocation);
	updateSetting('updatingOverlayPosition', true);
	while (getSetting('updatingOverlayPosition')) {
		alt1.setTooltip('Press Alt+1 to set overlay position.');
		alt1.overLaySetGroup('overlayPositionHelper');
		alt1.overLayRect(
			a1lib.mixColor(255, 255, 255),
			Math.floor(
				a1lib.getMousePosition().x
			),
			Math.floor(
				a1lib.getMousePosition().y
			),
			300,
			50,
			200,
			2
		);
		await new Promise((done) => setTimeout(done, 200));
	}
	alt1.clearTooltip();
}


function getSetting(setting) {
	if (!localStorage.vos) {
		initSettings();
	}
	return JSON.parse(localStorage.getItem('vos'))[setting];
}

function updateSetting(setting, value) {
	if (!localStorage.getItem('vos')) {
		localStorage.setItem('vos', JSON.stringify({}));
	}
	var save_data = JSON.parse(localStorage.getItem('vos'));
	save_data[setting] = value;
	localStorage.setItem('vos', JSON.stringify(save_data));
}

let resetAllSettingsButton = getByID('ResetAllSettings');
resetAllSettingsButton.addEventListener('click', () => {
	let uuid = getSetting('uuid');
	localStorage.removeItem('vos');
	localStorage.clear();
	initSettings();
	updateSetting('uuid', uuid);
	location.reload();
});


window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed
		alt1.identifyAppUrl('./appconfig.json');
		initSettings();
		startvos();
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
