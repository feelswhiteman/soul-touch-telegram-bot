import dotenv from "dotenv";
import mysql from "mysql";
import { ChatId } from "node-telegram-bot-api";
import {
    ChatInfo,
    ConnectionState,
    ConversationState,
    Username,
    isUsername,
} from "./types.js";
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
                resolve(results[0].count !== 0);
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
                if (err) reject(err);
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
                if (err) reject(err);
                resolve(results[0].id);
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
                if (err) reject(err);
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
                if (err) reject(err);
                console.log("PendingUser added successfully: ", results);
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
            if (err) reject(err);
            console.log("Chat added successfully: ", results);
            resolve();
        });
    });
};

export const pendingUserExists = async (
    usernameOrChatId: Username | ChatId
): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        let username: Username | undefined;
        let chatId: ChatId | undefined;

        if (isUsername(usernameOrChatId)) {
            username = usernameOrChatId;
        } else {
            chatId = usernameOrChatId;
        }

        pool.query(
            "SELECT COUNT(*) as count FROM PendingUsers WHERE chat_id = ? OR username = ?",
            [chatId, username],
            (err, results: { count: number }[]) => {
                if (err) reject(err);
                resolve(results[0].count !== 0)
            }
        );
    });
};

export const insertPendingUserIntoDB = async (
    chat: ChatInfo
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const { id, username, first_name, last_name } = chat;

        if (!username && !id) {
            reject(new Error("Either username or chatId should be specified"));
        }

        // !username && !id checks if one of this variables is assigned,
        // so (id || username) should be legal, but typescript doesn't think so
        if (!(await pendingUserExists(id || username!))) {
            pool.query(
                "INSERT INTO PendingUsers (chat_id, username, first_name, last_name) " +
                    "VALUES (?, ?, ?, ?);",
                [id, username, first_name, last_name],
                (err, results) => {
                    if (err) reject(err);
                    console.log("PendingUser added successfully: ", results);
                }
            );
            resolve();
        }
    });
};

export const connectionExists = async (
    userChatId: ChatId,
    partnerUsernameOrChatId: Username | ChatId
): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        let partnerUsername: Username | undefined;
        let partnerChatId: ChatId | undefined;

        if (isUsername(partnerUsernameOrChatId)) {
            partnerUsername = partnerUsernameOrChatId;
        } else {
            partnerChatId = partnerUsernameOrChatId;
        }

        pool.query(
            "SELECT COUNT(*) as count FROM Connections WHERE user = ? AND partner = ?",
            [userChatId, partnerChatId || partnerUsername],
            (err, results: { count: number }[]) => {
                if (err) reject(err);
                resolve(results[0].count !== 0);
            }
        );
    });
};

export const insertConnectionIntoDB = async (
    user: ChatId,
    partner: ChatId | Username
): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "INSERT INTO Connections (user, partner)",
            [user, partner],
            (err, results) => {
                if (err) reject(err);
                console.log("Connection added successfully", results);
                resolve();
            }
        );
    });
};

export const setConnectionState = async (
    user: ChatId,
    partner: ChatId | Username,
    state: ConnectionState
): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE Connections SET connection_state = ?" +
                "WHERE user = ? AND partner = ?",
            [state, user, partner],
            (err, results) => {
                if (err) reject(err);
                console.log("Connection updated successfully", results);
                resolve();
            }
        );
    });
};
