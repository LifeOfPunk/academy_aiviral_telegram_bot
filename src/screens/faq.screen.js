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
    const message = `<b>КАК БЫСТРО Я СМОГУ ОКУПИТЬ ОБУЧЕНИЕ?</b>
Для того, чтобы окупить обучение, тебе нужно сделать одну продажу своих ИИ-услуг, а это совсем не трудно! Ведь мы лично обладаем базой клиентов готовые регулярно платить за ИИ ролики вдобавок мы даем 5 мощных проверенных связок по продажам и поиску клиентов с готовыми скриптами и психологии продаж. Мы не только учим как делать ролики, мы сами являемся продакшн агентством.
    
    <b>У МЕНЯ ЕСТЬ ОСНОВНАЯ РАБОТА, ПОЛУЧИТСЯ ЛИ СОВМЕЩАТЬ?</b>
Давай будем честными. Ты не один такой. Все люди работают, на основной работе, либо совмещают материнство, фриланс или обучение , зарабатывают и развивают блог. Для изучения нейросетей тебе будет достаточно 1-2 часов в неделю. Доступ открыт на 1 месяц, ты можешь пересмотреть записи или перечитать курсы в выходной день.
    `;

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
