import { MESSAGES, PACKAGES, SUPPORTED_CRYPTO, REFERRAL_ENABLED, REFERRAL_TYPE_KEYBOARD, ABOUT_KEYBOARD } from '../config.js';
import { createCryptoKeyboard, createChainKeyboard, createPaymentCryptoKeyboard, createAfterPaymentKeyboard, createMainMenuKeyboard } from '../screens/keyboards.js';
import { PaymentCryptoService } from '../services/PaymentCrypto.service.js';
import { PaymentFiatService } from '../services/PaymentFiat.service.js';
import { UserService } from '../services/User.service.js';
import { OrderService } from '../services/Order.service.js';
import { ReferralService } from '../services/Referral.service.js';
import { GenerationService } from '../services/Generation.service.js';

const paymentCryptoService = new PaymentCryptoService();
const paymentFiatService = new PaymentFiatService();
const userService = new UserService();
const orderService = new OrderService();
const referralService = new ReferralService();
const generationService = new GenerationService();

// Безопасный ответ на callback query (игнорирует ошибку "query is too old")
async function safeAnswerCbQuery(ctx, text = null) {
    try {
        if (text) {
            await ctx.answerCbQuery(text);
        } else {
            await ctx.answerCbQuery();
        }
    } catch (error) {
        if (error.description && error.description.includes('query is too old')) {
            console.log('⚠️ Query is too old, ignoring...');
        } else {
            console.error('❌ Error in answerCbQuery:', error);
        }
    }
}

// Обработчик "Купить видео"
export async function handleBuy(ctx) {
    try {
        await ctx.answerCbQuery(); // Убираем индикатор загрузки
        // Создаём кнопки для всех пакетов
        const packageButtons = Object.keys(PACKAGES).map(key => {
            const pkg = PACKAGES[key];
            const discount = pkg.discount ? ` 🔥 -${pkg.discount}` : '';
            return [{
                text: `${pkg.emoji} ${pkg.title} - ${pkg.rub}₽${discount}`,
                callback_data: `select_package_${key}`
            }];
        });
        
        await ctx.editMessageText(MESSAGES.CHOOSE_PACKAGE, {
            reply_markup: {
                inline_keyboard: [
                    ...packageButtons,
                    [{ text: '🔙 Назад', callback_data: 'main_menu' }]
                ]
            }
        });
    } catch (err) {
        console.error('❌ Error in handleBuy:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик выбора пакета
export async function handleSelectPackage(ctx, packageKey) {
    try {
        const pkg = PACKAGES[packageKey];
        if (!pkg) {
            return await ctx.answerCbQuery('Пакет не найден', { show_alert: true });
        }
        
        // Сохраняем выбранный пакет в сессии
        ctx.session = ctx.session || {};
        ctx.session.selectedPackage = packageKey;
        
        let message = `${pkg.emoji} ${pkg.title}\n\n`;
        message += `💎 Генераций: ${pkg.generations}\n`;
        message += `💰 Цена: ${pkg.rub}₽ / ${pkg.usdt} USDT\n`;
        if (pkg.discount) {
            message += `🔥 Скидка: ${pkg.discount}\n`;
        }
        const pricePerVideo = (pkg.rub / pkg.generations).toFixed(2);
        message += `\n📊 Цена за 1 видео: ${pricePerVideo}₽\n\n`;
        message += `Выберите способ оплаты:`;
        
        // Формируем кнопки оплаты в зависимости от настроек
        const paymentButtons = [];
        
        if (process.env.CARD_ENABLED === 'true') {
            paymentButtons.push([{ text: '💵 Карта', callback_data: `pay_card_${packageKey}` }]);
        }
        
        if (process.env.CRYPTO_ENABLED === 'true') {
            paymentButtons.push([{ text: '💎 Крипта', callback_data: `pay_crypto_${packageKey}` }]);
        }
        
        if (process.env.STARS_ENABLED === 'true') {
            paymentButtons.push([{ text: '⭐ Stars', callback_data: `pay_stars_${packageKey}` }]);
        }
        
        paymentButtons.push([{ text: '🔙 Назад', callback_data: 'buy' }]);
        
        await ctx.editMessageText(message, {
            reply_markup: {
                inline_keyboard: paymentButtons
            }
        });
    } catch (err) {
        console.error('❌ Error in handleSelectPackage:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик оплаты картой
export async function handlePayCard(ctx, packageKey = 'single') {
    try {
        ctx.session = ctx.session || {};
        ctx.session.waitingFor = 'email';
        ctx.session.selectedPackage = packageKey;
        
        const pkg = PACKAGES[packageKey];
        
        await ctx.editMessageText(
            `💳 Оплата картой\n\n${pkg.emoji} ${pkg.title}: ${pkg.rub}₽\n\n📧 Пожалуйста, введите ваш email для отправки чека:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Назад', callback_data: `select_package_${packageKey}` }]
                    ]
                }
            }
        );
    } catch (err) {
        console.error('❌ Error in handlePayCard:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик оплаты криптой
export async function handlePayCrypto(ctx, packageKey = 'single') {
    try {
        ctx.session = ctx.session || {};
        ctx.session.selectedPackage = packageKey;
        
        const pkg = PACKAGES[packageKey];
        const keyboard = createCryptoKeyboard(packageKey);
        
        await ctx.editMessageText(
            `💎 Оплата криптовалютой\n\n${pkg.emoji} ${pkg.title}: ${pkg.usdt} USDT\n\nВыберите криптовалюту:`,
            { reply_markup: keyboard }
        );
    } catch (err) {
        console.error('❌ Error in handlePayCrypto:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик выбора криптовалюты
export async function handleCryptoSelect(ctx, crypto, packageKey = 'single') {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 [PaymentController] handleCryptoSelect called');
        console.log(`📊 Params: crypto=${crypto}, packageKey=${packageKey}`);
        console.log(`👤 User: ${ctx.from.id} (@${ctx.from.username})`);
        
        const chains = SUPPORTED_CRYPTO[crypto];
        console.log(`🔗 Available chains for ${crypto}:`, chains?.length || 0);
        
        if (!chains || chains.length === 0) {
            console.error(`❌ No chains found for crypto: ${crypto}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return await ctx.answerCbQuery('Эта криптовалюта временно недоступна');
        }
        
        ctx.session = ctx.session || {};
        ctx.session.selectedPackage = packageKey;
        
        const pkg = PACKAGES[packageKey];
        if (!pkg) {
            console.error('❌ Package not found:', packageKey);
            return await ctx.answerCbQuery('Пакет не найден');
        }
        
        const keyboard = createChainKeyboard(crypto, chains, packageKey);
        
        await ctx.editMessageText(
            `${pkg.emoji} ${pkg.title}: ${pkg.usdt} USDT\n\nВыберите сеть для ${crypto}:`,
            { reply_markup: keyboard }
        );
    } catch (err) {
        console.error('❌ Error in handleCryptoSelect:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик выбора сети
export async function handleChainSelect(ctx, crypto, chain, packageKey = 'single') {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 [PaymentController] handleChainSelect called');
        console.log(`📊 Params: crypto=${crypto}, chain=${chain}, packageKey=${packageKey}`);
        console.log(`👤 User: ${ctx.from.id} (@${ctx.from.username})`);
        
        const userId = ctx.from.id;
        const payCurrency = chain.replace(/_/g, ' ');
        const pkg = PACKAGES[packageKey];
        
        console.log('💰 Payment params prepared:');
        console.log(`  - userId: ${userId}`);
        console.log(`  - payCurrency: ${payCurrency}`);
        console.log(`  - amount: ${pkg.usdt} USDT`);
        console.log(`  - package: ${packageKey}`);
        console.log(`  - generations: ${pkg.generations}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('🚀 Calling paymentCryptoService.createPayment...');
        const payment = await paymentCryptoService.createPayment({
            userId,
            amount: pkg.usdt,
            payCurrency,
            package: packageKey
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 Payment service response received');
        console.log(`Response type: ${typeof payment}`);
        console.log(`Has error: ${!!payment.error}`);
        
        if (payment.error) {
            console.error('❌ Payment creation failed with error:', payment.error);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return await ctx.answerCbQuery(payment.error, { show_alert: true });
        }
        
        console.log('✅ Payment created successfully!');
        console.log(`Order ID: ${payment.orderId}`);
        
        // Правильно извлекаем данные
        const address = payment.output.address;
        const amount = payment.input.amount; // Используем input.amount вместо output.amount
        const destinationTag = payment.output.destinationTag;
        
        console.log('✅ Payment created:', { orderId: payment.orderId, address, amount, destinationTag });
        
        let message = `${pkg.emoji} ${pkg.title}\n\n`;
        message += `💎 Отправьте <code>${amount}</code> ${crypto}\n\n`;
        message += `📍 На адрес:\n<code>${address}</code>\n\n`;
        
        if (destinationTag) {
            message += `🏷️ Memo/Tag: <code>${destinationTag}</code>\n⚠️ ТЕГ ОБЯЗАТЕЛЕН!\n\n`;
        }
        
        message += `⏰ У вас есть 30 минут для оплаты\n`;
        message += `💡 Нажмите на адрес, чтобы скопировать`;
        
        const keyboard = createPaymentCryptoKeyboard(payment.orderId);
        
        // ИСПРАВЛЕНО: убираем .inline_keyboard, так как функция уже возвращает правильный объект
        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    } catch (err) {
        console.error('❌ Error in handleChainSelect:', err);
        console.error('Stack:', err.stack);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Проверка статуса платежа
export async function handleCheckPayment(ctx, orderId) {
    try {
        console.log(`🔍 Checking payment status for order: ${orderId}`);
        
        const order = await orderService.getOrderById(orderId);
        
        if (!order) {
            console.log(`❌ Order not found: ${orderId}`);
            return await ctx.answerCbQuery('Заказ не найден', { show_alert: true });
        }
        
        if (order.isPaid) {
            console.log(`✅ Order already paid: ${orderId}`);
            return await ctx.answerCbQuery('Этот заказ уже оплачен!', { show_alert: true });
        }
        
        // Показываем что проверяем
        await ctx.answerCbQuery('⏳ Проверяем транзакцию...');
        
        // Проверяем статус через API 0xProcessing
        console.log(`📡 Checking payment status via API for order: ${orderId}`);
        const result = await paymentCryptoService.checkPaymentStatus(orderId);
        
        if (result.error) {
            console.log(`❌ Error checking payment: ${result.error}`);
            await ctx.reply('❌ Ошибка проверки платежа. Попробуйте позже.');
            return;
        }
        
        if (result.status === 'paid') {
            console.log(`✅ Payment confirmed for order: ${orderId}`);
            
            // Отмечаем заказ как оплаченный
            await orderService.markAsPaid(orderId);
            
            // Добавляем генерации
            const pkg = PACKAGES[order.package];
            await userService.addPaidQuota(order.userId, pkg.generations);
            
            // Обрабатываем кешбэк
            try {
                await referralService.processExpertCashback(order.userId, order.amount);
            } catch (cashbackErr) {
                console.error('⚠️ Cashback error:', cashbackErr.message);
            }
            
            // Уведомляем пользователя
            await ctx.reply(
                `✅ Оплата подтверждена!\n\n` +
                `${pkg.emoji} ${pkg.title}\n` +
                `💎 Добавлено генераций: ${pkg.generations}\n\n` +
                `Теперь вы можете создавать видео!`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎬 Создать видео', callback_data: 'catalog' }],
                            [{ text: '👤 Личный кабинет', callback_data: 'profile' }]
                        ]
                    }
                }
            );
        } else {
            console.log(`⏳ Payment still pending for order: ${orderId}`);
            await ctx.reply(
                '⏳ Платеж ещё не поступил\n\n' +
                'Пожалуйста, подождите несколько минут после отправки транзакции.\n\n' +
                '💡 Обычно подтверждение занимает 1-5 минут.'
            );
        }
        
    } catch (err) {
        console.error('❌ Error in handleCheckPayment:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик успешного платежа (вызывается из webhook)
export async function handlePaymentSuccess(bot, orderId) {
    try {
        const order = await orderService.getOrderById(orderId);
        if (!order) return;
        
        // Отмечаем заказ как оплаченный
        await orderService.markAsPaid(orderId);
        
        // Добавляем генерации пользователю
        const pkg = PACKAGES[order.package];
        await userService.addPaidQuota(order.userId, pkg.generations);
        
        // Обрабатываем реферальный кешбэк для эксперта
        const cashbackResult = await referralService.processExpertCashback(order.userId, order.amount);
        
        // Если был начислен кешбек, уведомляем эксперта
        if (cashbackResult) {
            try {
                await bot.telegram.sendMessage(
                    cashbackResult.expertId,
                    `💰 Новый кешбек!\n\nВаш реферал совершил покупку.\n\n` +
                    `💵 Сумма покупки: ${cashbackResult.originalAmount}₽\n` +
                    `🎁 Ваш кешбек (${cashbackResult.percent}%): ${cashbackResult.amount.toFixed(2)}₽\n\n` +
                    `📊 Общий заработок: ${(await userService.getUser(cashbackResult.expertId))?.totalCashback?.toFixed(2) || 0}₽`
                );
            } catch (notifyErr) {
                console.log(`Failed to notify expert ${cashbackResult.expertId}:`, notifyErr.message);
            }
        }
        
        // Отправляем уведомление пользователю
        const keyboard = createAfterPaymentKeyboard();
        await bot.telegram.sendMessage(
            order.userId,
            MESSAGES.PAYMENT_SUCCESS,
            { reply_markup: keyboard.inline_keyboard }
        );
        
        console.log(`✅ Payment ${orderId} processed successfully`);
    } catch (err) {
        console.error('❌ Error in handlePaymentSuccess:', err);
    }
}

// Обработчик "О проекте"
export async function handleAbout(ctx) {
    try {
        await ctx.editMessageText(MESSAGES.ABOUT, { reply_markup: ABOUT_KEYBOARD });
    } catch (err) {
        console.error('❌ Error in handleAbout:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик реферальной программы
export async function handleReferral(ctx) {
    try {
        if (!REFERRAL_ENABLED) {
            return await ctx.answerCbQuery('⏳ Реферальная программа скоро будет доступна!', { show_alert: true });
        }
        
        await ctx.editMessageText(
            '🎁 Приведи друга за бонус\n\nВыберите тип реферальной ссылки:',
            { reply_markup: REFERRAL_TYPE_KEYBOARD }
        );
    } catch (err) {
        console.error('❌ Error in handleReferral:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик пользовательской реферальной ссылки
export async function handleRefUser(ctx) {
    try {
        const userId = ctx.from.id;
        const botName = process.env.BOT_NAME || 'meemee_bot';
        const refLink = referralService.generateUserReferralLink(userId, botName);
        
        await ctx.editMessageText(
            MESSAGES.REFERRAL_INFO + `\n\n${refLink}`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📤 Поделиться', url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}` }],
                        [{ text: '🔙 Назад', callback_data: 'referral' }]
                    ]
                }
            }
        );
    } catch (err) {
        console.error('❌ Error in handleRefUser:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик экспертной реферальной ссылки
export async function handleRefExpert(ctx) {
    try {
        const userId = ctx.from.id;
        const botName = process.env.BOT_NAME || 'meemee_bot';
        const refLink = referralService.generateExpertReferralLink(userId, botName);
        
        const stats = await referralService.getReferralStats(userId);
        
        // Импортируем процент из конфига
        const { EXPERT_CASHBACK_PERCENT } = await import('../config.js');
        
        let message = MESSAGES.EXPERT_REFERRAL_INFO(EXPERT_CASHBACK_PERCENT) + `\n\n${refLink}\n\n`;
        message += `📊 Статистика:\n`;
        message += `👥 Приглашено: ${stats.expertReferrals}\n`;
        message += `💰 Заработано: ${stats.totalCashback?.toFixed(2) || 0}₽`;
        
        await ctx.editMessageText(
            message,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📤 Поделиться', url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}` }],
                        [{ text: '🔙 Назад', callback_data: 'referral' }]
                    ]
                }
            }
        );
    } catch (err) {
        console.error('❌ Error in handleRefExpert:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик Stars (заглушка)
export async function handlePayStarsSoon(ctx) {
    await ctx.answerCbQuery('⭐ Telegram Stars скоро будут доступны!', { show_alert: true });
}

// Обработчик личного кабинета
export async function handleProfile(ctx) {
    try {
        const userId = ctx.from.id;
        const user = await userService.getUser(userId);
        const generations = await generationService.getUserGenerations(userId);
        const referralStats = await referralService.getReferralStats(userId);
        
        if (!user) {
            return await ctx.answerCbQuery('Ошибка загрузки профиля', { show_alert: true });
        }
        
        const message = MESSAGES.PROFILE(user, generations, referralStats);
        
        await ctx.editMessageText(message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📜 История генераций', callback_data: 'profile_history' }],
                    [{ text: '💳 Купить видео', callback_data: 'buy' }],
                    [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                ]
            }
        });
    } catch (err) {
        console.error('❌ Error in handleProfile:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}

// Обработчик истории генераций
export async function handleProfileHistory(ctx) {
    try {
        const userId = ctx.from.id;
        const generations = await generationService.getUserGenerations(userId);
        
        if (!generations || generations.length === 0) {
            return await ctx.editMessageText(
                '📜 История генераций пуста\n\nВы ещё не создали ни одного видео.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎬 Создать видео', callback_data: 'catalog' }],
                            [{ text: '🔙 Назад', callback_data: 'profile' }]
                        ]
                    }
                }
            );
        }
        
        let message = '📜 История генераций:\n\n';
        
        generations.forEach((gen, idx) => {
            const statusEmoji = gen.status === 'done' ? '✅' : gen.status === 'failed' ? '❌' : gen.status === 'processing' ? '⏳' : '🕐';
            const date = new Date(gen.createdAt).toLocaleString('ru-RU');
            message += `${idx + 1}. ${statusEmoji} ${gen.memeName}\n`;
            message += `   👤 Имя: ${gen.name} (${gen.gender === 'male' ? 'М' : 'Ж'})\n`;
            message += `   📅 ${date}\n`;
            
            if (gen.status === 'failed' && gen.error) {
                message += `   ⚠️ Ошибка: ${gen.error}\n`;
            }
            message += '\n';
        });
        
        // Создаём кнопки для пагинации если много генераций
        const keyboard = {
            inline_keyboard: [
                [{ text: '🔙 Назад в профиль', callback_data: 'profile' }],
                [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
            ]
        };
        
        await ctx.editMessageText(message, { reply_markup: keyboard });
    } catch (err) {
        console.error('❌ Error in handleProfileHistory:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
}
