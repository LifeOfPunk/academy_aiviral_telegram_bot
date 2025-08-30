import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '🤠 FAQ', command: 'faq' }],
    [{ text: '❓ Обратная связь', command: 'connect' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const aboutAviralScreen = async (ctx, editMessage) => {
    const message = '🐯 Перед тем, как задавать вопрос, посмотри FAQ! Цени время.';
    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => {
                 if (item.command === 'faq') {
                    return {
                        text: item.text,
                        url: process.env.FREE_FAQ_URL,
                        };
                }
                if (item.command === 'connect') {
                     return {
                         text: item.text,
                         url: `https://t.me/${process.env.SUPPORT_USERNAME}`,
                    };
                }
                return {
                    text: item.text,
                    callback_data: JSON.stringify({ command: item.command }),
                };
            }),
        ),
    };
    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/aboutAviral.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
