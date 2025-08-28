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
                    command: 'check_subscription_free_prompts',
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

export const freePromptsStartScreen = async (ctx, editMessage) => {
    const message = `Хочешь Получить 10 фото промптов ChatGPT? Подпишись на Telegram-канал ниже.
  
Подпишись на наш Telegram-канал, чтобы не пропустить ценную информацию о рынке ИИ.`;

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/freePromptsStart.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
