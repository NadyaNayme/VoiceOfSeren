import { checkTimeDifference, getNextHourEpoch } from "./epochs";

export interface PersistentMap {
    storageKey: string;
    map: PersistentMap;
}

export class PersistentMap {
    constructor(storageKey: string) {
        this.storageKey = storageKey;
        this.map = loadSession(storageKey);
		this.save();
    }

    save() {
        saveSession(this.map, this.storageKey);
    }

    set(key: string, value: unknown) {
        this.map.set(key, value);
        this.save();
    }

    delete(key: string) {
        const result = this.map.delete(key);
        if (result) {
            this.save();
        }
        return result;
    }

    clear() {
        this.map.clear();
        this.save();
    }

    get(key: string) {
        return this.map.get(key);
    }

    forEach(callback: Function) {
        this.map.forEach(callback);
    }

    entries() {
        return this.map.entries();
    }
}

function saveSession(map: PersistentMap, key: string) {
    const mapArray = Array.from(map.entries());
    const jsonString = JSON.stringify(mapArray);
    localStorage.setItem(key, jsonString);
}

function loadSession(key: string) {
    const jsonString = localStorage.getItem(key);
    if (jsonString) {
        const mapArray = JSON.parse(jsonString);
        return clearOldData(new Map(mapArray));
    }
    return new Map();
}

function clearOldData(map) {
	//Get the next hour's epoch then subtract 2 hours from that to return last hour's epoch
    const previousHour = getNextHourEpoch() - 7200;

    map.forEach((entry, _key) => {
		if (entry?.timestamp > 0 && checkTimeDifference(previousHour, entry?.timestamp, 3600)) {
			map.delete(entry);
		}
    });

	return map;
}
