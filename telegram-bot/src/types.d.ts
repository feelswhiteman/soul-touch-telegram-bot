export type ConversationState = "DEFAULT" | "AWAITING_USERNAME" | "WAITING_FOR_PARTNER";
export type Username = `@${string}`;

export const isUsername = (str: string): str is Username  => {
    return str.startsWith('@');
}