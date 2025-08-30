import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const channelUrl = process.env.PUBLIC_CHANNEL_URL;

const reply_markup = {
    inline_keyboard: [
        [{ text: '✅ Подписаться', url: channelUrl }],
        [
            {
                text: '🔄 Проверить подписку',
                callback_data: JSON.stringify({
                    command: 'check_subscription_free_lesson',
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

export const freeLessonStartScreen = async (ctx, editMessage) => {
    const message = `<b>Чтобы получить бесплатный видеоурок, подпишись на наш Telegram-канал.</b>
  
Так ты не только получишь полезный контент сразу, но и не пропустишь самые свежие новости и тренды ИИ-рынка. Это поможет тебе всегда быть впереди.`;

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/freeLessonStartRemove.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
