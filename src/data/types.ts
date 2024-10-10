export type ClanString =
    | 'amlodd'
    | 'cadarn'
    | 'crwys'
    | 'hefin'
    | 'iorwerth'
    | 'ithell'
    | 'meilyr'
    | 'trahaearn';

export type CapitalizedClanString = Capitalize<ClanString>;

export type ClanVote = {
    timestamp: number;
    clans: {
        clan_1: CapitalizedClanString;
        clan_2: CapitalizedClanString;
    };
};
