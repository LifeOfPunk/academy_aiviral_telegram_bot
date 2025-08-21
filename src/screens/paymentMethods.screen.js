import 'dotenv/config';

const keyboard = [
  [
    { text: '💳 Оплатить картой', command: 'pay_card' },
  ],
  [
    { text: '💰 Оплатить криптой', command: 'pay_crypto' },
  ],
  [
    { text: '❓ Задать вопрос', command: 'ask_question' },
  ],
  [
    { text: '⏪ Вернуться назад', command: 'back' },
  ],
];

export const paymentMethodsScreen = async (ctx, editMessage) => {
  const message = `Выберите удобный способ оплаты
  
* Если вы находитесь в стране с ограниченным доступом, включите VPN.`;

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
