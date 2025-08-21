import 'dotenv/config';

const keyboard = [
  [ { text: '🤝 Start (49 USDT)', command: 'order_crypto_start' } ],
  [ { text: '😎 Pro (149 USDT)', command: 'order_crypto_pro' } ],
  [ { text: '👑 Premium 249 (USDT)', command: 'order_crypto_premium' } ],
  [ { text: '❓ Задать вопрос', command: 'ask_question' } ],
  [ { text: '⏪ Вернуться назад', command: 'back' } ],
];

export const payCryptoPackagesScreen = async (ctx, editMessage) => {
  const message = `Стоимость с пожизненным доступом:
🤝Start: 49$ (4 250₽)
😎Pro: 149$ (12 930 ₽)
👑Premium: 249$ (21 599 ₽)`;

  const reply_markup = {
    inline_keyboard: keyboard.map((row) =>
      row.map((item) => {
        if (item.command === 'ask_question') {
          return { text: item.text, url: `https://t.me/${process.env.SUPPORT_USERNAME}` };
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
