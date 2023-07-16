import TelegramBot from "node-telegram-bot-api";
import { ChatId } from "node-telegram-bot-api";
import dotenv from "dotenv";
import {
    getChatId,
    getChatConversationState,
    insertChatIntoDB,
    setChatConversationState,
} from "./database.js";
import { ConversationState, Username, isUsername } from "./types.js";

dotenv.config();

const token = process.env.TOKEN || "";
const bot = new TelegramBot(token, { polling: true });

const conversationStates: Record<ChatId, ConversationState> = {
    1000000: "DEFAULT",
};

const changeState = async (chat_id: ChatId, state: ConversationState) => {
    await setChatConversationState(chat_id, state);
    conversationStates[chat_id] = state;
};

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const chatUsername =
        "@" + msg.chat.username ||
        (msg.chat?.first_name || "") + " " + (msg.chat?.last_name || "");
    const text = msg.text;
    const currentState =
        conversationStates[chatId] ||
        (await getChatConversationState(chatId)) ||
        "DEFAULT";

    insertChatIntoDB(msg.chat, currentState);

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
        await changeState(chatId, "DEFAULT");
    } else if (text === "/cancel") {
        await bot.sendMessage(chatId, "Отмена");
        await changeState(chatId, "DEFAULT");
    } else if (currentState === "DEFAULT") {
        if (text === "Приватные касания") {
            await bot.sendMessage(chatId, "Пришли @username партнера");
            await changeState(chatId, "AWAITING_USERNAME");
        } else if (text === "ГРУППОВЫЕ КАСАНИЯ") {
            await bot.sendMessage(chatId, "Пришли @username партнера");
            await changeState(chatId, "AWAITING_USERNAME");
        } else {
            await bot.sendMessage(chatId, "Выбери варианты из предложенного");
        }
    } else if (currentState === "AWAITING_USERNAME") {
        if (!isUsername(text)) {
            await bot.sendMessage(chatId, "username должен начинаться с @");
        } else {
            changeState(chatId, "WAITING_FOR_PARTNER");
            const partnerUsername = text;
            const partnerChatId = await getChatId(partnerUsername);

            if (!partnerChatId) {
                await bot.sendMessage(
                    chatId,
                    "Пользователь должен начать диалог со мной, чтобы я мог отправлять ему сообщения. Скажите ему об этом"
                );
            } else {
                await bot.sendMessage(chatId, "Ожидаем партнера...");
                await bot.sendMessage(
                    partnerChatId,
                    `К вам хочет прикоснуться ${chatUsername}`
                );
            }
        }
    }

    console.log(msg.chat.id + ": " + text);
    console.log(conversationStates[chatId]);
});
