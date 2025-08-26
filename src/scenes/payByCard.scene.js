import {Scenes} from "telegraf";
import {
    PAY_BY_CARD_ASK_CARD,
    PAY_BY_CARD_ASK_EMAIL,
    PAY_BY_CARD_ERROR_EMAIL_NOT_CORRECT,
} from "../config.js";
import {message} from "telegraf/filters";
import {welcomeScreenHandler} from "../screens/welcome.screen.js";
import {UserService} from "../services/User.service.js";

const cardType = [
    [
        {
            text: `🇷🇺 Российская карта`,
            command: `pay_russian_card`,
        },
        {
            text: `🌍 Остальные страны`,
            command: `pay_world_card`,
        }
    ],
]

const backButton = [
    [
        {text: '⏪ Вернуться назад', command: 'back' },
    ]
]


export const payByCardScene = new Scenes.BaseScene('payByCardScene');

payByCardScene.enter(async (ctx) => {
    if (!ctx?.from?.username || !ctx?.chat?.id || !ctx?.scene?.state) return;

    //const initialState = ctx.scene.state;

    const reply_markup = {
        inline_keyboard: backButton.map((rowItem) =>
            rowItem.map((item) => {
                const command = item.command;
                return {
                    text: item.text,
                    callback_data: JSON.stringify({
                        command,
                    }),
                }
            })
        ),
    };

    if (!ctx.scene.session) ctx.scene.session = {};

    if (ctx?.callbackQuery?.message?.message_id !== undefined) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            ctx.callbackQuery.message.message_id,
            undefined,
            PAY_BY_CARD_ASK_EMAIL,
            {
                parse_mode: "HTML",
                reply_markup,
            }
        );
        ctx.scene.session.promptMsgId = ctx.callbackQuery.message.message_id;
    } else {
        const sent = await ctx.reply(PAY_BY_CARD_ASK_EMAIL, {
            parse_mode: "HTML",
            reply_markup,
        });
        ctx.scene.session.promptMsgId = sent.message_id;
    }
});

payByCardScene.command('cancel', async (ctx) => {
    await ctx.reply('Операция отменена');
    await ctx.scene.leave();
    await welcomeScreenHandler(ctx, false);
});

payByCardScene.command('start', async (ctx) => {
    await ctx.reply('Операция отменена');
    await ctx.scene.leave();
    await welcomeScreenHandler(ctx, true);
});

payByCardScene.on(message('text'), async (ctx) => {
    const receivedText = ctx.text ?? '';
    const initialState = ctx.scene.state;

    if (!ctx?.scene?.session?.email && ctx?.from?.id) {
        if (/\S+@\S+\.\S+/.test(receivedText)) {
            ctx.scene.session.email = ctx.message.text;
            await new UserService().addEmailToUser(ctx?.from?.id, ctx.message.text);

            const reply_markup = {
                inline_keyboard: cardType.map((rowItem) =>
                    rowItem.map((item) => {
                        let command;


                        if (initialState.isGift) {
                            command = `${item.command}_gift_${initialState.tariff}`;
                        } else {
                            command = `${item.command}_${initialState.tariff}`;
                        }

                        return {
                            text: item.text,
                            callback_data: JSON.stringify({
                                command,
                            }),
                        }
                    })
                ),
            };

            await ctx.reply(PAY_BY_CARD_ASK_CARD, {
                parse_mode: 'HTML',
                reply_markup,
            })
        } else {
            const reply_markup = {
                inline_keyboard: backButton.map((rowItem) =>
                    rowItem.map((item) => {
                        const command = item.command;
                        return {
                            text: item.text,
                            callback_data: JSON.stringify({
                                command,
                            }),
                        }
                    })
                ),
            };

            const msgId = ctx.scene.session?.promptMsgId;
            if (ctx?.chat?.id && msgId) {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    msgId,
                    undefined,
                    PAY_BY_CARD_ERROR_EMAIL_NOT_CORRECT,
                    {
                        parse_mode: "HTML",
                        reply_markup,
                    }
                );
            } else {
                // fallback, если по какой-то причине id не сохранили
                await ctx.reply(PAY_BY_CARD_ERROR_EMAIL_NOT_CORRECT, {
                    parse_mode: "HTML",
                    reply_markup,
                });
            }
        }
    }
});