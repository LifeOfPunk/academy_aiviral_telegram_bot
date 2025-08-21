import 'dotenv/config';

const keyboard = [
  [ { text: '🐦 Twitter', command: 'aviral_twitter' } ],
  [ { text: '❓ Задать вопрос', command: 'ask_question' } ],
  [ { text: '⏪ Вернуться назад', command: 'back' } ],
];

export const aviralMoreScreen = async (ctx, editMessage) => {
  const twitterUrl = process.env.AVIRAL_TWITTER_URL || 'https://twitter.com/';
  const message = 'Описание о проекте AVIRAL.';

  const reply_markup = {
    inline_keyboard: keyboard.map((row) =>
      row.map((item) => {
        if (item.command === 'ask_question') {
          return { text: item.text, url: `https://t.me/${process.env.SUPPORT_USERNAME}` };
        }
        if (item.command === 'aviral_twitter') {
          return { text: item.text, url: twitterUrl };
        }
        return {
          text: item.text,
          callback_data: JSON.stringify({ command: item.command }),
        };
      })
    ),
  };

  if (!ctx?.chat?.id) return;

  if (!editMessage) {
    await ctx.telegram.sendMessage(ctx.chat.id, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup,
    });
  } else {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      ctx.callbackQuery?.message?.message_id,
      undefined,
      message,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup,
      }
    );
  }
};
