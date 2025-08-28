import { GLOBAL_CONFIG, WHAT_TARIFF } from '../config.js';
import { sendOrEdit } from '../utils/media.js';

export const confirmTariffHandler = async (
    ctx,
    callback,
    initialState,
    editMessage,
) => {
    const t = GLOBAL_CONFIG.tariffs[initialState.tariff];

    const reply_markup = {
        inline_keyboard: [
            [
                {
                    text: '✅ Продолжить',
                    callback_data: JSON.stringify({
                        command: `${callback}_confirm`,
                    }),
                },
            ],
            [
                {
                    text: `❓ Обратная связь`,
                    callback_data: JSON.stringify({ command: `faq` }),
                },
            ],
            [
                {
                    text: '⏪ Вернуться назад',
                    callback_data: JSON.stringify({ command: `back` }),
                },
            ],
        ],
    };

    const msg = `${t.emoji} Что входит в ${t.title}\n\nСумма к оплате:\n${t.emoji} ${t.title}: ${t.usdt}$ (${t.rub}₽)\n\n${WHAT_TARIFF(initialState.tariff)}`;

    if (ctx?.chat?.id !== undefined) {
        await sendOrEdit(ctx, {
            editMessage,
            text: msg,
            reply_markup,
            photoCandidates: ['src/data/confirmTariff.jpg'],
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
    }
};
