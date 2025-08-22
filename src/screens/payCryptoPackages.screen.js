import 'dotenv/config';
import { GLOBAL_CONFIG } from '../config.js';

export const payCryptoPackagesScreen = async (ctx, editMessage) => {
  const t = GLOBAL_CONFIG.tariffs;
  const keyboard = [
    [ { text: `🤝 ${t.start.title} (${t.start.usdt} USDT)`, command: 'order_crypto_start' } ],
    [ { text: `😎 ${t.pro.title} (${t.pro.usdt} USDT)`, command: 'order_crypto_pro' } ],
    [ { text: `👑 ${t.premium.title} (${t.premium.usdt} USDT)`, command: 'order_crypto_premium' } ],
    [ { text: '❓ Задать вопрос', command: 'ask_question' } ],
    [ { text: '⏪ Вернуться назад', command: 'back' } ],
  ];

  const message = `Стоимость с пожизненным доступом:
🤝${t.start.title}: ${t.start.usdt}$ (${t.start.rub}₽)
😎${t.pro.title}: ${t.pro.usdt}$ (${t.pro.rub} ₽)
👑${t.premium.title}: ${t.premium.usdt}$ (${t.premium.rub} ₽)`;

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
