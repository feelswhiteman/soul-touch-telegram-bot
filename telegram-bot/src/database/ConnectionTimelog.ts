import { pool } from "./pool.js";
import { ConnectionTimelog, UserInfo } from "../types.js";
import { getIdFromUser } from "./User.js";

export const setConnectionTimelog = async (
    userInfo: UserInfo,
    partnerInfo: UserInfo,
    timelog: ConnectionTimelog
): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        const {
            time_requested,
            time_connected,
            time_canceled,
            time_declined,
            time_closed,
        } = timelog;

        const userId = await getIdFromUser(userInfo);
        const partnerId = await getIdFromUser(partnerInfo);

        pool.query(
            "UPDATE ConnectionTimelog " +
                "SET " +
                "time_requested = IFNULL(time_requested, ?), " +
                "time_connected = IFNULL(time_connected, ?), " +
                "time_canceled = IFNULL(time_canceled, ?), " +
                "time_declined = IFNULL(time_declined, ?), " +
                "time_closed = IFNULL(time_closed, ?) " +
                "WHERE connection_id = (SELECT MAX(id) FROM Connections WHERE user = ? AND partner = ?);",
            [
                time_requested,
                time_connected,
                time_canceled,
                time_declined,
                time_closed,
                userId,
                partnerId
            ],
            (err, results) => {
                if (err) {
                    console.log("Error executing the query: ", err);
                    reject(err);
                }
                console.log(
                    "Connection timelog updated successfully: ",
                    results
                );
                resolve();
            }
        );
    });
};
