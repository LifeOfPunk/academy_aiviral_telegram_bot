import 'dotenv/config';
import { existsSync } from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const portfolioScreen = async (ctx) => {
    if (!ctx?.chat?.id) return;

    const posts = [
        {
            media: 'src/data/portfolio_1.jpg',
            text: 'Кейс 1: краткое описание работы',
        },
        {
            media: 'src/data/portfolio_2.mp4',
            text: 'Кейс 2: короткое видео (.mp4)',
        },
        {
            media: 'src/data/portfolio_3.mp4',
            text: 'Кейс 3: короткое видео (.mov)',
        },
    ];

    for (let i = 0; i < posts.length; i++) {
        if (i > 0) {
            await sleep(500);
        }

        const { media, text } = posts[i];
        const hasMedia = Boolean(media) && existsSync(media);
        const ext = hasMedia
            ? media.split('.').pop()?.toLowerCase()
            : undefined;
        const isVideo = hasMedia && ['mp4', 'mov', 'm4v'].includes(ext);

        // На последнем посте добавляем кнопку "Вернуться назад"
        const reply_markup =
            i === posts.length - 1
                ? {
                      inline_keyboard: [
                          [
                              {
                                  text: '⏪ Вернуться назад',
                                  callback_data: JSON.stringify({
                                      command: 'back',
                                  }),
                              },
                          ],
                      ],
                  }
                : undefined;

        if (!hasMedia) {
            await ctx.telegram.sendMessage(ctx.chat.id, text, {
                parse_mode: 'HTML',
                reply_markup,
            });
            continue;
        }

        const extraWithCaption = {
            caption: text,
            parse_mode: 'HTML',
            reply_markup,
        };

        if (isVideo) {
            await ctx.telegram.sendVideo(
                ctx.chat.id,
                { source: media },
                extraWithCaption,
            );
        } else {
            await ctx.telegram.sendPhoto(
                ctx.chat.id,
                { source: media },
                extraWithCaption,
            );
        }
    }
};
