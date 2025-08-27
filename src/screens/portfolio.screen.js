import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '▶️ Первый кейс', command: 'case_1' }],
    [{ text: '▶️ Второй кейс', command: 'case_2' }],
    [{ text: '▶️ Третий кейс', command: 'case_3' }],
    [{ text: '❓ Задать вопрос', command: 'ask_question' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const portfolioScreen = async (ctx, editMessage) => {
    const message = 'Примеры работ:';

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
        photoCandidates: ['src/data/portfolio.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
