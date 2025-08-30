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
    //[{ text: '❓ Обратная связь', command: 'faq' }],
];

// const userSubMenu = { text: '📚 Subscriber menu', callback_data: JSON.stringify({command: "subscriber_menu"}) };

export const welcomeScreenHandler = async (ctx, editMessage) => {
const message = `<b>Если ты здесь, это не просто так.</b> Ты в нужное время и в нужном месте, на пороге <b>нового мира — мира ИИ</b>.

Мы рады приветствовать тебя в нашей нейро академии! Здесь ты найдёшь не только знания, но и <b>реальные возможности для заработка</b> на нейросетях.

Готов начать? Выбери первое действие ниже 👇
    `;
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
