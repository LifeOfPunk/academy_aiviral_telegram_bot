import 'dotenv/config';

const keyboard = [
  [
    { text: '✅ Подписался', command: 'check_subscription' },
  ],
  [
    { text: '⏪ Вернуться назад', command: 'back' },
  ],
];

export const freeLessonStartScreen = async (ctx, editMessage) => {
  const channelUrl = process.env.PUBLIC_CHANNEL_URL;
  const message = `Хочешь получить бесплатный урок? Подпишись на Telegram-канал ниже.
  
  Подпишись на наш Telegram-канал, чтобы не пропустить ценную информацию о рынке ИИ.
  
  Канал: ${channelUrl}`;

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
