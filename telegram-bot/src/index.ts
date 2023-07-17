import TelegramBot, { Chat } from "node-telegram-bot-api";
import { ChatId } from "node-telegram-bot-api";
import dotenv from "dotenv";
import {
    getChatId,
    getChatConversationState,
    insertChatInfoIntoDB,
    setChatConversationState,
    getConversationStates,
} from "./database.js";
import { ChatInfo, ConversationState, Username, isUsername } from "./types.js";

dotenv.config();

const token = process.env.TOKEN || "";
const bot = new TelegramBot(token, { polling: true });

const conversationStates = await getConversationStates();

const changeState = async (chat_id: ChatId, state: ConversationState) => {
    await setChatConversationState(chat_id, state);
    conversationStates[chat_id] = state;
};

const chatToChatInfo = (chat: Chat): ChatInfo => {
    const { id, username, first_name, last_name } = chat;
    const chatInfo: ChatInfo = {
        id,
        first_name,
        last_name,
    };
    if (username) chatInfo.username = `@${username}`;
    return chatInfo;
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

    console.log(msg);
    insertChatInfoIntoDB(chatToChatInfo(msg.chat), currentState);

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
            await bot.sendMessage(
                chatId,
                "Пришли @username партнера или поделись его контактом"
            );
            await changeState(chatId, "AWAITING_PARTNER_INFORMATION");
        } else if (text === "ГРУППОВЫЕ КАСАНИЯ") {
            throw Error("Not implemented yet");
        } else {
            await bot.sendMessage(chatId, "Выбери варианты из предложенного");
        }
    } else if (currentState === "AWAITING_PARTNER_INFORMATION") {
        let partnerChatId: ChatId | undefined;

        if (msg.contact) {
            const { first_name, last_name } = msg.contact;
            const id = msg.contact.user_id ?? " ";
            partnerChatId = id;
            const partnerInfo: ChatInfo = { id, first_name, last_name };
            await changeState(chatId, "WAITING_FOR_PARTNER");
            insertChatInfoIntoDB(partnerInfo, "WAITING_FOR_CONVERSATION_TO_START");
        } else if (isUsername(text)) {
            await changeState(chatId, "WAITING_FOR_PARTNER");
            const partnerUsername = text;
            partnerChatId = await getChatId(partnerUsername);
            if (!partnerChatId)
                insertChatInfoIntoDB(
                    { id: partnerUsername, username: partnerUsername },
                    "WAITING_FOR_CONVERSATION_TO_START"
                );
        } else {
            await bot.sendMessage(
                chatId,
                "Пришлите @username партнера или поделись его контактом"
            );
            return;
        }

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
            await changeState(chatId, "WAITING_FOR_CONFIRMATION");
            await changeState(partnerChatId, "WAITING_FOR_CONFIRMATION");
        }
    } else if (currentState === "WAITING_FOR_PARTNER") {
        await bot.sendMessage(chatId, "Ожидаем партнера. Прекратить - /cancel");
    } else if (currentState === 'WAITING_FOR_CONVERSATION_TO_START') {
        // TODO
        await bot.sendMessage(chatId, "Вас ожидают...");
    }

    console.log(msg.chat.id + ": " + text);
});
