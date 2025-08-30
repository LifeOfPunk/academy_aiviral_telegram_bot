import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '🤠 FAQ', command: 'faq' }],
    [{ text: '❓ Задать вопрос менеджеру', command: 'connect' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const faqScreen = async (ctx, editMessage) => {
    const message = `Хочешь связаться с поддежкой? 
Сначала внимательно прочитай FAQ (ответы на часто задаваемые вопросы).

Возможно мы уже ответили на твой вопрос. Если не нашел ответ — пиши, и мы обязательно ответим.`;

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
        //photoCandidates: ['src/data/faq.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
