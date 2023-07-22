import { pool } from "./pool.js";
import { ChatId } from "node-telegram-bot-api";
import { Username, ConversationState, ChatInfo } from "../types.js";

export const chatIdExists = (chat_id: ChatId): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT COUNT(*) as count FROM Chat WHERE id = ?;",
            [chat_id],
            (err, results: { count: number }[]) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                resolve(results[0].count !== 0);
            }
        );
    });
};

export const usernameExists = (username: Username): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT COUNT(*) as count FROM Chat WHERE username = ?;",
            [username],
            (err, results: { count: number }[]) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                const count = results[0].count;
                resolve(count > 0);
            }
        );
    });
};

export const getChatId = (username: Username): Promise<ChatId | undefined> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT id FROM Chat WHERE username = ?;",
            [username.slice(1)],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                resolve(results[0]?.id);
            }
        );
    });
};

type ConversationStateResults = { conversation_state: ConversationState }[];
export const getChatConversationState = (
    chat_id: ChatId
): Promise<ConversationState> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT conversation_state FROM Chat WHERE id = ?;",
            [chat_id],
            (err, results: ConversationStateResults) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                resolve(results[0].conversation_state);
            }
        );
    });
};

export const setChatConversationState = (
    chat_id: ChatId,
    state: ConversationState
): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE Chat SET conversation_state = ? WHERE id = ?;",
            [state, chat_id],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                resolve();
            }
        );
    });
};

export const insertChatInfoIntoDB = async (
    chat: ChatInfo,
    state: ConversationState
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!chat.id && !chat.username) {
            reject(new Error("Either username or chatId should be specified"));
        }

        if (chat.id && (await chatIdExists(chat.id))) return;
        if (chat.username && (await usernameExists(chat.username))) return;

        const { id, username, first_name, last_name } = chat;
        const values = [id, username, first_name, last_name, state];
        const query =
            "INSERT INTO Chat (id, username, first_name, last_name, conversation_state) " +
            "VALUES (?, ?, ?, ?, ?);";

        pool.query(query, values, (err, results) => {
            if (err) {
                console.log("Error executing query: ", err);
                reject(err);
            }
            console.log("Chat added successfully: ", results);
            resolve();
        });
    });
};
