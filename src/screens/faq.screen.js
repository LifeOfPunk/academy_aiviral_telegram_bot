import 'dotenv/config';
import { existsSync } from 'fs';

const reply_markup = {
    inline_keyboard: [
        [
            {
                text: '🤠 FAQ',
                url: process.env.FREE_FAQ_URL,
            },
        ],
        [
            {
                text: '❓ Задать вопрос менеджеру',
                url: `https://t.me/${process.env.SUPPORT_USERNAME}`,
            },
        ],
        [
            {
                text: `⏪ Вернуться назад`,
                callback_data: JSON.stringify({ command: `back` }),
            },
        ],
    ],
};

export const faqScreen = async (ctx) => {
    const message = `Хочешь связаться с поддежкой? 
Сначала внимательно прочитай FAQ (ответы на часто задаваемые вопросы).

Возможно мы уже ответили на твой вопрос. Если не нашел ответ. Пиши и мы обязательно ответим.`;

    const media = 'src/data/faq.jpg';

    const hasMedia = existsSync(media);

    if (hasMedia) {
        await ctx.telegram.sendPhoto(ctx.chat.id, { source: media });
    }

    await ctx.telegram.sendMessage(ctx.chat.id, message, {
        parse_mode: 'HTML',
    
    reply_markup,


    });
};
