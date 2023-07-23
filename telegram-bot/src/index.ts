import TelegramBot, { Contact, Message } from "node-telegram-bot-api";
import { ChatId } from "node-telegram-bot-api";
import dotenv from "dotenv";
import Moment from "moment";
import {
    getUserId,
    getUserConversationState,
    setUserConversationState,
    insertUserInfoIntoDB,
} from "./database/User.js";
import {
    deletePendingUser,
    insertPendingUserIntoDB,
    pendingUserExists,
} from "./database/PendingUsers.js";
import {
    insertConnectionIntoDB,
    setConnectionState,
} from "./database/Connections.js";
import { setConnectionTimelog } from "./database/ConnectionTimelog.js";
import {
    UserInfo,
    ConnectionState,
    ConnectionTimelog,
    Username,
    isUsername,
} from "./types.js";

dotenv.config();

const token = process.env.TOKEN || "";
const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const currentState = (await getUserConversationState(chatId)) || "DEFAULT";

    const userInfo: UserInfo = {
        user_id: msg.chat.id,
        first_name: msg.from?.first_name,
        last_name: msg.from?.last_name,
    };
    if (msg.from?.username) userInfo.username = `@${msg.from?.username}`;

    console.log(`From ${chatId}: ${text}\nState: ${currentState}`);
    insertUserInfoIntoDB(userInfo, currentState);

    if (await pendingUserExists(userInfo)) {
        await bot.sendMessage(chatId, "Вас ждут!");
        await deletePendingUser(userInfo);
    }

    if (text === undefined && !msg.contact) {
        await bot.sendMessage(chatId, "Отправьте текстовую команду");
        return;
    }

    if (text === "/cancel") {
        // TODO: On cancel change state in database
        await bot.sendMessage(
            chatId,
            "Привет, я бот для касаний.\n/touch - Прикоснуться к кому-то\n"
        );
        await setUserConversationState(chatId, "DEFAULT");
        return;
    }

    if (text === "/list") {
        // TODO:
        await bot.sendMessage(
            chatId,
            "Список людей, которые хотят прикоснуться к тебе: ",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Google", callback_data: "Google" },
                            { text: "Google", callback_data: "Google" },
                        ],
                        [{ text: "Google", callback_data: "Google" }],
                    ],
                },
            }
        );
    }

    if (currentState === "WAITING_FOR_PARTNER") {
        await bot.sendMessage(
            chatId,
            "Ожидаем партнера... Чтобы прекратить - /cancel"
        );
        return;
    }

    if (text === "/start" || text === "/touch") {
        await handleStartCommand(chatId);
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
});

const handleDefaultState = async (msg: Message) => {
    const text = msg.text;
    const chatId = msg.chat.id;
    if (text === "Приватные касания") {
        await bot.sendMessage(
            chatId,
            "Пришли @username партнера или поделись его контактом"
        );
        await setUserConversationState(chatId, "AWAITING_PARTNER_INFORMATION");
    } else if (text === "ГРУППОВЫЕ КАСАНИЯ") {
        await bot.sendMessage(chatId, "Еще в разработке...");
    } else {
        await bot.sendMessage(chatId, "Выбери варианты из предложенного");
    }
};

const handleStartCommand = async (chatId: ChatId) => {
    setUserConversationState(chatId, "DEFAULT");
    await bot.sendMessage(
        chatId,
        "Приватные касания - укажи человека и мы наладим с ним связь.\nГрупповые касания еще в разработке...",
        {
            reply_markup: {
                keyboard: [
                    [{ text: "Приватные касания" }],
                    [{ text: "ГРУППОВЫЕ КАСАНИЯ" }],
                ],
                resize_keyboard: true,
            },
        }
    );
};

const handleContactOrUsername = async (
    userInfo: UserInfo,
    contactOrUsername: Contact | Username
) => {
    const { user_id, username, first_name, last_name } = userInfo;
    if (!user_id) throw Error("Should be user_id specified");

    const partnerInfo: UserInfo = {};

    if (isUsername(contactOrUsername)) {
        partnerInfo.username = contactOrUsername;
        partnerInfo.user_id = await getUserId(partnerInfo);
    } else {
        const contact = contactOrUsername;
        const { first_name, last_name } = contact;
        partnerInfo.user_id = contact.user_id;
        partnerInfo.first_name = first_name;
        partnerInfo.last_name = last_name;
    }

    setUserConversationState(user_id, "WAITING_FOR_PARTNER");

    if (!partnerInfo.user_id) {
        insertPendingUserIntoDB(partnerInfo);
        await bot.sendMessage(
            user_id,
            "Невозомжно прикоснуться к партнеру.\n" +
                `Пользователь ${
                    partnerInfo.username ?? ""
                } должен начать диалог со мной, чтобы я мог отправлять ему сообщения. Скажите ему об этом`
        );
        setUserConversationState(user_id, "AWAITING_PARTNER_INFORMATION");
    } else {
        setUserConversationState(
            partnerInfo.user_id,
            "WAITING_FOR_CONFIRMATION"
        );
        await bot.sendMessage(user_id, "Ожидаем партнера...");
        bot.sendMessage(
            partnerInfo.user_id,
            `К вам хочет прикоснуться ${
                (username || first_name + " " + last_name) ??
                " неизвестный пользователь"
            }`
        );
        updateConnection(userInfo, partnerInfo, "WAITING", {
            time_requested: Moment().format("YYYY-MM-DD HH:mm:ss"),
        });
    }
};

const handleAwaitingPartnerInformationState = async (msg: Message) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    // TODO: Extract function (msg: Message): ChatInfo
    const userInfo: UserInfo = {
        user_id: msg.chat.id,
        username: `@${msg.from?.username}`,
        first_name: msg.from?.first_name,
        last_name: msg.from?.first_name,
    };

    if (!msg.contact && !isUsername(text)) {
        await bot.sendMessage(
            chatId,
            "Пришли @username партнера или поделись его контактом"
        );
        return;
    }

    if (msg.contact) {
        await handleContactOrUsername(userInfo, msg.contact);
    } else if (isUsername(text)) {
        await handleContactOrUsername(userInfo, text);
    }
};

const updateConnection = async (
    userInfo: UserInfo,
    partnerInfo: UserInfo,
    state: ConnectionState,
    timelog: ConnectionTimelog
) => {
    await insertConnectionIntoDB(userInfo, partnerInfo);
    await setConnectionState(userInfo, partnerInfo, state);
    await setConnectionTimelog(userInfo, partnerInfo, timelog);
    console.log(timelog);
};
