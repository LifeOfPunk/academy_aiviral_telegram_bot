import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '😎 Получить 10 нейронок', command: 'ai_link' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const freeAiScreen = async (ctx, editMessage) => {
    const message = `Мы подготовили ТОП-10 бесплатных нейронок 2025 года. Это твой первый шаг к созданию крутого ИИ-контента без вложений.`;

    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => {
                if (item.command === 'ai_link') {
                    return {
                        text: item.text,
                        url: process.env.FREE_AI_URL,
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
        photoCandidates: ['src/data/freeAi.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
