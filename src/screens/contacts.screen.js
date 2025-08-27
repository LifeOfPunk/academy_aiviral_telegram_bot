import { sendOrEdit } from '../utils/media.js';

export const contactsScreen = async (ctx, editMessage) => {
    const message = 'Свяжись с нами: https://t.me/aviral_agency';
    const reply_markup = {
        inline_keyboard: [
            [
                {
                    text: '⏪ Вернуться назад',
                    callback_data: JSON.stringify({ command: 'back' }),
                },
            ],
        ],
    };

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/contacts.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
