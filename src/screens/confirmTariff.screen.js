import {GLOBAL_CONFIG, WHAT_TARIFF} from "../config.js";

export const confirmTariffHandler = async (ctx, callback, initialState, editMessage) => {
    const t = GLOBAL_CONFIG.tariffs[initialState.tariff];

    const reply_markup = {
        inline_keyboard: [
            [{ text: "✅ Продолжить",  callback_data: JSON.stringify({command: `${callback}_confirm`}) }],
            [{ text: `❓ Задать вопрос`, url: `https://t.me/${process.env.SUPPORT_USERNAME}`}],
            [{ text: "⏪ Вернуться назад", callback_data: JSON.stringify({command: `back`}) }],
        ]
    };

    const msg = `${t.emoji}Что входит в ${t.title}\n\nСумма к оплате:\n${t.emoji} ${t.title}: ${t.usdt}$ (${t.rub}₽)\n\n${WHAT_TARIFF(initialState.tariff)}`

    if (ctx?.chat?.id !== undefined) {
        if (!editMessage) {
            await ctx.telegram.sendMessage(ctx?.chat?.id, msg, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup,
            });
        } else {
            await ctx.telegram.editMessageText(
                ctx?.chat?.id,
                ctx?.callbackQuery?.message?.message_id,
                undefined,
                msg,
                {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup,
                }
            )
        }
    }
}