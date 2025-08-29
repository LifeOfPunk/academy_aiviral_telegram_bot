import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

// const channelUrl = process.env.PUBLIC_CHANNEL_URL;

export const notSubscribedScreen = async (ctx, cmdToCheck) => {
    const reply_markup = {
        inline_keyboard: [
            // [{ text: '✅ Подписаться', url: channelUrl }],
            [
                {
                    text: '🔄 Проверить подписку',
                    callback_data: JSON.stringify({
                        command: cmdToCheck,
                    }),
                },
            ],
            [
                {
                    text: '⏪ Вернуться назад',
                    callback_data: JSON.stringify({ command: 'back' }),
                },
            ],
        ],
    };

    await sendOrEdit(ctx, {
        editMessage: false,
        text: `Если хочешь получить подарок, нужно подписаться`,
        reply_markup,
        photoCandidates: ['src/data/notSubscribed.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
