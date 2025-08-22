import {CHOOSE_CHAIN, ERROR_NO_SUPPORTED_CRYPTO, GLOBAL_CONFIG} from "../config.js";

export const chooseChainForPayScreenHandler = async (ctx, initialState, editMessage) => {
    const supportedCurrency = GLOBAL_CONFIG.supportedCrypto;

    const chosenCurrency = Object.keys(supportedCurrency).find(curr => curr === initialState.symbol);

    if (chosenCurrency !== undefined) {
        const chooseCryptoForPayScreenKeyboard = supportedCurrency[chosenCurrency].map(chainInfo => {
            let command;

            if (initialState.isGift) {
                command = `pay_crypto_gift_${chainInfo.processing}_${initialState.tariff}`;
            } else {
                command = `pay_crypto_${chainInfo.processing}_${initialState.tariff}`;
            }

            return [
                {text: `✅ ${chainInfo.name}`, command, }
            ]
        });

        chooseCryptoForPayScreenKeyboard.push(
            [{ text: '❓ Задать вопрос', command: 'ask_question' }],
            [{ text: "⏪ Вернуться назад", command: 'back' }]
        );

        const reply_markup = {
            inline_keyboard: chooseCryptoForPayScreenKeyboard.map((rowItem) =>
                rowItem.map((item) => {
                    if (item.command === "ask_question") {
                        return {
                            text: item.text,
                            url: `https://t.me/${process.env.SUPPORT_USERNAME}`,
                        }
                    }

                    return {
                        text: item.text,
                        callback_data: JSON.stringify({
                            command: item.command,
                        }),
                    };
                })
            ),
        };

        if (ctx?.chat?.id !== undefined) {
            if (!editMessage) {
                await ctx.telegram.sendMessage(
                    ctx?.chat?.id,
                    CHOOSE_CHAIN,
                    {
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                        reply_markup,
                    });
            } else {
                await ctx.telegram.editMessageText(
                    ctx?.chat?.id,
                    ctx?.callbackQuery?.message?.message_id,
                    undefined,
                    CHOOSE_CHAIN,
                    {
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                        reply_markup,
                    }
                )
            }
        }
    } else {
        await ctx.telegram.sendMessage(ctx?.chat?.id, ERROR_NO_SUPPORTED_CRYPTO, {
            parse_mode: "HTML",
        });
    }
}