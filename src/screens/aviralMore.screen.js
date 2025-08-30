import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    //[{ text: '🐦 Twitter', command: 'aviral_twitter' }],
    //[{ text: '❓Обратная связь', command: 'faq' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const aviralMoreScreen = async (ctx, editMessage) => {
    const twitterUrl = process.env.AVIRAL_TWITTER_URL || 'https://twitter.com/';
    const message = 'Описание о проекте AVIRAL.';

    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => {
                if (item.command === 'aviral_twitter') {
                    return { text: item.text, url: twitterUrl };
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
        photoCandidates: [
            'src/data/aviral_more_image.jpg',
            'src/data/screen_name_image.jpg',
        ],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
