import TelegramBot, { Chat, Contact, Message } from "node-telegram-bot-api";
import { ChatId } from "node-telegram-bot-api";
import dotenv from "dotenv";
import Moment from "moment";
import {
    getChatId,
    getChatConversationState,
    setChatConversationState,
    insertChatInfoIntoDB,
    insertPendingUserIntoDB,
    insertConnectionIntoDB,
    setConnectionState,
    setConnectionTimelog,
} from "./database.js";
import {
    ChatInfo,
    ConnectionState,
    ConnectionTimelog,
    Username,
    isUsername,
} from "./types.js";

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
        await handleAwaitingPartnerInformationState(msg);
        return;
    }

    if (currentState === "WAITING_FOR_PARTNER") {
        await bot.sendMessage(chatId, "Ожидаем партнера. Прекратить - /cancel");
        return;
    }
});

const handleDefaultState = async (msg: Message) => {
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
};

const handleStartCommand = async (chatId: ChatId) => {
    setChatConversationState(chatId, "DEFAULT");
    await bot.sendMessage(chatId, "Выбирай", {
        reply_markup: {
            keyboard: [
                [{ text: "Приватные касания" }],
                [{ text: "ГРУППОВЫЕ КАСАНИЯ" }],
            ],
            resize_keyboard: true,
        },
    });
};

const handleContactOrUsername = async (
    msg: Message,
    contactOrUsername: Contact | Username
) => {
    let partnerUsername: Username | undefined;
    let partnerChatId: ChatId | undefined;
    let partnerInfo: ChatInfo | undefined;

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

    setChatConversationState(msg.chat.id, "WAITING_FOR_PARTNER");

    if (!partnerChatId) {
        insertPendingUserIntoDB(partnerInfo ?? { username: partnerUsername });
        await bot.sendMessage(
            msg.chat.id,
            "Ожидаем партнера...\n" +
                `Пользователь ${
                    partnerUsername ?? ""
                } должен начать диалог со мной, чтобы я мог отправлять ему сообщения. Скажите ему об этом`
        );
    } else {
        setChatConversationState(partnerChatId, "WAITING_FOR_CONFIRMATION");
        await bot.sendMessage(msg.chat.id, "Ожидаем партнера...");
        bot.sendMessage(
            partnerChatId,
            `К вам хочет прикоснуться ${
                (msg.chat.username ||
                    msg.chat.first_name + " " + msg.chat.last_name) ??
                " неизвестный пользователь"
            }`
        );
    }
    updateConnection(msg.chat.id, partnerChatId || partnerUsername!, "WAITING", {
        time_requested: Moment().format('YYYY-MM-DD HH:mm:ss'),
    });
};

const handleAwaitingPartnerInformationState = async (msg: Message) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    if (!msg.contact && !isUsername(text)) {
        await bot.sendMessage(
            chatId,
            "Пришли @username партнера или поделись его контактом"
        );
        return;
    }

    if (msg.contact) {
        await handleContactOrUsername(msg, msg.contact);
    } else if (isUsername(text)) {
        await handleContactOrUsername(msg, text);
    }
};

const updateConnection = async (
    user: ChatId,
    partner: ChatId | Username,
    state: ConnectionState,
    timelog: ConnectionTimelog
) => {
    await insertConnectionIntoDB(user, partner);
    await setConnectionState(user, partner, state);
    await setConnectionTimelog(user, partner, timelog);
    console.log(timelog);
};
