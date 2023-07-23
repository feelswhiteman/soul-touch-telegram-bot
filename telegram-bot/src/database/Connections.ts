import { pool } from "./pool.js";
import { ConnectionState, UserInfo } from "../types.js";
import { getIdFromUser } from "./User.js"

export const connectionExists = async (
    userInfo: UserInfo,
    partnerInfo: UserInfo,
    state?: ConnectionState
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const userId = await getIdFromUser(userInfo);
        const partnerId = await getIdFromUser(partnerInfo);

        pool.query(
            "SELECT COUNT(*) as count FROM Connections WHERE user = ? AND partner = ? " +
                (state ? `AND connection_state = ?;` : ";"),
            [userId, partnerId, state],
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
    userInfo: UserInfo,
    partnerInfo: UserInfo
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (await connectionExists(userInfo, partnerInfo)) resolve();

        const userId = await getIdFromUser(userInfo);
        const partnerId = await getIdFromUser(partnerInfo);

        pool.query(
            "INSERT INTO Connections (user, partner, connection_state) VALUES (?, ?, ?);",
            [userId, partnerId, "UNDEFINED"],
            async (err, results) => {
                if (err) {
                    console.log("Error executing query: ", err);
                    reject(err);
                }
                const connectionId = await getLastConnectionId(
                    userInfo,
                    partnerInfo
                );
                await assignConnectionTimelog(connectionId);
                console.log("Connection added successfully");
            }
        );
    });
};

export const getLastConnectionId = async (
    userInfo: UserInfo,
    partnerInfo: UserInfo
): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const userId = await getIdFromUser(userInfo);
        const partnerId = await getIdFromUser(partnerInfo);

        pool.query(
            "SELECT MAX(id) as lastId FROM Connections WHERE user = ? AND partner = ?;",
            [userId, partnerId],
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
    userInfo: UserInfo,
    partnerInfo: UserInfo,
    state: ConnectionState
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const userId = await getIdFromUser(userInfo);
        const partnerId = await getIdFromUser(partnerInfo);

        pool.query(
            "UPDATE Connections SET connection_state = ? " +
                "WHERE user = ? AND partner = ?;",
            [state, userId, partnerId],
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

export const getAllConnections = async (): Promise<UserInfo[]> => {
    return new Promise((resolve, reject) => {});
};
