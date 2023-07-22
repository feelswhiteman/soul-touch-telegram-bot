import dotenv from "dotenv";
import mysql from "mysql";
dotenv.config();

export const pool = mysql.createPool({
    connectionLimit: 10,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
});
