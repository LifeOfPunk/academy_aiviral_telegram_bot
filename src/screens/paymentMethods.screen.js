import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '💳 Оплатить картой', command: 'pay_card' }],
    [{ text: '💰 Оплатить криптой', command: 'pay_crypto' }],
    [{ text: '❓ Обратная связь', command: 'faq' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const paymentMethodsScreen = async (ctx, editMessage) => {
    const message = `Это твой первый шаг к реальному доходу! 🚀🤑

Мы сделали оплату простой и удобной. Выбери подходящий способ.

Важно: Если находишься в стране с ограничениями, используй VPN.`;

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

    if (!ctx?.chat?.id) return;

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/paymentMethods_REMOVE.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
