import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [[{ text: '⏪ Вернуться назад', command: 'back' }]];

export const freeAiScreen = async (ctx, editMessage) => {
    const message = `😎 Топ 10 бесплатных нейронок 2025 года подарок текст`;

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
        photoCandidates: ['src/data/freeAi.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
