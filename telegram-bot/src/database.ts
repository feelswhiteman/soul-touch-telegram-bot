import dotenv from "dotenv";
import mysql from "mysql";
import { Chat } from "node-telegram-bot-api";
dotenv.config();

const pool = mysql.createPool({
    connectionLimit: 10,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
});

const chatExists = (chat_id: number | string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const query = "SELECT COUNT(*) as count FROM Chat WHERE id = ?";

        pool.query(query, [chat_id], (err, results) => {
            if (err) {
                console.log("Error executing query: ", err);
                reject(err);
            }
            const count = results[0].count;
            resolve(count > 0);
        });
    });
};

export const insertChatIntoDB = async (chat: Readonly<Chat>) => {
    if (await chatExists(chat.id)) return;

    const { id, username, first_name, last_name, bio } = chat;
    const values = [id, username, first_name, last_name, bio];
    const query =
        "INSERT INTO Chat (id, username, first_name, last_name, bio) " +
        "VALUES (?, ?, ?, ?, ?);";

    pool.query(query, values, (err, results) => {
        if (err) console.log("Error executing the query: ", err);
        else console.log("Chat added successfully: ", results);
    });
};
