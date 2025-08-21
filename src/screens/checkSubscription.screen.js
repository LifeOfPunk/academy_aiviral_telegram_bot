const keyboard = [
  [
    { text: '✅ Подписался', command: 'check_subscription' },
  ],
  [
    { text: '⏪ Вернуться назад', command: 'back' },
  ],
];

export const checkSubscriptionScreen = async (ctx, editMessage) => {
  const message = 'Для получения бесплатного урока необходимо быть подписанным. Нажми кнопку для проверки подписки.';

  const reply_markup = {
    inline_keyboard: keyboard.map((row) =>
      row.map((item) => ({
        text: item.text,
        callback_data: JSON.stringify({ command: item.command }),
      }))
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
