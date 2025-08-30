//import { WELCOME_SCREEN_MESSAGE } from '../config.js';
import { sendOrEdit } from '../utils/media.js';

const welcomeUserKeyboardList = [
    [{ text: '🎬 Получить бесплатный урок', command: 'free_lesson_start' }],
    [
        {
            text: '🎁 10 фото промптов ChatGPT',
            command: 'free_prompts_start',
        },
    ],
    [
        {
            text: '😎 Топ 10 бесплатных нейронок',
            command: 'free_ai_start',
        },
    ],
    [{ text: '🎓 Купить доступ в академию', command: 'payment_methods' }],
    [{ text: 'ℹ️ Узнать больше о академии', command: 'about_aviral' }],
    [{ text: '❓ Обратная связь', command: 'faq' }],
];

// const userSubMenu = { text: '📚 Subscriber menu', callback_data: JSON.stringify({command: "subscriber_menu"}) };

export const welcomeScreenHandler = async (ctx, editMessage) => {
const message = '🐯 Что за тигр AIVIRAL?';
    const reply_markup = {
        inline_keyboard: welcomeUserKeyboardList.map((rowItem) =>
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
        text: message,
        reply_markup,
        photoCandidates: ['src/data/welcome.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
