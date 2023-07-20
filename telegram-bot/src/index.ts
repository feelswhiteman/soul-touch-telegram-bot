import TelegramBot, {
    Chat,
    Contact,
    Message,
    User,
} from "node-telegram-bot-api";
import { ChatId } from "node-telegram-bot-api";
import dotenv from "dotenv";
import {
    chatIdExists,
    getChatId,
    getChatConversationState,
    setChatConversationState,
    insertChatInfoIntoDB,
    insertPendingUserIntoDB,
    usernameExists,
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

    if (text === undefined && !msg.contact) {
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

async function handleContactOrUsername(
    msg: Message,
    contactOrUsername: Contact | Username
) {
    let partnerUsername: Username | undefined;
    let partnerChatId: ChatId | undefined;
    let partnerInfo: ChatInfo | undefined;

    // TODO:
    if (isUsername(contactOrUsername)) {
        partnerUsername = contactOrUsername;
        partnerChatId = await getChatId(partnerUsername);
    } else {
        const contact = contactOrUsername;
        const { first_name, last_name } = contact;
        partnerChatId = contact.user_id ?? "";
        partnerInfo = {
            id: partnerChatId,
            first_name,
            last_name,
        };
    }

    if (!partnerChatId) {
        insertPendingUserIntoDB({ username: partnerUsername });
        await bot.sendMessage(
            msg.chat.id,
            "Ожидаем партнера...\n" +
                `Пользователь ${
                    partnerUsername ?? ""
                } должен начать диалог со мной, чтобы я мог отправлять ему сообщения. Скажите ему об этом`
        );
    } else {
        bot.sendMessage(msg.chat.id, "Ожидаем партнера...");
        bot.sendMessage(
            partnerChatId,
            `К вам хочет прикоснуться ${
                (msg.chat.username ||
                    msg.chat.first_name + " " + msg.chat.last_name) ??
                " неизвестный пользователь"
            }`
        );
        setChatConversationState(partnerChatId, "WAITING_FOR_CONFIRMATION");
    }
    setChatConversationState(msg.chat.id, "WAITING_FOR_PARTNER");
}

async function handleAwaitingPartnerInformationState(msg: Message) {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    if (msg.contact) {
        await handleContactOrUsername(msg, msg.contact);
    } else if (isUsername(text)) {
        await handleContactOrUsername(msg, text);
    } else {
        await bot.sendMessage(
            chatId,
            "Пришлите @username партнера или поделись его контактом"
        );
    }
}
