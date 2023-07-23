import { pool } from "./pool.js";
import { ChatId } from "node-telegram-bot-api";
import { Username, ConversationState, UserInfo } from "../types.js";

export const userIdExists = (chat_id: ChatId): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT COUNT(*) as count FROM User WHERE user_id = ?;",
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
            "SELECT COUNT(*) as count FROM User WHERE username = ?;",
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

export const getUserId = (username: Username): Promise<ChatId | undefined> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT user_id FROM User WHERE username = ?;",
            [username.slice(1)],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                resolve(results[0]?.user_id);
            }
        );
    });
};

type ConversationStateResults = { conversation_state: ConversationState }[];
export const getUserConversationState = (
    chat_id: ChatId
): Promise<ConversationState> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT conversation_state FROM User WHERE user_id = ?;",
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

export const setUserConversationState = (
    chat_id: ChatId,
    state: ConversationState
): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE User SET conversation_state = ? WHERE user_id = ?;",
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

export const insertUserInfoIntoDB = async (
    userInfo: UserInfo,
    state: ConversationState
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const { user_id, username, first_name, last_name } = userInfo;

        if (!user_id && !username) {
            reject(new Error("Either username or chatId should be specified"));
        }

        if (user_id && (await userIdExists(user_id))) return;
        if (username && (await usernameExists(username))) return;

        pool.query(
            "INSERT INTO User (user_id, username, first_name, last_name, conversation_state) " +
                "VALUES (?, ?, ?, ?, ?);",
            [user_id, username, first_name, last_name, state],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                console.log("User added successfully: ", results);
                resolve();
            }
        );
    });
};
