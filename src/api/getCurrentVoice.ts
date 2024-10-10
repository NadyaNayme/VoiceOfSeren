import { CapitalizedClanString, ClanVote } from "../data/types";
import { alertFavorite } from "../lib";
import { scanForClanData } from "../lib/scanForClanData";
import { debugLog, helperItems, titleCase, updateTimestamps, updateTitleBar } from "../utility/helpers";

/**
 * Retrieves the current Voice of Seren from the server and updates the App Window
 */
export async function getCurrentVos(sessionData, debugMode: boolean) {
    fetch('https://vos-alt1.fly.dev/vos', {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        },
    })
        .then((res) => res.text())
        .then((data) => {
            let vos = JSON.parse(data);
            let currentVote: ClanVote = sessionData.get('Current');
            let lastServer: ClanVote = sessionData.get('LastServer');

            if (vos['clan_1'] == undefined || vos['clan_2'] == undefined) {
                alt1.setTitleBarText('');
                helperItems.Current.innerHTML =
                    '<p>No data found. You can help by visiting Prifddinas and submitting data!</p>';
                return;
            }
            let clan_1 = <CapitalizedClanString>titleCase(vos['clan_1']);
            let clan_2 = <CapitalizedClanString>titleCase(vos['clan_2']);

            // If data is new, update the title bar and alert user of favorited hour
            if (
                clan_1 !== lastServer?.clans?.clan_1 &&
                clan_2 !== lastServer?.clans?.clan_2
            ) {
                updateTitleBar(clan_1, clan_2);
                alertFavorite(clan_1, clan_2);
            }

            // If our current voting data does not match what the server says it is
            // attempt to scan for new data - this does not affect our ability to vote
            if (clan_1 !== currentVote?.clans?.clan_1) {
                debugLog(
                    'Invalid Data: Vote does not match server data. Deleting Current vote and attempting to scan again.',
                    debugMode,
                );
                sessionData.delete('Current');
                scanForClanData(sessionData, debugMode);
            }

            // Update the time stamps to let the user know when data was last fetched and voting will next be available
            updateTimestamps(sessionData, debugMode);
        })
        .catch((err) => {
            helperItems.Current.innerHTML = `<p>API Error: Please try again in a minute</p>`;
            debugLog(err, debugMode);
        });
}
