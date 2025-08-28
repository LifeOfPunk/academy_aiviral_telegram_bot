import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [[{ text: '⏪ Вернуться назад', command: 'back' }]];

export const freePromptsScreen = async (ctx, editMessage) => {
    const message = `🎁 10 фото промптов ChatGPT`;

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
        photoCandidates: ['src/data/freePrompts.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
