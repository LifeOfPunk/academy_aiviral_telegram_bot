import {WELCOME_SCREEN_MESSAGE} from "../config.js";
import {UserService} from "../services/User.service.js";

const welcomeUserKeyboardList = [
    [
        { text: "📚 Получить бесплатный урок", command: "free_lesson_start" },
    ],
    [
        { text: "🎓 Купить доступ в академию", command: "payment_methods" },
    ],
    [
        { text: "ℹ️ Узнать больше о академии", command: "about_aviral" },
    ],
    [
        { text: "❓ Задать вопрос", command: "ask_question" },
    ],
];

// const userSubMenu = { text: '📚 Subscriber menu', callback_data: JSON.stringify({command: "subscriber_menu"}) };

export const welcomeScreenHandler = async (
    ctx,
    editMessage
) => {
    const reply_markup = {
        inline_keyboard: welcomeUserKeyboardList.map((rowItem) =>
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

    const userData = await new UserService().getUser(ctx.from.id);

    // if (userData !== null && userData?.subscriptions?.mainChannel?.subscriptionStatus === 'active') {
    //     reply_markup.inline_keyboard.unshift([userSubMenu]);
    //     reply_markup.inline_keyboard.splice(1, 1);
    // }

    console.log(userData?.sourceFrom + ' user from')

    if (ctx?.chat?.id !== undefined) {
        if (!editMessage) {
            await ctx.telegram.sendMessage(
                ctx?.chat?.id,
                WELCOME_SCREEN_MESSAGE,
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
                WELCOME_SCREEN_MESSAGE,
                {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup,
                }
            )
        }
    }
};