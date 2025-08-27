import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '✅ Подписался', command: 'check_subscription' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const checkSubscriptionScreen = async (ctx, editMessage) => {
    const message =
        'Для получения бесплатного урока необходимо быть подписанным. Нажми кнопку для проверки подписки.';

    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => ({
                text: item.text,
                callback_data: JSON.stringify({ command: item.command }),
            })),
        ),
    };

    if (!ctx?.chat?.id) return;

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/checkSubscription.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
