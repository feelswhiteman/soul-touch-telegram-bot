import { pool } from "./pool.js";
import { ChatId } from "node-telegram-bot-api";
import { Username, isUsername, ChatInfo } from "../types.js";

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
            "SELECT COUNT(*) as count FROM PendingUsers WHERE user_id = ? OR username = ?;",
            [chatId, username],
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

export const insertPendingUserIntoDB = async (
    chat: ChatInfo
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const { user_id: id, username, first_name, last_name } = chat;

        if (!username && !id) {
            reject(new Error("Either username or chatId should be specified"));
        }

        // !username && !id checks if one of this variables is assigned,
        // so (id || username) should be legal, but typescript doesn't think so
        if (!(await pendingUserExists(id || username!))) {
            pool.query(
                "INSERT INTO PendingUsers (user_id, username, first_name, last_name) " +
                    "VALUES (?, ?, ?, ?);",
                [id, username, first_name, last_name],
                (err, results) => {
                    if (err) {
                        console.log("Error executing query: ", err);
                        reject(err);
                    }
                    console.log("PendingUser added successfully: ", results);
                }
            );
            resolve();
        }
    });
};
