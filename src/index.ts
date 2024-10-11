import * as sauce from './a1sauce';

import {
    getByID,
    helperItems,
    permissionChecks,
    updateTimestamps,
} from './utility/helpers';

import { initSettings, settingsObject } from './utility/settings';
import { startVersionCheck } from './utility/checkVersion';
import { fetchVos } from './api/getServerData';
import { automaticScan, fetchHourly } from './lib';

import './index.html';
import './appconfig.json';
import './version.json';
import './icon.png';
import './css/styles.css';

/**
 * Whether or not Debug Mode is enabled
 */
let debugMode = sauce.getSetting('debugMode') ?? false;

/**
 * Contains the following keys:
 *
 * LastLocal: ClanVote | LastServer: ClanVote | Current: ClanVote | Voted: Boolean | NextEligible: Number (Epoch Timestamp)
 *
 * Data is not persisted between sessions
 */
const sessionData = new Map();

/**
 * Adds event listeners to the Settings
 */
function addEventListeners() {
    /**
     * Update the Scale of everything in the app based on the user's settings
     */
    getByID('app').style.transform = `scale(${
        parseInt(settingsObject.uiScale.querySelector('input').value, 10) / 100
    })`;
    getByID('debugMode').addEventListener('click', (e) => {
        let el = <HTMLInputElement>getByID('debugMode');
        debugMode = el.checked;
    });
}

/**
 * Starts the main app functionality: scanning for clan data and voting
 * @returns void
 */
export function startvos(): Promise<void> {
    if (!window.alt1) {
        helperItems.Output.insertAdjacentHTML(
            'beforeend',
            `<div>You need to run this page in alt1 to capture the screen</div>`,
        );
        return;
    }
    permissionChecks();

    initSettings();
    addEventListeners();

    fetchVos(sessionData, debugMode);

	// should be named "fetchAtTimes" to be honest. Runs every 15 seconds.
    setInterval(() => fetchHourly(sessionData, debugMode), 1000 * 15);

	// Scan every 3 seconds - will early return if no need to scan.
    setInterval(() => automaticScan(sessionData, debugMode), 1000 * 3);

	// Keep our helpful timers accurate to the minute by updating them each minute
    setInterval(() => updateTimestamps(sessionData, debugMode), 1000 * 60);

	// Force a fetch once every hour + 15~ seconds delay
	setInterval(() => fetchVos(sessionData, debugMode), 1000 * 60 * 60 + 15)

	// Log session data every 30 seconds for debugging purposes.
	setInterval(() => {
		if (debugMode) console.log(sessionData)
	}, 1000 * 30);
}

window.onload = function () {
    if (window.alt1) {
        alt1.identifyAppUrl('./appconfig.json');

        const version = '2.0.2';
        startVersionCheck(version);

        Object.values(settingsObject).forEach((val) => {
            helperItems.settings.before(val);
        });

        startvos();
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
