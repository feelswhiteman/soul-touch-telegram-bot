import dotenv from "dotenv";
import mysql from "mysql";
import { ChatId } from "node-telegram-bot-api";
import { ChatInfo, ConversationState, Username } from "./types.js";
dotenv.config();

const pool = mysql.createPool({
    connectionLimit: 10,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
});

export const chatIdExists = (chat_id: ChatId): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT COUNT(*) as count FROM Chat WHERE id = ?",
            [chat_id],
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

export const usernameExists = (username: Username): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT COUNT(*) as count FROM Chat WHERE username = ?",
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
                    console.log("Error executing the query: ", err);
                    reject(err);
                }
                resolve(results[0].conversation_state);
            }
        );
    });
};

type ConversationStatesResults = {
    id: ChatId;
    conversation_state: ConversationState;
}[];

export const getConversationStates = (): Promise<
    Record<ChatId, ConversationState>
> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT id, conversation_state FROM Chat;",
            [],
            (err, results: ConversationStatesResults) => {
                if (err) {
                    console.log("Error executing the query: ", err);
                    reject(err);
                }
                const states: Record<ChatId, ConversationState> = {};
                results.forEach((result) => {
                    states[result.id] = result.conversation_state;
                });
                resolve(states);
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
            (err) => {
                if (err) {
                    console.log("Error executing the query: ", err);
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
            if (err) console.log("Error executing the query: ", err);
            else console.log("Chat added successfully: ", results);
        });
        resolve();
    });
};

export const insertPendingUserIntoDB = async (
    chat: ChatInfo
): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!chat.username && !chat.id) {
            reject(new Error("Either username or chatId should be specified"));
        }
        const { id, username, first_name, last_name } = chat;
        const values = [id, username, first_name, last_name];

        pool.query(
            "INSERT INTO PendingUsers (chat_id, username, first_name, last_name) " +
            "VALUES (?, ?, ?, ?);",
            values,
            (err, results) => {
                if (err) console.log("Error executing the query: ", err);
                else console.log("Chat added successfully: ", results);
            }
        );
        resolve();
    });
};
