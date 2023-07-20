export type ConversationState =
    | "DEFAULT"
    | "AWAITING_PARTNER_INFORMATION"
    | "WAITING_FOR_PARTNER"
    | "WAITING_FOR_CONFIRMATION"
    | "CONNECTED";

export type ConnectionState = "WAITING" | "CONNECTED" | "CANCELED" | "DECLINED" | "CLOSED";

export interface ConnectionTimelog {
    time_requested: Date;
    time_connected: Date;
    time_canceled: Date;
    time_declined: Date;
    time_closed: Date;
}

export interface ChatInfo {
    id?: number | string;
    username?: Username;
    first_name?: string;
    last_name?: string;
}

export type Username = `@${string}`;
export const isUsername = (any: any): any is Username => {
    if (typeof any !== "string")
        return false;
    return any.startsWith("@");
};
