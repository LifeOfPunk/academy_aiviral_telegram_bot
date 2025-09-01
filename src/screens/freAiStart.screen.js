import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const channelUrl = process.env.PUBLIC_CHANNEL_THIRD_URL;

const reply_markup = {
    inline_keyboard: [
        [{ text: '✅ Подписаться', url: channelUrl }],
        [
            {
                text: '🔄 Проверить подписку',
                callback_data: JSON.stringify({
                    command: 'check_subscription_free_ai',
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

export const freeAiStartScreen = async (ctx, editMessage) => {
    const message = `🤝 Подпишись на Telegram-канал, чтобы получить <b>Топ 10 бесплатных нейронок</b>.
  
Вместе мы растём быстрее, а ты первым узнаёшь о трендах AI.`;

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/freeAiStart.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
