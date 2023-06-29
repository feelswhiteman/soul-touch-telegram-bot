const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv').config();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
const webAppURL = 'https://google.com'


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        await bot.sendMessage(chatId, "Here's button", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Tap', web_app: { url: webAppURL } }]
                ]
            }
        })
    }

    bot.sendMessage(chatId, 'Received your message');
});
