import * as sauce from '.././a1sauce';
import { CapitalizedClanString } from '../data/types';

/**
 * Creates a checkbox element for the user to select their favorite Elf clans to allow for alerts
 * @param clanName - One of the 8 Elf clans
 * @returns Setting that contains a checkbox to toggle the user's favorite clans for the given clan
 */
export function createClanCheckbox(clanName: CapitalizedClanString): HTMLElement {
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

/**
 * Updates localStorage with the user's favorited clans
 * @param favoriteClans - Set that contains the user's favorited clans
 */
export function updateFavoriteClans(favoriteClans: Set<string>) {
    // We need to convert the Set to an Array since Sets cannot be stringified to json.
    sauce.updateSetting('favoriteClans', Array.from(favoriteClans));
}

/**
 * Creates a mouse tooltip if either of the parameters matches one of the user's favorited clans
 * @param clan_1 - First Voice of Seren Clan
 * @param clan_2 - Second Voice of Seren Clan
 * @returns void
 */
export function alertFavorite(
    clan_1: CapitalizedClanString,
    clan_2: CapitalizedClanString,
) {
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
    alt1.setTooltip(
        `The Voice of Seren is currently active in: ${alertClans.join(' and ')}`,
    );
    setTimeout(alt1.clearTooltip, 5000);
}

/**
 * Converts the localStorage setting which can only be saved as a string back into a Set
 * @returns Set of favorited clans from localStorage
 */
export function getFavoriteClans(): Set<string> {
    const settingValue = sauce.getSetting('favoriteClans');
    if (!settingValue || Object.keys(settingValue).length === 0) {
        return new Set<string>();
    }

    return new Set<string>(settingValue);
}
