import { OrderService } from '../services/Order.service.js';
import { orderCryptoPaymentScreenHandler } from './orderCryptoPayment.screen.js';
import { CryptoPaymentApiService } from '../services/PaymentApi.service.js';
import { GLOBAL_CONFIG } from '../config.js';
import { UserService } from '../services/User.service.js';

export const payCryptoFinalScreen = async (ctx, command) => {
    let isGift;
    let symbol;
    let tariff;

    if (command.split('_')[2] === 'gift') {
        symbol = command.split('_')[3];
        tariff = command.split('_')[4];
        isGift = true;
    } else {
        symbol = command.split('_')[2];
        tariff = command.split('_')[3];
        isGift = false;
    }

    const t = GLOBAL_CONFIG.tariffs[tariff];
    const amountUSDT = t?.usdt ?? 0;

    const user = await new UserService().getUser(ctx.from.id);

    if (user.subscriptionStatus === 'active') {
        await ctx.telegram.sendMessage(
            ctx?.chat?.id,
            `У вас уже есть подписка`,
            {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            },
        );
    } else {
        const order = await new CryptoPaymentApiService().createPayment(
            {
                userId: ctx.from.id,
                amount: amountUSDT,
                payCurrency: symbol,
                tariff,
            },
            isGift,
        );

        if (order?.error !== undefined) {
            await ctx.telegram.sendMessage(ctx?.chat?.id, order.error, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            });
        } else {
            const sentMessage = await orderCryptoPaymentScreenHandler(
                ctx,
                { order, tariff, isGift },
                true,
            );

            order.msgId = sentMessage.message_id;

            await new OrderService().updateOrder(order.orderId, order);
        }
    }
};
