import TelegramBot, { Chat, Contact, Message } from "node-telegram-bot-api";
import { ChatId } from "node-telegram-bot-api";
import dotenv from "dotenv";
import {
    chatIdExists,
    getChatId,
    getChatConversationState,
    setChatConversationState,
    insertChatInfoIntoDB,
    insertPendingUserIntoDB,
} from "./database.js";
import { ChatInfo, ConversationState, Username, isUsername } from "./types.js";

dotenv.config();

const token = process.env.TOKEN || "";
const bot = new TelegramBot(token, { polling: true });

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
    const text = msg.text;
    const currentState = (await getChatConversationState(chatId)) || "DEFAULT";

    console.log(`From ${chatId}: ${text}\nState: ${currentState}`);
    insertChatInfoIntoDB(chatToChatInfo(msg.chat), currentState);

    if (text === undefined) {
        await bot.sendMessage(chatId, "Отправьте текстовую команду");
        return;
    }

    if (text === "/start") {
        await handleStartCommand(chatId);
        return;
    }

    if (text === "/cancel") {
        await bot.sendMessage(chatId, "Отмена");
        await setChatConversationState(chatId, "DEFAULT");
        return;
    }

    if (currentState === "DEFAULT") {
        await handleDefaultState(msg);
        return;
    }

    if (currentState === "AWAITING_PARTNER_INFORMATION") {
        handleAwaitingPartnerInformationState(msg);
        return;
    }

    if (currentState === "WAITING_FOR_PARTNER") {
        await bot.sendMessage(chatId, "Ожидаем партнера. Прекратить - /cancel");
        return;
    }
});

async function handleDefaultState(msg: Message) {
    const text = msg.text;
    const chatId = msg.chat.id;
    if (text === "Приватные касания") {
        await bot.sendMessage(
            chatId,
            "Пришли @username партнера или поделись его контактом"
        );
        await setChatConversationState(chatId, "AWAITING_PARTNER_INFORMATION");
    } else if (text === "ГРУППОВЫЕ КАСАНИЯ") {
        throw Error("Not implemented yet");
    } else {
        await bot.sendMessage(chatId, "Выбери варианты из предложенного");
    }
}

async function handleStartCommand(chatId: ChatId) {
    await bot.sendMessage(chatId, "Выбирай", {
        reply_markup: {
            keyboard: [
                [{ text: "Приватные касания" }],
                [{ text: "ГРУППОВЫЕ КАСАНИЯ" }],
            ],
            resize_keyboard: true,
        },
    });
    await setChatConversationState(chatId, "DEFAULT");
}

async function handleContactInformation(msg: Message, contact: Contact) {
    const { first_name, last_name } = contact;
    const partnerChatId = contact.user_id ?? "";
    const partnerInfo: ChatInfo = {
        id: partnerChatId,
        first_name,
        last_name,
    };
    if (!(await chatIdExists(partnerChatId))) {
        insertPendingUserIntoDB(partnerInfo);
        await bot.sendMessage(
            msg.chat.id,
            `Пользователь ${
                (first_name ?? "") + " " + (last_name ?? "")
            } должен начать диалог со мной, чтобы я мог отправлять ему сообщения. Скажите ему об этом`
        );
        return;
    }
    await bot.sendMessage(msg.chat.id, "Ожидаем партнера...");
    await bot.sendMessage(
        partnerChatId,
        `К вам хочет прикоснуться ${
            (msg.chat.username ||
                msg.chat.first_name + " " + msg.chat.last_name) ??
            " неизвестный пользователь"
        }`
    );
}

async function handleUsername(msg: Message, username: Username) {
    const partnerChatId = await getChatId(username);

    if (!partnerChatId) {
        insertPendingUserIntoDB({ username: username });
        await bot.sendMessage(
            msg.chat.id,
            `Пользователь ${username} должен начать диалог со мной, чтобы я мог отправлять ему сообщения. Скажите ему об этом`
        );
        return;
    }

    await bot.sendMessage(msg.chat.id, "Ожидаем партнера...");
    await bot.sendMessage(
        partnerChatId,
        `К вам хочет прикоснуться ${
            (msg.chat.username ||
                msg.chat.first_name + " " + msg.chat.last_name) ??
            " неизвестный пользователь"
        }`
    );
    await setChatConversationState(msg.chat.id, "WAITING_FOR_CONFIRMATION");
    await setChatConversationState(partnerChatId, "WAITING_FOR_CONFIRMATION");
}

async function handleAwaitingPartnerInformationState(msg: Message) {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    if (msg.contact) {
        await handleContactInformation(msg, msg.contact);
        await setChatConversationState(chatId, "WAITING_FOR_PARTNER");
    } else if (isUsername(text)) {
        await handleUsername(msg, text);
        await setChatConversationState(chatId, "WAITING_FOR_PARTNER");
    } else {
        await bot.sendMessage(
            chatId,
            "Пришлите @username партнера или поделись его контактом"
        );
        return;
    }
}
