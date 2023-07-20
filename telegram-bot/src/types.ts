export type ConversationState =
    | "DEFAULT"
    | "AWAITING_PARTNER_INFORMATION"
    | "WAITING_FOR_PARTNER"
    | "WAITING_FOR_CONFIRMATION"
    | "CONNECTED";

export type ConnectionState = "WAITING" | "CONNECTED" | "CANCELED" | "DECLINED" | "CLOSED";

export interface ChatInfo {
    id?: number | string;
    username?: Username;
    first_name?: string;
    last_name?: string;
}

export type Username = `@${string}`;
export const isUsername = (str: string): str is Username => {
    return str.startsWith("@");
};
