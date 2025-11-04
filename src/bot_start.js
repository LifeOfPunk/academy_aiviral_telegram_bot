import 'dotenv/config';
import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { UserService } from './services/User.service.js';
import { OrderService } from './services/Order.service.js';
import { PaymentCryptoService } from './services/PaymentCrypto.service.js';
import { PaymentFiatService } from './services/PaymentFiat.service.js';
import { GenerationService } from './services/Generation.service.js';
import { ReferralService } from './services/Referral.service.js';
import { errorLogger } from './services/ErrorLogger.service.js';
import { MESSAGES, KEYBOARDS, PACKAGES, SUPPORTED_CRYPTO, REFERRAL_ENABLED, REFERRAL_BONUS, EXPERT_CASHBACK_PERCENT } from './config.js';
import { 
    createCatalogKeyboard, 
    createCryptoKeyboard, 
    createChainKeyboard,
    createPaymentCryptoKeyboard,
    createAfterPaymentKeyboard,
    createMainMenuKeyboard
} from './screens/keyboards.js';
import { getMemeById } from './utils/memeLoader.js';

// Проверка токена бота
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found in .env file');
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const userService = new UserService();
const orderService = new OrderService();
const paymentCryptoService = new PaymentCryptoService();
const paymentFiatService = new PaymentFiatService();
const generationService = new GenerationService(bot); // Передаем bot instance
const referralService = new ReferralService();

// Устанавливаем команды меню (кнопка слева от поля ввода)
bot.telegram.setMyCommands([
    { command: 'start', description: 'Главное меню' },
    { command: 'create', description: 'Создать мем' }
]).then(() => {
    console.log('✅ Bot menu commands set');
}).catch(err => {
    console.error('❌ Error setting menu commands:', err);
});

// Session middleware
bot.use(session());

// Helper функция для безопасного answerCbQuery
async function safeAnswerCbQuery(ctx, text = undefined, options = {}) {
    try {
        await ctx.answerCbQuery(text, options);
    } catch (err) {
        // Игнорируем ошибки timeout и invalid query ID
        if (err.message.includes('query is too old') || err.message.includes('query ID is invalid')) {
            console.log('⚠️ Callback query expired, ignoring');
        } else {
            console.error('❌ Error in answerCbQuery:', err.message);
        }
    }
}

// Middleware для логирования
bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`⏱️ Response time: ${ms}ms`);
});

// Обработка команды /start
bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id;
        const startPayload = ctx.startPayload;

        // Создание пользователя (перед обработкой реферала)
        const existingUser = await userService.getUser(userId);
        await userService.createUser(ctx.from, startPayload);
        const isNewUser = !existingUser;

        let showWelcome = true;

        // Обработка реферальных ссылок (только для новых пользователей)
        if (startPayload && isNewUser) {
            if (startPayload.startsWith('ref_')) {
                const referrerId = parseInt(startPayload.replace('ref_', ''));
                const success = await referralService.processUserReferral(referrerId, userId);
                
                if (success) {
                    // Уведомляем нового пользователя о бонусе
                    await ctx.reply(
                        `🎉 Добро пожаловать!\n\nВы получили +${REFERRAL_BONUS} бесплатную генерацию за переход по реферальной ссылке!`
                    );
                    showWelcome = false;
                    
                    // Уведомляем реферера
                    try {
                        await bot.telegram.sendMessage(
                            referrerId,
                            `🎉 По вашей ссылке зарегистрировался новый пользователь!\n\n+${REFERRAL_BONUS} бесплатная генерация добавлена на ваш баланс!`
                        );
                    } catch (notifyErr) {
                        console.log(`Failed to notify referrer ${referrerId}:`, notifyErr.message);
                    }
                }
            } else if (startPayload.startsWith('expert_')) {
                const expertId = parseInt(startPayload.replace('expert_', ''));
                const success = await referralService.processExpertReferral(expertId, userId);
                
                if (success) {
                    // Уведомляем эксперта
                    try {
                        await bot.telegram.sendMessage(
                            expertId,
                            `💼 По вашей экспертной ссылке зарегистрировался новый пользователь!\n\n💰 Вы будете получать ${EXPERT_CASHBACK_PERCENT}% с каждой его оплаты!`
                        );
                    } catch (notifyErr) {
                        console.log(`Failed to notify expert ${expertId}:`, notifyErr.message);
                    }
                }
            }
        }

        // Отправка приветственного сообщения
        if (showWelcome) {
            const mainMenu = await createMainMenuKeyboard(userId);
            await ctx.reply(MESSAGES.WELCOME, { 
                reply_markup: mainMenu
            });
        } else {
            // Если уже отправили уведомление о реферале, просто отправляем меню
            const mainMenu = await createMainMenuKeyboard(userId);
            await ctx.reply('Выберите действие:', { 
                reply_markup: mainMenu
            });
        }
    } catch (err) {
        console.error('❌ Error in /start:', err);
        
        // Логируем ошибку
        const errorData = await errorLogger.logError({
            message: err.message,
            stack: err.stack,
            name: err.name || 'StartCommandError',
            source: 'Bot Start Command'
        });
        
        await ctx.reply(`❌ Произошла ошибка номер ${errorData.id}. Обратитесь к менеджеру @aiviral_manager с номером ошибки.`);
    }
});

// Обработка команды /create (Создать мем)
bot.command('create', async (ctx) => {
    try {
        const keyboard = createCatalogKeyboard();
        await ctx.reply(MESSAGES.MEMES_CATALOG, { 
            reply_markup: keyboard
        });
    } catch (err) {
        console.error('❌ Error in /create:', err);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка главного меню
bot.action('main_menu', async (ctx) => {
    try {
        await safeAnswerCbQuery(ctx); // Убираем индикатор загрузки
        const userId = ctx.from.id;
        const mainMenu = await createMainMenuKeyboard(userId);
        await ctx.editMessageText(MESSAGES.WELCOME, { reply_markup: mainMenu });
    } catch (err) {
        await safeAnswerCbQuery(ctx);
        const userId = ctx.from.id;
        const mainMenu = await createMainMenuKeyboard(userId);
        await ctx.reply(MESSAGES.WELCOME, { reply_markup: mainMenu });
    }
});

// ЗАКОММЕНТИРОВАНО: Обработка кнопки "Использовать бесплатную генерацию"
// bot.action('use_free_generation', async (ctx) => {
//     try {
//         const userId = ctx.from.id;
//         const user = await userService.getUser(userId);
//         
//         // Проверяем, есть ли бесплатные генерации
//         if (!user || user.free_quota <= 0) {
//             await ctx.answerCbQuery('❌ У вас нет бесплатных генераций', { show_alert: true });
//             return;
//         }
//         
//         // Запрашиваем промпт для генерации
//         ctx.session = ctx.session || {};
//         ctx.session.waitingFor = 'free_prompt';
//         
//         await ctx.editMessageText(
//             `🎁 *Бесплатная генерация видео*\n\n` +
//             `📝 Опишите видео, которое хотите создать.\n\n` +
//             `*Примеры:*\n` +
//             `• Создай короткое видео с закатом на море\n` +
//             `• Мальчик танцует на улице\n` +
//             `• Кот играет с мячиком в саду\n\n` +
//             `Введите ваш промпт:`,
//             { 
//                 parse_mode: 'Markdown',
//                 reply_markup: {
//                     inline_keyboard: [
//                         [{ text: '🔙 Назад', callback_data: 'main_menu' }]
//                     ]
//                 }
//             }
//         );
//     } catch (err) {
//         console.error('❌ Error in use_free_generation:', err);
//         await ctx.answerCbQuery('Произошла ошибка');
//     }
// });

// Обработка каталога мемов
bot.action(/catalog.*/, async (ctx) => {
    try {
        await safeAnswerCbQuery(ctx); // Убираем индикатор загрузки
        const callbackData = ctx.callbackQuery.data;
        let page = 0;
        
        if (callbackData.includes('catalog_page_')) {
            page = parseInt(callbackData.replace('catalog_page_', ''));
        }
        
        const keyboard = createCatalogKeyboard(page);
        await ctx.editMessageText(MESSAGES.MEMES_CATALOG, { reply_markup: keyboard });
    } catch (err) {
        console.error('❌ Error in catalog:', err);
        await safeAnswerCbQuery(ctx, 'Произошла ошибка');
    }
});

// Обработка выбора мема
bot.action(/meme_(.+)/, async (ctx) => {
    try {
        const memeId = ctx.match[1];
        const meme = getMemeById(memeId);
        
        if (!meme) {
            return await safeAnswerCbQuery(ctx, 'Мем не найден', { show_alert: true });
        }
        
        if (meme.status === 'soon') {
            return await safeAnswerCbQuery(ctx, MESSAGES.MEME_SOON, { show_alert: true });
        }
        
        await safeAnswerCbQuery(ctx); // Убираем индикатор загрузки
        
        // Проверяем квоту
        const userId = ctx.from.id;
        const hasQuota = await userService.hasQuota(userId);
        
        if (!hasQuota) {
            await ctx.editMessageText(MESSAGES.NO_QUOTA, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💳 Купить видео', callback_data: 'buy' }],
                        [{ text: '🔙 Назад', callback_data: 'catalog' }]
                    ]
                }
            });
            return;
        }
        
        // Сохраняем выбранный мем в контексте (для дальнейших шагов)
        ctx.session = ctx.session || {};
        ctx.session.selectedMeme = memeId;
        
        // Запрашиваем имя
        await ctx.editMessageText(MESSAGES.ENTER_NAME, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад', callback_data: 'catalog' }]
                ]
            }
        });
        
        // Устанавливаем флаг ожидания ввода имени
        ctx.session.waitingFor = 'name';
        ctx.session.memeId = memeId;
        
    } catch (err) {
        console.error('❌ Error selecting meme:', err);
        await safeAnswerCbQuery(ctx, 'Произошла ошибка');
    }
});

// Обработка текстовых сообщений (ввод имени)
bot.on('text', async (ctx) => {
    try {
        ctx.session = ctx.session || {};
        
        if (ctx.session.waitingFor === 'free_prompt') {
            const prompt = ctx.message.text.trim();
            
            // Валидация промпта
            if (prompt.length < 10) {
                return await ctx.reply('❌ Промпт слишком короткий. Опишите подробнее (минимум 10 символов).');
            }
            
            if (prompt.length > 500) {
                return await ctx.reply('❌ Промпт слишком длинный. Максимум 500 символов.');
            }
            
            // Проверка на спам и запрещённые слова
            const badWords = [
                'хуй', 'пизд', 'ебл', 'ебан', 'ебат', 'бля', 'сука', 'уеб', 
                'мудак', 'мудил', 'гандон', 'педик', 'пидор', 'хер', 'манда',
                'шлюха', 'блядь', 'ублюдок', 'долбоеб', 'говно', 'жопа',
                'fuck', 'shit', 'bitch', 'ass', 'dick', 'cunt', 'whore'
            ];
            const hasBadWords = badWords.some(word => prompt.toLowerCase().includes(word));
            
            if (hasBadWords) {
                return await ctx.reply('❌ Пожалуйста, используйте корректное описание без оскорблений.');
            }
            
            const userId = ctx.from.id;
            
            // Списываем квоту
            const deducted = await userService.deductQuota(userId);
            if (!deducted) {
                return await ctx.reply('❌ Недостаточно бесплатных генераций');
            }
            
            // Создаём генерацию с пользовательским промптом
            const generation = await generationService.createGeneration({
                userId,
                chatId: ctx.chat.id, // Добавляем chatId для уведомлений
                memeId: 'custom',
                name: 'Custom',
                gender: 'male',
                customPrompt: prompt
            });
            
            if (generation.error) {
                // Возвращаем квоту при ошибке
                await userService.refundQuota(userId);
                return await ctx.reply('❌ Ошибка создания генерации: ' + generation.error);
            }
            
            await ctx.reply(MESSAGES.GENERATION_STARTED);
            
            // Ожидаем завершения генерации
            await waitForGeneration(ctx, generation.generationId);
            
            // Очищаем сессию
            delete ctx.session.waitingFor;
            
        } else if (ctx.session.waitingFor === 'name') {
            const name = ctx.message.text.trim();
            
            // Валидация имени
            if (name.length < 2 || name.length > 30) {
                return await ctx.reply('❌ Имя должно быть от 2 до 30 символов. Попробуйте ещё раз.');
            }
            
            // Проверка на маты и запрещённые слова
            const badWords = [
                'хуй', 'пизд', 'ебл', 'ебан', 'ебат', 'бля', 'сука', 'уеб', 
                'мудак', 'мудил', 'гандон', 'педик', 'пидор', 'хер', 'манда',
                'шлюха', 'блядь', 'ублюдок', 'долбоеб', 'говно', 'жопа',
                'fuck', 'shit', 'bitch', 'ass', 'dick', 'cunt', 'whore'
            ];
            const hasBadWords = badWords.some(word => name.toLowerCase().includes(word));
            
            if (hasBadWords) {
                return await ctx.reply('❌ Пожалуйста, используйте корректное имя без оскорблений.');
            }
            
            // Сохраняем имя и запрашиваем пол
            ctx.session.generationName = name;
            ctx.session.waitingFor = 'gender';
            
            await ctx.reply(MESSAGES.CHOOSE_GENDER, { reply_markup: KEYBOARDS.GENDER_CHOICE });
            
        } else if (ctx.session.waitingFor === 'email') {
            // Обработка ввода email для оплаты картой
            const email = ctx.message.text.trim();
            
            // Простая валидация email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return await ctx.reply('❌ Некорректный email. Попробуйте ещё раз.');
            }
            
            const packageKey = ctx.session.selectedPackage || 'single';
            const pkg = PACKAGES[packageKey];
            
            ctx.session.email = email;
            delete ctx.session.waitingFor;
            
            // Создаём платёж через Lava
            const payment = await paymentFiatService.createPayment({
                userId: ctx.from.id,
                email: email,
                amount: pkg.rub,
                bank: 'BANK131',
                package: packageKey
            });
            
            if (payment.error) {
                return await ctx.reply('❌ Ошибка создания платежа: ' + payment.error);
            }
            
            await ctx.reply(
                `💳 Оплата картой\n\n${pkg.emoji} ${pkg.title}\nСумма: ${pkg.rub}₽\n\nУ вас есть 1 час для завершения оплаты!`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💳 Перейти к оплате', url: payment.output.paymentUrl }],
                            [{ text: '🔙 Назад', callback_data: 'buy' }]
                        ]
                    }
                }
            );
        }
    } catch (err) {
        console.error('❌ Error in text handler:', err);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка выбора пола
bot.action(/gender_(male|female)/, async (ctx) => {
    try {
        ctx.session = ctx.session || {};
        const gender = ctx.match[1];
        ctx.session.generationGender = gender;
        
        const name = ctx.session.generationName;
        const genderText = gender === 'male' ? 'Мальчик' : 'Девочка';
        
        await ctx.editMessageText(
            MESSAGES.CONFIRM_GENERATION(name, gender),
            { reply_markup: KEYBOARDS.CONFIRM_GENERATION }
        );
    } catch (err) {
        console.error('❌ Error in gender selection:', err);
        await safeAnswerCbQuery(ctx, 'Произошла ошибка');
    }
});

// Подтверждение генерации
bot.action('confirm_gen', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const memeId = ctx.session.memeId;
        const name = ctx.session.generationName;
        const gender = ctx.session.generationGender;
        
        // Списываем квоту
        const deducted = await userService.deductQuota(userId);
        if (!deducted) {
            return await safeAnswerCbQuery(ctx, 'Недостаточно генераций', { show_alert: true });
        }
        
        // Создаём генерацию
        const generation = await generationService.createGeneration({
            userId,
            chatId: ctx.chat.id, // Добавляем chatId для уведомлений
            memeId,
            name,
            gender
        });
        
        if (generation.error) {
            // Возвращаем квоту при ошибке
            await userService.refundQuota(userId);
            return await safeAnswerCbQuery(ctx, 'Ошибка создания генерации', { show_alert: true });
        }
        
        await ctx.editMessageText(MESSAGES.GENERATION_STARTED);
        
        // Ожидаем завершения генерации
        await waitForGeneration(ctx, generation.generationId);
        
        // Очищаем сессию
        delete ctx.session.memeId;
        delete ctx.session.generationName;
        delete ctx.session.generationGender;
        delete ctx.session.waitingFor;
        
    } catch (err) {
        console.error('❌ Error confirming generation:', err);
        await ctx.answerCbQuery('Произошла ошибка');
    }
});

// Функция быстрой проверки статуса генерации
async function waitForGeneration(ctx, generationId, quickCheckAttempts = 10) {
    // Делаем быструю проверку в течение 30 секунд (10 попыток по 3 секунды)
    // Если видео готово быстро - отправляем сразу
    // Иначе сообщаем что видео придет позже автоматически
    
    for (let i = 0; i < quickCheckAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Проверяем каждые 3 секунды
        
        const generation = await generationService.getGeneration(generationId);
        
        if (generation.status === 'done' && generation.videoUrl) {
            // Увеличиваем счетчик успешных генераций
            const user = await userService.getUser(ctx.from.id);
            if (user) {
                await userService.updateUser(ctx.from.id, {
                    successful_generations: (user.successful_generations || 0) + 1
                });
            }
            
            try {
                await ctx.replyWithVideo(
                    { url: generation.videoUrl },
                    { 
                        caption: '✅ Ваше видео готово!\n\n🎬 Генерация успешно завершена!',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🎬 Создать ещё', callback_data: 'catalog' }],
                                [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            } catch (err) {
                await ctx.reply(
                    '✅ Ваше видео готово!\n\n🎬 Генерация успешно завершена!\n\n' +
                    '🔗 Ссылка на видео: ' + generation.videoUrl,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🎬 Создать ещё', callback_data: 'catalog' }],
                                [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            }
            return;
        } else if (generation.status === 'failed') {
            // Возвращаем квоту
            await userService.refundQuota(ctx.from.id);
            
            // Увеличиваем счетчик ошибок
            const user = await userService.getUser(ctx.from.id);
            if (user) {
                await userService.updateUser(ctx.from.id, {
                    failed_generations: (user.failed_generations || 0) + 1
                });
            }
            
            const errorId = generation.errorId || 'UNKNOWN';
            await ctx.reply(
                '❌ К сожалению, не удалось создать видео.\n\n' +
                `Ошибка номер ${errorId}. Обратитесь к менеджеру @aiviral_manager с номером ошибки.\n\n` +
                '💰 Ваша генерация возвращена на баланс.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 Попробовать снова', callback_data: 'catalog' }],
                            [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                        ]
                    }
                }
            );
            return;
        }
    }
    
    // Если за 30 секунд видео не готово - сообщаем что оно придет автоматически
    await ctx.reply(
        '⏳ Ваше видео генерируется!\n\n' +
        '🎬 Генерация займет 1-3 минуты. Мы автоматически отправим вам видео, когда оно будет готово.\n\n' +
        '✨ Вы можете продолжать пользоваться ботом!',
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎬 Создать ещё', callback_data: 'catalog' }],
                    [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                ]
            }
        }
    );
}

// Импорт контроллеров платежей
import * as paymentController from './controllers/paymentController.js';

// Обработка кнопки "Купить видео"
bot.action('buy', (ctx) => paymentController.handleBuy(ctx));

// Обработка выбора пакета
bot.action(/select_package_(.+)/, (ctx) => {
    const packageKey = ctx.match[1];
    paymentController.handleSelectPackage(ctx, packageKey);
});

// Обработка кнопки "О проекте"
bot.action('about', (ctx) => paymentController.handleAbout(ctx));

// Обработка личного кабинета
bot.action('profile', (ctx) => paymentController.handleProfile(ctx));
bot.action('profile_history', (ctx) => paymentController.handleProfileHistory(ctx));

// Обработка реферальной программы
bot.action('referral', (ctx) => paymentController.handleReferral(ctx));
bot.action('ref_user', (ctx) => paymentController.handleRefUser(ctx));
bot.action('ref_expert', (ctx) => paymentController.handleRefExpert(ctx));

// Обработка оплаты
bot.action(/pay_card_(.+)/, (ctx) => {
    const packageKey = ctx.match[1];
    paymentController.handlePayCard(ctx, packageKey);
});
bot.action(/pay_crypto_(.+)/, (ctx) => {
    const packageKey = ctx.match[1];
    paymentController.handlePayCrypto(ctx, packageKey);
});
bot.action('pay_stars', (ctx) => paymentController.handlePayStarsSoon(ctx));

// Обработка выбора криптовалюты
bot.action(/crypto_([A-Z]+)_(.+)/, (ctx) => {
    const crypto = ctx.match[1];
    const packageKey = ctx.match[2];
    console.log('🔍 DEBUG crypto callback:', {
        fullData: ctx.callbackQuery.data,
        match: ctx.match,
        crypto,
        packageKey
    });
    paymentController.handleCryptoSelect(ctx, crypto, packageKey);
});

// Обработка выбора сети
bot.action(/chain_(.+)/, (ctx) => {
    // Разбираем callback_data вручную
    const parts = ctx.callbackQuery.data.split('_');
    // Формат: chain_CRYPTO_CHAIN_PACKAGE
    // chain_TON_TON_single => ['chain', 'TON', 'TON', 'single']
    // chain_USDT_USDT_(TRC20)_pack_10 => ['chain', 'USDT', 'USDT', '(TRC20)', 'pack', '10']
    
    if (parts.length < 4) {
        console.error('❌ Invalid chain callback format:', ctx.callbackQuery.data);
        return ctx.answerCbQuery('Ошибка формата данных');
    }
    
    const crypto = parts[1]; // USDT, USDC, TON
    
    // Находим packageKey - это последний сегмент, который начинается с 'single', 'pack' или является 'pack_X'
    let packageKey = '';
    let chainParts = [];
    
    // Идем с конца и собираем packageKey
    for (let i = parts.length - 1; i >= 2; i--) {
        if (parts[i].match(/^(single|pack|10|100|300)$/)) {
            if (parts[i] === 'pack' && parts[i + 1]) {
                packageKey = `pack_${parts[i + 1]}`;
                chainParts = parts.slice(2, i);
                break;
            } else if (parts[i] === 'single') {
                packageKey = 'single';
                chainParts = parts.slice(2, i);
                break;
            }
        }
    }
    
    // Если не нашли packageKey стандартным способом, значит это single и все остальное - chain
    if (!packageKey) {
        packageKey = parts[parts.length - 1];
        chainParts = parts.slice(2, -1);
    }
    
    const chain = chainParts.join('_');
    
    console.log('🔍 Chain selection:', { crypto, chain, packageKey, original: ctx.callbackQuery.data });
    
    paymentController.handleChainSelect(ctx, crypto, chain, packageKey);
});

// Обработка проверки платежа
bot.action(/check_payment_(.+)/, (ctx) => {
    const orderId = ctx.match[1];
    paymentController.handleCheckPayment(ctx, orderId);
});

// Обработка неизвестных callback (для отладки)
bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    console.log('⚠️ Unhandled callback:', callbackData);
    await ctx.answerCbQuery('Функция в разработке');
});

// Функция уведомления админов об ошибке
async function notifyAdminsAboutError(error, ctx) {
    try {
        const { ADMINS } = await import('./config.js');
        const adminBotToken = process.env.BOT_TOKEN_ADMIN;
        
        if (!adminBotToken || !ADMINS || ADMINS.length === 0) {
            return;
        }
        
        const { Telegraf } = await import('telegraf');
        const adminBot = new Telegraf(adminBotToken);
        
        const time = new Date().toLocaleString('ru-RU');
        let message = `🔴 ОШИБКА В БОТЕ\n\n`;
        message += `⏰ Время: ${time}\n`;
        message += `❌ Тип: ${error.name || 'Error'}\n`;
        message += `💬 Сообщение: ${error.message}\n`;
        
        if (ctx?.from?.id) {
            message += `👤 User ID: ${ctx.from.id}\n`;
        }
        
        if (error.stack) {
            const stackLines = error.stack.split('\n').slice(0, 3);
            message += `\n📍 Stack:\n${stackLines.join('\n')}`;
        }
        
        // Отправляем всем админам
        for (const adminId of ADMINS) {
            try {
                await adminBot.telegram.sendMessage(adminId, message, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Посмотреть все ошибки', callback_data: 'errors' }]
                        ]
                    }
                });
            } catch (sendErr) {
                console.error(`Failed to notify admin ${adminId}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error('Failed to notify admins about error:', err);
    }
}

// Обработка ошибок
bot.catch(async (err, ctx) => {
    console.error('❌ Bot error:', err);
    
    // Логируем ошибку в систему
    const errorData = await errorLogger.logError({
        message: err.message,
        stack: err.stack,
        name: err.name || 'BotError',
        source: 'Main Bot',
        context: {
            userId: ctx?.from?.id,
            chatId: ctx?.chat?.id,
            updateType: ctx?.updateType
        }
    });
    
    // Отправляем уведомление админам
    await notifyAdminsAboutError(err, ctx);
    
    if (ctx) {
        ctx.reply(`❌ Произошла ошибка номер ${errorData.id}. Обратитесь к менеджеру @aiviral_manager с номером ошибки.`)
            .catch(e => console.error('Failed to send error message:', e));
    }
});

// Запуск бота
const USE_WEBHOOK = process.env.USE_WEBHOOK === 'true';

if (USE_WEBHOOK) {
    // Webhook режим - бот будет работать через веб-сервер
    console.log('🌐 Bot configured for webhook mode');
    console.log('⚠️  Webhook will be handled by backend server');
    console.log('✅ Bot handlers initialized and ready');
} else {
    // Polling режим - обычный режим
    bot.launch()
        .then(() => {
            console.log('✅ MeeMee bot started successfully (polling mode)!');
            console.log(`Bot username: @${bot.botInfo.username}`);
        })
        .catch(err => {
            console.error('❌ Failed to start bot:', err);
            process.exit(1);
        });
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Экспортируем бота для использования в backend
export default bot;
