/** One of the 8 Elven clans as the server expects */
export type ClanString =
    | 'amlodd'
    | 'cadarn'
    | 'crwys'
    | 'hefin'
    | 'iorwerth'
    | 'ithell'
    | 'meilyr'
    | 'trahaearn';

/** One of the 8 Elven clans but capitalized (shocker) used internally by VoS app - `ClanString`
 * is what must be sent to the server and is what will be provided when data is fetched
 */
export type CapitalizedClanString = Capitalize<ClanString>;

/** Aliased type to make TypeDocs slightly more meaningful */
export type UnixEpoch = number;
/** Aliased type to make TypeDocs slightly more meaningful */
export type Second = number;

/** Vote data
 *
 * - timestamp is when the vote occurred
 * - clans is which clans were voted for
 */
export type ClanVote = {
    timestamp: UnixEpoch;
    clans: {
        clan_1: CapitalizedClanString;
        clan_2: CapitalizedClanString;
    };
};
