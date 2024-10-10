import * as a1lib from 'alt1';
import * as sauce from '.././a1sauce';
import { createClanCheckbox } from '../lib';
import { getByID } from './helpers';

/**
 * Initialize localStorag eif it does not exist and then set some initial values
 */
export function initSettings() {
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
    /**
     * For fun statistics so a person can see how many times they have voted
     */
    if (!sauce.getSetting('votedCount')) {
        sauce.updateSetting('votedCount', 0);
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
}

/**
 * A created SettingsObject using A1 Sauce's Settings Builder API
 */
export const settingsObject = {
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

settingsObject.uiScale.addEventListener('change', (e) => {
    sauce.updateSetting(
        'uiScale',
        settingsObject.uiScale.querySelector('input').value,
    );
    getByID('app').style.transform = `scale(${
        parseInt(settingsObject.uiScale.querySelector('input').value, 10) / 100
    })`;
});
