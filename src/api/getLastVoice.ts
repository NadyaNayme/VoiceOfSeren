import { CapitalizedClanString, ClanVote } from "../data/types";
import { getCurrentEpoch } from "../utility/epochs";
import { createClanDisplay, debugLog, helperItems, titleCase } from "../utility/helpers";

/**
 * Retrieves the last Voice of Seren from the server and updates the App Window
 */
export async function getLastVos(sessionData, debugMode) {
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
            let clan_1 = <CapitalizedClanString>titleCase(last_vos['clan_1']);
            let clan_2 = <CapitalizedClanString>titleCase(last_vos['clan_2']);

            // Update the "Last Voice of Seren" section of the App Window
            helperItems.Last.innerHTML = createClanDisplay(clan_1, clan_2);

            // If we do not have data from the server or our data does not match - update it
            const lastServer: ClanVote = sessionData.get('LastServer');
            const lastServerData: ClanVote = {
                timestamp: getCurrentEpoch(),
                clans: {
                    clan_1: clan_1,
                    clan_2: clan_2,
                },
            };
            if (
                lastServer?.clans?.clan_1 !== lastServerData?.clans?.clan_1 ||
                lastServer?.clans?.clan_2 !== lastServerData?.clans?.clan_2
            ) {
                sessionData.set('LastServer', lastServerData);
            }
        })
        .catch((err) => {
            helperItems.Last.innerHTML = `<p>API Error: Please try again in a minute</p>`;
            debugLog(err, debugMode);
        });
}
