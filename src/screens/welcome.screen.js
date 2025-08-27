import { WELCOME_SCREEN_MESSAGE } from '../config.js';
import { sendOrEdit } from '../utils/media.js';

const welcomeUserKeyboardList = [
    [{ text: '📚 Получить бесплатный урок', command: 'free_lesson_start' }],
    [{ text: '🎓 Купить доступ в академию', command: 'payment_methods' }],
    [{ text: 'ℹ️ Узнать больше о академии', command: 'about_aviral' }],
    [{ text: '❓ Задать вопрос', command: 'ask_question' }],
];

// const userSubMenu = { text: '📚 Subscriber menu', callback_data: JSON.stringify({command: "subscriber_menu"}) };

export const welcomeScreenHandler = async (ctx, editMessage) => {
    const reply_markup = {
        inline_keyboard: welcomeUserKeyboardList.map((rowItem) =>
            rowItem.map((item) => {
                if (item.command === 'ask_question') {
                    return {
                        text: item.text,
                        url: `https://t.me/${process.env.SUPPORT_USERNAME}`,
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

    await sendOrEdit(ctx, {
        editMessage,
        text: WELCOME_SCREEN_MESSAGE,
        reply_markup,
        photoCandidates: ['src/data/welcome.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
