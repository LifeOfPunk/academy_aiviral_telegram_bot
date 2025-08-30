import 'dotenv/config';
import { sendOrEdit } from '../utils/media.js';

const keyboard = [
    [{ text: '🎬 Посмотреть урок', command: 'lesson_link' }],
    [{ text: '⏪ Вернуться назад', command: 'back' }],
];

export const freeLessonScreen = async (ctx, editMessage) => {
    const message = `Поздравляем, ты с нами!🎉

Теперь ты не пропустишь ничего важного из мира нейросетей.
Как и обещали, вот твой подарок. Смотри и применяй!
Нажми "Посмотреть весь урок"🎁`;

    const reply_markup = {
        inline_keyboard: keyboard.map((row) =>
            row.map((item) => {
                if (item.command === 'lesson_link') {
                    return {
                        text: item.text,
                        url: process.env.FREE_LESSON_URL,
                    };
                }
                return {
                    text: item.text,
                    callback_data: JSON.stringify({ command: item.command }),
                };
            }),
        ),
    };

    await sendOrEdit(ctx, {
        editMessage,
        text: message,
        reply_markup,
        photoCandidates: ['src/data/freeLesson.jpg'],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
