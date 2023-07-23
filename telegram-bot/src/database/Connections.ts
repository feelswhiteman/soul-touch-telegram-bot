import { pool } from "./pool.js";
import { ChatId } from "node-telegram-bot-api";
import { Username, isUsername, ConnectionState, ChatInfo } from "../types.js";

export const connectionExists = async (
    userChatId: ChatId,
    partnerUsernameOrChatId: Username | ChatId,
    state?: ConnectionState
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
            "SELECT COUNT(*) as count FROM Connections WHERE user = ? AND partner = ? " +
                (state ? `AND connection_state = ?;` : ";"),
            [userChatId, partnerChatId || partnerUsername, state],
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

export const insertConnectionIntoDB = async (
    user: ChatId,
    partner: ChatId | Username
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (await connectionExists(user, partner)) resolve();
        pool.query(
            "INSERT INTO Connections (user, partner, connection_state) VALUES (?, ?, ?);",
            [user, partner, "UNDEFINED"],
            async (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                const connectionId = await getLastConnectionId(user, partner);
                await assignConnectionTimelog(connectionId);
                console.log("Connection added successfully");
            }
        );
    });
};

export const getLastConnectionId = async (
    user: ChatId,
    partner: ChatId | Username
): Promise<number> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT MAX(id) as lastId FROM Connections WHERE user = ? AND partner = ?;",
            [user, partner],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                const connectionId = results[0].lastId;
                if (!connectionId) {
                    console.log("Error getting last inserted ID.");
                    reject(new Error("Error getting last inserted ID."));
                }
                resolve(connectionId);
            }
        );
    });
};

export const assignConnectionTimelog = async (
    connectionId: number
): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query(
            "INSERT INTO ConnectionTimelog (connection_id) VALUES(?);",
            [connectionId],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                console.log("ConnectionTimelog added successfully: ", results);
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
            "UPDATE Connections SET connection_state = ? " +
                "WHERE user = ? AND partner = ?",
            [state, user, partner],
            (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                console.log("Connection updated successfully", results);
                resolve();
            }
        );
    });
};

export const getAllConnections = async (): Promise<ChatInfo[]> => {
    return new Promise((resolve, reject) => {

    });
};
