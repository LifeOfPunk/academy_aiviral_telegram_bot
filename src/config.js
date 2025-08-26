
export const GLOBAL_CONFIG = {
    tariffs: {
        start: { title: 'Start', emoji: `🤝`, usdt: 3, rub: 50, offerIdLavaGift: '8d9bbf4d-ed9e-4836-91d9-122c79da3adc' },
        pro: { title: 'Pro', emoji: `😎`, usdt: 4, rub: 52, offerIdLavaGift: '61001e64-621b-4354-bbe6-3d809c12ac97' },
        premium: { title: 'Premium', emoji: `👑`, usdt: 5, rub: 55, offerIdLavaGift: 'c7186167-2423-46de-81ba-de1c4830563d' },
    },
    admins: [470239748, 892965815],
    supportedCrypto: {
        // BTC: [
        //     { name: 'BTC (BTC)', processing: 'BTC', chainName: 'Bitcoin' },
        //     { name: 'BTCB (BEP20)', processing: 'BTCB (BEP20)', chainName: 'Binance Smart Chain' },
        //     { name: 'WBTC (ARB)', processing: 'WBTC (ARB1)', chainName: 'Arbitrum One' },
        // ],
        // ETH: [
        //     { name: 'ETH (ERC20)', processing: 'ETH', chainName: 'Ethereum Mainnet' },
        //     { name: 'ETH (TRC20)', processing: 'ETH (TRC20)', chainName: 'Tron' },
        //     { name: 'ETH (BEP20)', processing: 'ETH (BEP20)', chainName: 'Binance Smart Chain' },
        //     { name: 'ETH (ARB)', processing: 'ETH (ARB1)', chainName: 'Arbitrum One' },
        //     { name: 'ETH (BASE)', processing: 'ETH (BASE)', chainName: 'Base' },
        // ],
        // TRX: [
        //     { name: 'TRX', processing: 'TRX', chainName: 'Tron' },
        // ],
        USDT: [
            { name: 'USDT (ERC20)', processing: 'USDT (ERC20)', chainName: 'Ethereum Mainnet' },
            { name: 'USDT (TRC20)', processing: 'USDT (TRC20)', chainName: 'Tron' },
            { name: 'USDT (BEP20)', processing: 'USDT (BEP20)', chainName: 'Binance Smart Chain' },
            { name: 'USDT (POLYGON)', processing: 'USDT (POLYGON)', chainName: 'Polygon' },
            { name: 'USDT (ARB)', processing: 'USDT (ARB1)', chainName: 'Arbitrum One' },
            { name: 'USDT (TON)', processing: 'USDT (TON)', chainName: 'TON' },
        ],
        USDC: [
            { name: 'USDC (ERC20)', processing: 'USDC (ERC20)', chainName: 'Ethereum Mainnet' },
            { name: 'USDC (BEP20)', processing: 'USDC (BEP20)', chainName: 'Binance Smart Chain' },
            { name: 'USDC (AVAXC)', processing: 'USDC (AVAXC)', chainName: 'Avalanche' },
            { name: 'USDC (POLYGON)', processing: 'USDC (POLYGON)', chainName: 'Polygon' },
            { name: 'USDC.e (ARB)', processing: 'Bridged USDC (ARB1) (USDC.e)', chainName: 'Arbitrum One' },
            { name: 'USDC (BASE)', processing: 'USDC (BASE)', chainName: 'Base' },
        ],
        TON: [
            { name: 'TON', processing: 'TON', chainName: 'TON' },
        ]
    },
}

export const WHAT_TARIFF = (tariff) => {
    switch (tariff) {
        case ('start'): {
            return `Тариф Start включает в себя доступ в \nобщий чат к базовым урокам, без\nвозможности писать.`;
        }

        case ('pro'): {
            return `Тариф Pro включает в себя доступ в \nобщий чат к базовым урокам, c\nвозможностью писать.`;
        }

        case ('premium'): {
            return `Тариф Pro включает в себя доступ в \nобщий чат к базовым урокам, c\nвозможностью писать.\n\nИ специальный, премиум чат, так же  с возможностью писать`;
        }
    }
}

export const WELCOME_SCREEN_MESSAGE = `Выберите действие:`;

export const PAYMENT_SUCCESSFUL_GIFT = (link) => {
    return `🎉 Покупка успешна!

Спасибо за вашу покупку!

Вот ссылка активации для вашего друга:
${link}

Поделитесь этой ссылкой с вашим другом. После активации он получит доступ к частному каналу Базы данных на выбранный вами период.

💡 Примечание: Ссылка может быть использована только один раз и истечёт, если не будет активирована в течение 30 дней.

Наслаждайтесь обменом знаниями и общением с другими! 😊`
}

export const SUBSCRIPTION_GIFTED = (link) => `🎉 Поздравляем! 🎉  

Вы получили подарочную подписку благодаря другому пользователю, использовавшему промо-код!  

Ваша ссылка-приглашение:
${link}

С этой подпиской у вас теперь есть доступ к эксклюзивному контенту, специальным функциям и яркому сообществу.  

Наслаждайтесь бесплатной подпиской и максимально используйте своё время здесь! Если у вас есть вопросы, обращайтесь в службу поддержки.  

✨ Оставайтесь потрясающими, и добро пожаловать на борт!  
`

export const CHOOSE_CRYPTO = `Выберите удобную криптовалюту для оплаты`;
export const CHOOSE_CHAIN = `Выберите сеть для оплаты`;

export const PAY_ORDER_CRYPTO = (amount, currency, chain, address, destinationTag) => {
    if (destinationTag === null) {
        return `Отправить

<code>${amount}</code> ${currency} в сети ${chain}

На адрес:
<code>${address}</code>

*нажмите на номер кошелька, чтобы скопировать его

У вас есть 30 минут для завершения оплаты, иначе заказ будет отменён.

*Обязательно проверьте адрес кошелька
`
    } else {
        return `Отправить

<code>${amount}</code> ${currency} в сети ${chain} с тегом <code>${destinationTag}</code>

ТЕГ ОБЯЗАТЕЛЕН! Иначе депозит не будет зачислен!

На адрес:
<code>${address}</code>

*нажмите на номер кошелька, чтобы скопировать его

У вас есть 30 минут для завершения оплаты, иначе заказ будет отменён.

*Обязательно проверьте адрес кошелька
`
    }
};

export const SUCCESS_RENEW = `Оплата прошла успешно!
Ваша подписка продлена
`


export const ERROR_NO_SUPPORTED_CRYPTO = `Ошибка! В данный момент нет доступных поддерживаемых криптовалют. Пожалуйста, попробуйте позже.`;
export const ERROR_UNSUCCESSFULL_CHECK = `Пожалуйста, подождите, пока мы подтвердим вашу транзакцию`;
export const ERROR_TEST_OR_PAYMENT_ERROR = `Что-то пошло не так. Пожалуйста, обратитесь в службу поддержки. Ошибка: -10`;
export const ERROR_UNDEFINED_PAYMENT = `Что-то пошло не так. Пожалуйста, обратитесь в службу поддержки. Ошибка: -11`;
export const ERROR_PAYMENT_CANCELLED = (wallet, tariff) => {
    const masked = wallet.length > 8 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet;
    const t = GLOBAL_CONFIG.tariffs[tariff];

    return `Вы не завершили оплату в течении 30 минут.

Не переводите средства по тарифу ${t.title} (${t.usdt} USDT) на кошелек ${masked}
Выберите вместо этого другой способ оплаты.`;
};

export const ERROR_INSUFFICIENT_AMOUNT = `Вы заплатили недостаточную сумму. Пожалуйста, обратитесь в службу поддержки.`;
export const ERROR_PAYMENT_IS_LESS_THEN_MINIMUM = `Сумма оплаты слишком мала для этой сети. Попробуйте другую.`;
export const ERROR_PROMO_ALREADY_USED = `Промо-код уже использован!`;
export const ERROR_PROMO_NOT_FOUND = `Промо-код не найден!`;
export const ERROR_PROMO_UNDEFINED = `Ошибка использования промо-кода. Пожалуйста, обратитесь в службу поддержки. Ошибка: -12`;

export const PAY_BY_CARD_ASK_EMAIL = 'Пожалуйста, отправьте ваш НАСТОЯЩИЙ email:';
export const PAY_BY_CARD_ASK_CARD = 'Какой картой вы хотите оплатить?';

export const PAY_BY_CARD_GIVE_LINK = (tariffKey, isRussianCard = true) => {
    const t = GLOBAL_CONFIG.tariffs[tariffKey];

    return `Сумма к оплате:
${t.emoji} ${t?.title}: ${t?.rub}₽
Проводя оплату вы соглашаетесь с договором-оферта и политикой конфиденциальности

*У вас есть ${isRussianCard ? '1 час' : '15 минут'} для завершения оплаты! Иначе заказ будет отменён.
`;
};

export const PAY_BY_CARD_ERROR_EMAIL_NOT_CORRECT = '❌ Некорректный email. Пожалуйста, попробуйте снова';

export const BACK_BUTTON_TO_WELCOME =  {
    inline_keyboard: [
        [
            {
                text: `🔙 Назад на Главный экран`,
                callback_data: JSON.stringify({
                    command: 'handle_back_welcome',
                })
            },
        ]
    ]
};