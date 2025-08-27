import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '📖 Подробнее об AVIRAL', command: 'aviral_more' }],
    [{ text: '📂 Примеры работ', command: 'portfolio' }],
    [{ text: '❓ Задать вопрос', command: 'ask_question' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const aboutAviralScreen = async (ctx, editMessage) => {
    const message = 'Кто такие #AVIRAL?';

    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => {
                if (item.command === 'ask_question') {
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

    if (!ctx?.chat?.id) return;

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/aboutAviral.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
