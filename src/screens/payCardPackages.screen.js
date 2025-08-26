import 'dotenv/config';
import { GLOBAL_CONFIG } from '../config.js';

export const payCardPackagesScreen = async (ctx, editMessage) => {
  const t = GLOBAL_CONFIG.tariffs;
  const keyboard = [
    [ { text: `${t.start.emoji} ${t.start.title} (${t.start.rub}₽)`, command: 'order_card_start' } ],
    [ { text: `${t.pro.emoji} ${t.pro.title} (${t.pro.rub}₽)`, command: 'order_card_pro' } ],
    [ { text: `${t.premium.emoji} ${t.premium.title} (${t.premium.rub}₽)`, command: 'order_card_premium' } ],
    [ { text: '❓ Задать вопрос', command: 'ask_question' } ],
    [ { text: '⏪ Вернуться назад', command: 'back' } ],
  ];

  const message = `Стоимость с пожизненным доступом: 
${t.start.emoji} ${t.start.title}: ${t.start.usdt}$ (${t.start.rub}₽)
${t.pro.emoji} ${t.pro.title}: ${t.pro.usdt}$ (${t.pro.rub} ₽)
${t.premium.emoji} ${t.premium.title}: ${t.premium.usdt}$ (${t.premium.rub} ₽)`;

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
