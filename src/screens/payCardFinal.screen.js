import { OrderService } from '../services/Order.service.js';
import { GLOBAL_CONFIG, PAY_BY_CARD_GIVE_LINK } from '../config.js';
import { UserService } from '../services/User.service.js';
import { PaymentFiatServiceClass } from '../services/PaymentFiat.service.js';

export const payCardFinalScreen = async (ctx, command) => {
    let isGift;
    const bankType =
        command.split('_')[1] === 'russian' ? 'BANK131' : 'UNLIMINT';
    const tariff = command.split('_').pop();

    isGift = command.split('_')[3] === 'gift';

    const t = GLOBAL_CONFIG.tariffs[tariff];
    const amount = t?.usdt ?? 0;

    if (amount === 0) {
        await ctx.telegram.editMessageText(
            ctx?.chat?.id,
            ctx?.callbackQuery?.message?.message_id,
            undefined,
            'Ошибка в получении суммы заказа Error: #clb351',
            {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            },
        );

        await ctx.scene.leave();
    }

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
        const order = await new PaymentFiatServiceClass().createNewOrder(
            {
                userId: ctx.from.id,
                email: ctx.scene.session.email,
                amount,
                bank: bankType,
                tariff,
            },
            isGift,
        );

        if (order?.error !== undefined) {
            await ctx.telegram.sendMessage(ctx?.chat?.id, order.error, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            });

            await ctx.scene.leave();
        } else {
            const buttonsWithLink = [
                [{ text: '✅ Оплатить', command: 'payment_link' }],
                [
                    {
                        text: '📝 Договор-оферта',
                        command: 'send_file_offer_agreement',
                    },
                ],
                [
                    {
                        text: '📝 Политика конфиденциальности',
                        command: 'send_file_personal_policy',
                    },
                ],
                [
                    {
                        text: '❓Обратная связь',
                        command: 'faq',
                    },
                ],
                [{ text: '⏪ Вернуться назад', command: 'back' }],
            ];

            const reply_markup = {
                inline_keyboard: buttonsWithLink.map((row) =>
                    row.map((item) => {
                        if (item.command === 'payment_link') {
                            return {
                                text: item.text,
                                url: order.output.paymentUrl,
                            };
                        }

                        return {
                            text: item.text,
                            callback_data: JSON.stringify({
                                command: item.command,
                            }),
                        };
                    }),
                ),
            };

            const sentMessage = await ctx.telegram.editMessageText(
                ctx?.chat?.id,
                ctx?.callbackQuery?.message?.message_id,
                undefined,
                PAY_BY_CARD_GIVE_LINK(
                    tariff,
                    command.split('_')[1] === 'russian',
                ),
                {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup,
                },
            );

            order.msgId = sentMessage?.message_id;

            await new OrderService().updateOrder(order.orderId, order);

            await ctx.scene.leave();
        }
    }
};
