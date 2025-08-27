import 'dotenv/config';
import {
    ERROR_PAYMENT_IS_LESS_THEN_MINIMUM,
    GLOBAL_CONFIG,
    PAY_ORDER_CRYPTO,
} from '../config.js';
import { sendOrEdit } from '../utils/media.js';

const reply_markup = {
    inline_keyboard: [
        [
            {
                text: '🔄 Проверить оплату',
                callback_data: JSON.stringify({
                    command: 'check_is_payment_completed',
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

export const orderCryptoPaymentScreenHandler = async (
    ctx,
    initialState,
    editMessage,
) => {
    const network = Object.values(GLOBAL_CONFIG.supportedCrypto)
        .flat()
        .find(
            (chainObj) =>
                chainObj.processing === initialState.order.input.currency,
        ).chainName;

    if (
        initialState.order.output.minimumAmount >
        initialState.order.input.amountUSD
    ) {
        await ctx.telegram.sendMessage(
            ctx?.chat?.id,
            ERROR_PAYMENT_IS_LESS_THEN_MINIMUM,
            {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            },
        );
    } else {
        const textOrder = PAY_ORDER_CRYPTO(
            initialState.order.input.amount,
            initialState.order.input.currency,
            network,
            initialState.order.output.address,
            initialState.order.output.destinationTag,
        );

        return await sendOrEdit(ctx, {
            editMessage,
            text: textOrder,
            reply_markup,
            photoCandidates: ['src/data/orderCryptoPayment.jpg'],
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
    }
};
