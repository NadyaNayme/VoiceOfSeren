import * as a1lib from 'alt1';
import { clanImages } from '../utility/helpers';

/**
 * Captures the game window and scans it for Clan icons
 * If the icons exist - returns the x,y coordinates of the icons
 * @returns \{clan: {x,y}, clan: {x,y}}
 */
export function tryFindClans(): object {
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
