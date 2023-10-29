// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';

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
	Get: getByID('getvos'),
	Current: getByID('current'),
	Last: getByID('last'),
	Vote: getByID('vote'),
	Clan1: <HTMLSelectElement>getByID('clan1'),
	Clan2: <HTMLSelectElement>getByID('clan2'),
	Submit: getByID('submit'),
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

const clans = {
	amlodd: 'amlodd',
	cadarn: 'cadarn',
	crwys: 'crwys',
	hefin: 'hefin',
	iorwerth: 'iorwerth',
	ithell: 'ithell',
	meilyr: 'meilyr',
	trahaearn: 'trahaearn',
};

let clanVote = [];

helperItems.Clan1.addEventListener('change', (e) => {
	clanVote[0] = helperItems.Clan1.value;
});

helperItems.Clan2.addEventListener('change', (e) => {
	clanVote[1] = helperItems.Clan1.value;
});

helperItems.Get.addEventListener('click', () => {
	fetch('https://vos-alt1.fly.dev/vos', {
		method: 'GET',
		headers: {
			'Content-type': 'application/json; charset=UTF-8',
		},
	})
	.then((res) => res.text())
	.then((data) => {
		//TODO: Parse & display data properly
		helperItems.Current.innerHTML = data
	});
	fetch('https://vos-alt1.fly.dev/last_vos', {
		method: 'GET',
		headers: {
			'Content-type': 'application/json; charset=UTF-8',
		},
	})
	.then((res) => res.text())
	.then((data) => {
		//TODO: Parse & display data properly
		helperItems.Last.innerHTML = data;
	});
});

helperItems.Submit.addEventListener('click', () => {
	if (!clanVote[0] || clanVote[1]) {
		helperItems.Output.innerHTML = 'You must make a selection for both clans to vote.'
		return;
	}
	if (clanVote[0] == clanVote[1]) {
		helperItems.Output.innerHTML =
			'You must select two different clans to vote.';
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
	}
})

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

	//setInterval(updateOverlay, 100);
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
	setEmptyPocket();
}

function setDefaultSettings() {
	localStorage.setItem(
		'vos',
		JSON.stringify({
			uuid: undefined,
			lastFetch: undefined,
			lastVote: undefined,
			currentVos: undefined,
			lastVos: undefined,
			overlayPosition: { x: 100, y: 100 },
			updatingOverlayPosition: false,
		})
	);
}

function setEmptyPocket() {
	updateSetting('pocketItem', '');
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
	localStorage.removeItem('vos');
	localStorage.clear();
	initSettings();
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
