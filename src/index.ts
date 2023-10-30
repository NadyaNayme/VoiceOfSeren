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

helperItems.Vote.addEventListener('mouseenter', (e) => {
	getClanData()
});

async function getClanData() {
	if (helperItems.Vote.getAttribute('disabled') == 'true') {
		return;
	}
	let findClans = tryFindClans();
	let foundClans = [];
	for (let [key, value] of Object.entries(findClans)) {
		if (value > 0) {
			foundClans.push(key.toString());
			clanVote[0] = foundClans[0];
			clanVote[1] = foundClans[1];
		}
	}
	if (foundClans.length == 0) {
		clanVote = [];
	}
	validateVotes();
}

function validateVotes() {
	if (!clanVote[0] || !clanVote[1]) {
		helperItems.VoteOutput.innerHTML =
			'<p>You must be in Prifddinas to submit data.</p>';
	}
	else {
		helperItems.VoteOutput.innerHTML = '';
	}
}

helperItems.Get.addEventListener('click', (e) => {
	fetchVos();
});

helperItems.Vote.addEventListener('click', (e) => {
	voteVos();
});

function fetchVos() {
	alt1.setTitleBarText('');
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
			let clan_1: string = titleCase(vos['clan_1']);
			let clan_2: string = titleCase(vos['clan_2']);
			helperItems.Current.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;
			setTimeout(() => {
				let title = "The Voice of Seren is currently at " + clan_1 + " and " + clan_2 + ".";
				alt1.setTitleBarText("<span title='" + title + "'><img width='80' height='80' src='./asset/resource/" + clan_1 + ".png'/><img src='./asset/resource/" + clan_2 + ".png'/></span>");
			}, 300);
		}).catch((err) => {
			helperItems.Current.innerHTML = `API Error: Please try again in a minute`;
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
				helperItems.Last.innerHTML =
					'Server was reset - no data for previous hour.';
				return;
			}
			let clan_1 = titleCase(last_vos['clan_1']);
			let clan_2 = titleCase(last_vos['clan_2']);
			helperItems.Last.innerHTML = `<div><p>${clan_1}</p><img src="./asset/resource/${clan_1}.png" alt="${clan_1}"></div><div><p>${clan_2}</p><img src="./asset/resource/${clan_2}.png" alt="${clan_2}"></div>`;
			sauce.updateSetting('lastClans', [last_vos['clan_1'], last_vos['clan_2']]);
		}).catch((err) => {
			helperItems.Last.innerHTML = `API Error: Please try again in a minute`;
		});
	helperItems.Get.setAttribute('disabled', 'true');
	helperItems.Get.innerText = 'Updated!';
	setTimeout(() => {
		helperItems.Get.removeAttribute('disabled');
		helperItems.Get.innerText = 'Update';
	}, 60000)
}

function votedThisHour() {
	let votedHour = sauce.getSetting('voted');
	let votedDay = sauce.getSetting('votedDay');
	if (!sauce.getSetting('voted')) {
		return false;
	}
	let currentHour = DateTime.now().hour;
	let currentDay = DateTime.now().day;
	if (currentDay != votedDay) {
		return true;
	}
	return votedHour == currentHour;
}

async function voteVos() {
	if (votedThisHour()) {
		return;
	}
	if (sauce.getSetting('lastClans')) {
		if (
			sauce.getSetting('lastClans').includes(clanVote[0]) ||
			sauce.getSetting('lastClans').includes(clanVote[1])
		) {
			console.log(`Won't allow votes for last VoS hour.`);
			return;
		}
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
		}).then((res) => {
			console.log(res.text());
			sauce.updateSetting('voted', DateTime.now().hour);
			sauce.updateSetting('votedDay', DateTime.now().day);
			sauce.updateSetting('votedCount', sauce.getSetting('votedCount') + 1);
			fetchVos();
			console.log(clanVote);
		}).then((res) => {
			clanVote = [];
			console.log(clanVote);
		}).catch((err) => {
			helperItems.VoteOutput.innerHTML = `API Error: Please try again`
			sauce.updateSetting('voted' , undefined);
			sauce.updateSetting('votedDay', undefined);
		});
	}
}

async function scanForClans() {
	await getClanData();
	await voteVos();
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

	if (sauce.getSetting('uuid') == undefined) {
		sauce.updateSetting('uuid', crypto.randomUUID());
	}
	fetchVos();
	setInterval(fetchHourly, 1000);
	setInterval(checkTime, 1000);

	if (sauce.getSetting('automaticScanning')) {
		setInterval(scanForClans, 10000);
	}

	//setInterval(updateOverlay, 100);
}

function checkTime() {
	if (!votedThisHour()) {
		helperItems.Vote.innerText = 'Submit Data';
		helperItems.Vote.removeAttribute('disabled');
	} else {
		helperItems.Vote.innerText = 'Submitted';
		helperItems.Vote.setAttribute('disabled', 'true');
	}
}

function updateLocation(e) {
	sauce.updateSetting('overlayPosition', {
		x: Math.floor(
			e.x
		),
		y: Math.floor(
			e.y
		),
	});
	sauce.updateSetting('updatingOverlayPosition', false);
	alt1.overLayClearGroup('overlayPositionHelper');
}

async function updateOverlay() {
	let overlayPosition = sauce.getSetting('overlayPosition');

	alt1.overLaySetGroup('vos');
	alt1.overLayFreezeGroup('vos');

	alt1.overLayClearGroup('vos');

	alt1.overLayRefreshGroup('vos');
	await new Promise((done) => setTimeout(done, 300));
}

function fetchHourly() {
	let date = DateTime.now();
	if (date.minute == 1 && !helperItems.Get.getAttribute('disabled')) {
		let delay = Math.random() * 20000;
		setTimeout(() => {
			fetchVos();
		}, delay);
	}
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
			automaticScanning: true,
			overlayPosition: { x: 100, y: 100 },
			voted: false,
			votedCount: 0,
			updatingOverlayPosition: false,
		})
	);
}

async function setOverlayPosition() {
	a1lib.once('alt1pressed', updateLocation);
	sauce.updateSetting('updatingOverlayPosition', true);
	while (sauce.getSetting('updatingOverlayPosition')) {
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

const settingsObject = {
	settingsHeader: sauce.createHeading('h2', 'Settings'),
	automaticScanning: sauce.createCheckboxSetting(
		'automaticScanning',
		'Automatic Scanning'
	),
};

settingsObject.automaticScanning.addEventListener('input',(e) => {
	location.reload();
})


window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed
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
