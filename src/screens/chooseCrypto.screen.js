import { CHOOSE_CRYPTO, GLOBAL_CONFIG } from '../config.js';
import { sendOrEdit } from '../utils/media.js';

export const chooseCryptoForPayScreenHandler = async (
    ctx,
    initialState,
    editMessage,
) => {
    const supportedCurrency = GLOBAL_CONFIG.supportedCrypto;

    const chooseCryptoForPayScreenKeyboard = Object.keys(supportedCurrency).map(
        (curr) => {
            if (supportedCurrency[curr].length > 1) {
                let command;

                if (initialState.isGift) {
                    command = `choose_chain_crypto_gift_${curr}_${initialState.tariff}`;
                } else {
                    command = `choose_chain_crypto_${curr}_${initialState.tariff}`;
                }

                return [{ text: `✅ ${curr}`, command }];
            } else {
                let command;

                if (initialState.isGift) {
                    command = `pay_crypto_gift_${supportedCurrency[curr][0].processing}_${initialState.tariff}`;
                } else {
                    command = `pay_crypto_${supportedCurrency[curr][0].processing}_${initialState.tariff}`;
                }

                return [{ text: `✅ ${curr}`, command }];
            }
        },
    );

    chooseCryptoForPayScreenKeyboard.push(
        [{ text: '📝 Договор-оферта', url: process.env.FREE_FAQ_URL }],
        [
            {
                text: '📝 Политика конфиденциальности',
                command: 'send_file_personal_policy',
            },
        ],
        [{ text: '❓ Обратная связь', command: 'faq' }],
        [{ text: '⏪ Вернуться назад', command: 'back' }],
    );

    const reply_markup = {
        inline_keyboard: chooseCryptoForPayScreenKeyboard.map((rowItem) =>
            rowItem.map((item) => {
                return {
                    text: item.text,
                    callback_data: JSON.stringify({
                        command: item.command,
                    }),
                };
            }),
        ),
    };

    await sendOrEdit(ctx, {
        editMessage,
        text: CHOOSE_CRYPTO,
        reply_markup,
        photoCandidates: ['src/data/chooseCrypto.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
