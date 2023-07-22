import { pool } from "./pool.js";
import { ChatId } from "node-telegram-bot-api";
import { Username, ConnectionTimelog } from "../types.js";

export const setConnectionTimelog = async (
    user: ChatId,
    partner: ChatId | Username,
    timelog: ConnectionTimelog
): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        const {
            time_requested,
            time_connected,
            time_canceled,
            time_declined,
            time_closed,
        } = timelog;
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
                user,
                partner,
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
