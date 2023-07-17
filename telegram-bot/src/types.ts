export type ConversationState =
    | "DEFAULT"
    | "AWAITING_PARTNER_INFORMATION"
    | "WAITING_FOR_PARTNER"
    | "WAITING_FOR_CONFIRMATION"
    | "WAITING_FOR_CONVERSATION_TO_START"
    | "CONNECTED";

export type Username = `@${string}`;

export interface ChatInfo {
    id?: number | string;
    username?: Username;
    first_name?: string;
    last_name?: string;
}

export const isUsername = (str: string): str is Username => {
    return str.startsWith("@");
};
