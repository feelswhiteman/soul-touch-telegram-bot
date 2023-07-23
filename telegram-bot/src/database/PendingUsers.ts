import { pool } from "./pool.js";
import { ChatId } from "node-telegram-bot-api";
import { Username, isUsername, UserInfo } from "../types.js";

export const pendingUserExists = async (
    userInfo: UserInfo
): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const { user_id, username } = userInfo;

        if (!username && !user_id) {
            reject(new Error("Either username or user_id should be specified"));
        }

        pool.query(
            "SELECT COUNT(*) as count FROM PendingUsers WHERE user_id = ? OR username = ?;",
            [user_id, username],
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
    userInfo: UserInfo
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const { user_id, username, first_name, last_name } = userInfo;

        if (!username && !user_id) {
            reject(new Error("Either username or user_id should be specified"));
        }

        if (!(await pendingUserExists({ user_id, username }))) {
            pool.query(
                "INSERT INTO PendingUsers (user_id, username, first_name, last_name) " +
                    "VALUES (?, ?, ?, ?);",
                [user_id, username, first_name, last_name],
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

export const deletePendingUser = async (userInfo: UserInfo): Promise<void> => {
    return new Promise((resolve, reject) => {
        const { user_id, username } = userInfo;
        pool.query(
            "DELETE FROM PendingUsers WHERE user_id = ? OR username = ?;",
            [user_id, username],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                console.log("PendingUser added successfully: ", results);
            }
        );
        resolve();
    });
};