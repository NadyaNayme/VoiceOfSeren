import { helperItems } from './helpers';

/**
 * Check that the version hard coded in checkVersion matches the version.json
 * @param version: string - the current version
 */
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
            }
        });
}

export function startVersionCheck(version: string) {
	checkVersion(version);
	setInterval(
		() => {
			checkVersion(version);
		},
		1000 * 60 * 60 * 12,
	);
}
