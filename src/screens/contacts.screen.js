export const contactsScreen = async (ctx, editMessage) => {
  const message = 'Свяжись с нами: https://t.me/aviral_agency';
  const reply_markup = {
    inline_keyboard: [
      [ { text: '⏪ Вернуться назад', callback_data: JSON.stringify({ command: 'back' }) } ],
    ],
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
