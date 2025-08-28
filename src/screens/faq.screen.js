import 'dotenv/config';
import { existsSync } from 'fs';

const reply_markup = {
    inline_keyboard: [
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
    const message = `Самые часто задаваемые вопросы FAQ1
Самые часто задаваемые вопросы FAQ2
Самые часто задаваемые вопросы FAQ3`;

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
