import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    //[{ text: '🔦 Подробнее об AIVIRAL', command: 'aviral_more' }],
    [{ text: '📂 Примеры работ', command: 'portfolio' }],
    [{ text: '🤠 FAQ - Обратная связь', command: 'faq' }],
    //[{ text: '❓ Обратная связь', command: 'faq' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const aboutAviralScreen = async (ctx, editMessage) => {
    const message = '🐯 Что за тигр AIVIRAL?';

    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => {












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
