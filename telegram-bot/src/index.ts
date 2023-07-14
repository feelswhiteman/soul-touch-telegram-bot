import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { insertChatIntoDB } from "./database.js";

dotenv.config();

const token = process.env.TOKEN || "";
const bot = new TelegramBot(token, { polling: true });

type ChatId = string | number;
type ConversationState = "DEFAULT" | "AWAITING_USERNAME";

const userStates: Record<ChatId, ConversationState> = {
    1000000: "DEFAULT",
};

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const currentState = userStates[chatId] || "DEFAULT";
    console.log(msg.chat.id + ": " + text);
    insertChatIntoDB(msg.chat);

    if (text === undefined) {
        await bot.sendMessage(chatId, "Отправьте текстовую команду");
        return;
    }

    if (text === "/start") {
        await bot.sendMessage(chatId, "Выбирай", {
            reply_markup: {
                keyboard: [
                    [{ text: "Приватные касания" }],
                    [{ text: "ГРУППОВЫЕ КАСАНИЯ" }],
                ],
                resize_keyboard: true,
            },
        });
    } else if (text === "/cancel") {
        userStates[chatId] = "DEFAULT";
        await bot.sendMessage(chatId, "Отмена");
    } else if (currentState === "DEFAULT") {
        if (text === "Приватные касания") {
            await bot.sendMessage(chatId, "Пришли @username партнера");
            userStates[chatId] = "AWAITING_USERNAME";
        }
    } else if (currentState === "AWAITING_USERNAME") {
        if (text.startsWith("@")) {
            // const username = text.substring(1);
            // bot.getChatMember(chatId, username)
            //     .then((chatMember) => {
            //         if (chatMember.can_send_messages) {
            //             bot.sendMessage(
            //                 chatId,
            //                 `Ожидаем партнера @${username}... `
            //             );
            //             bot.sendMessage(
            //                 username,
            //                 `К вам хочет прикоснуться @${
            //                     msg.from.username || "неизвестный пользователь"
            //                 } `
            //             );
            //         } else {
            //             bot.sendMessage(
            //                 chatId,
            //                 `Ваш партнер должен начать чат с этим ботом, ожидаем...`
            //             );
            //         }
            //     })
            //     .catch((error) => {
            //         bot.sendMessage(
            //             chatId,
            //             `Пользователь с именем @${username} не найден \n ${error}`
            //         );
            //     });
        }
    }
});
