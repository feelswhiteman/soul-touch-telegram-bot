export type ConversationState =
    | "DEFAULT"
    | "AWAITING_PARTNER_INFORMATION"
    | "WAITING_FOR_PARTNER"
    | "WAITING_FOR_CONFIRMATION"
    | "CONNECTED";

export type ConnectionState =
    | "WAITING"
    | "CONNECTED"
    | "CANCELED"
    | "DECLINED"
    | "CLOSED"
    | "UNDEFINED";

export interface ConnectionTimelog {
    time_requested?: string;
    time_connected?: string;
    time_canceled?: string;
    time_declined?: string;
    time_closed?: string;
}

export interface ChatInfo {
    user_id?: number | string;
    username?: Username;
    first_name?: string;
    last_name?: string;
}

export type Username = `@${string}`;
export const isUsername = (any: any): any is Username => {
    if (typeof any !== "string") return false;
    return any.startsWith("@");
};
