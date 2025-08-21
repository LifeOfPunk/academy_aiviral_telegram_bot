import 'dotenv/config';

export const orderCryptoPaymentScreenHandler = async (ctx, initialState, editMessage) => {
  const { order, month, isGift } = initialState;

  const amountUSD = order?.input?.amountUSD ?? order?.input?.amount ?? '';
  const payCurrency = order?.input?.currency ?? order?.input?.payCurrency ?? '';
  const expires = order?.output?.expiredAt ? new Date(order.output.expiredAt).toLocaleString() : '';

  const possibleUrl = order?.output?.paymentUrl
    || order?.output?.url
    || order?.output?.checkoutUrl
    || order?.output?.redirectUrl
    || order?.output?.returnUrl
    || `https://app.0xprocessing.com/`;

  const message = `✅ Платёж создан\n\n` +
    (amountUSD ? `Сумма: ${amountUSD} USD\n` : '') +
    (payCurrency ? `Валюта: ${payCurrency}\n` : '') +
    (month ? `План: ${month} мес.\n` : '') +
    (isGift ? `Режим: Подарок\n` : '') +
    (expires ? `Ссылка действует до: ${expires}\n\n` : '\n') +
    `Перейдите по ссылке для оплаты.`;

  const reply_markup = {
    inline_keyboard: [
      [ { text: '🔗 Открыть страницу оплаты', url: possibleUrl } ],
      [ { text: '🔄 Проверить оплату', callback_data: JSON.stringify({ command: 'check_is_payment_completed' }) } ],
      [ { text: '⏪ Вернуться назад', callback_data: JSON.stringify({ command: 'back' }) } ],
    ],
  };

  if (!ctx?.chat?.id) return;

  // Always send a new message to reliably get message_id
  return await ctx.telegram.sendMessage(ctx.chat.id, message, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup,
  });
};
