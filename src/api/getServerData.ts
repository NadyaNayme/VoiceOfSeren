import { callWithRetry } from "../utility/helpers";
import { getCurrentVos } from "./getCurrentVoice";
import { getLastVos } from "./getLastVoice";

/**
 * Fetches VoS data from the server for both Current and Last hour
 */
export function fetchVos(sessionData, debugMode: boolean) {
    callWithRetry(() => getLastVos(sessionData, debugMode));
    callWithRetry(() => getCurrentVos(sessionData, debugMode));
}
