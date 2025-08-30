import { welcomeScreenHandler } from '../screens/welcome.screen.js';
import { chooseCryptoForPayScreenHandler } from '../screens/chooseCrypto.screen.js';
import { ERROR_UNSUCCESSFULL_CHECK } from '../config.js';
import { chooseChainForPayScreenHandler } from '../screens/chooseChain.screen.js';
import { freeLessonStartScreen } from '../screens/freeLessonStart.screen.js';
import { freeLessonScreen } from '../screens/freeLesson.screen.js';
import { paymentMethodsScreen } from '../screens/paymentMethods.screen.js';
import { payCardPackagesScreen } from '../screens/payCardPackages.screen.js';
import { payCryptoPackagesScreen } from '../screens/payCryptoPackages.screen.js';
import { aboutAviralScreen } from '../screens/aboutAviral.screen.js';
import { aviralMoreScreen } from '../screens/aviralMore.screen.js';
import { portfolioScreen } from '../screens/portfolio.screen.js';
import { contactsScreen } from '../screens/contacts.screen.js';
import { confirmTariffHandler } from '../screens/confirmTariff.screen.js';
import { payCryptoFinalScreen } from '../screens/payCryptoFinal.screen.js';
import { payCardFinalScreen } from '../screens/payCardFinal.screen.js';
import { faqScreen } from '../screens/faq.screen.js';
import { checkIsSubscribed } from '../utils/checkSub.js';
import { freePromptsStartScreen } from '../screens/freePromptsStart.screen.js';
import { freePromptsScreen } from '../screens/freePrompts.screen.js';
import { freeAiStartScreen } from '../screens/freAiStart.screen.js';
import { freeAiScreen } from '../screens/freeAi.screen.js';
import { notSubscribedScreen } from '../screens/notSubscribed.screen.js';

export const callbackQueryHandler = async (ctx) => {
    const { callbackQuery, chat } = ctx;

    if (!callbackQuery || !chat) return;

    if ('data' in callbackQuery) {
        const { command } = JSON.parse(callbackQuery.data);
        console.log(command);

        const opts = {
            message_id: callbackQuery.message?.message_id,
        };

        // Navigation helpers
        const initNav = () => {
            if (!ctx.session) ctx.session = {};
            if (!ctx.session.navStack) ctx.session.navStack = [];
        };
        const navigateTo = async (screenId, handler) => {
            initNav();
            if (ctx.session.currentScreen) {
                ctx.session.navStack.push(ctx.session.currentScreen);
            }
            ctx.session.currentScreen = screenId;
            await handler();
        };
        const goBack = async () => {
            initNav();
            // leave any active scene
            try {
                if (ctx.scene && ctx.scene.current) {
                    await ctx.scene.leave();
                }
            } catch (e) {}
            const prev = ctx.session.navStack.pop();
            console.log(ctx.session.navStack);
            console.log(prev + ' prev');
            const target = prev || 'start';
            ctx.session.currentScreen = target;

            if (target.includes(`confirmTariff`)) {
                await confirmTariffHandler(
                    ctx,
                    target
                        .split('_')
                        .filter((w) => w !== 'confirmTariff')
                        .join('_'),
                    ctx.session.chooseCryptoState,
                    true,
                );

                return;
            }

            switch (target) {
                case 'start':
                    await welcomeScreenHandler(ctx, true);
                    break;
                case 'about_aviral':
                    await aboutAviralScreen(ctx, true);
                    break;
                case 'aviral_more':
                    await aviralMoreScreen(ctx, true);
                    break;
                case 'portfolio':
                    await portfolioScreen(ctx);
                    break;
                case 'contacts':
                    await contactsScreen(ctx, true);
                    break;
                case 'free_lesson_start':
                    await freeLessonStartScreen(ctx, true);
                    break;
                case 'free_lesson':
                    await freeLessonScreen(ctx, true);
                    break;
                case 'free_prompts_start':
                    await freePromptsStartScreen(ctx, true);
                    break;
                case 'free_prompts':
                    await freePromptsScreen(ctx, true);
                    break;
                case 'free_ai':
                    await freeAiScreen(ctx, true);
                    break;
                case 'free_ai_start':
                    await freeAiStartScreen(ctx, true);
                    break;
                case 'payment_methods':
                    await paymentMethodsScreen(ctx, true);
                    break;
                case 'pay_card':
                    await payCardPackagesScreen(ctx, true);
                    break;
                case 'faq':
                    await faqScreen(ctx);
                    break;
                case 'pay_crypto':
                    await payCryptoPackagesScreen(ctx, true);
                    break;
                case 'pay_crypto_final':
                    await payCryptoPackagesScreen(ctx, true);
                    break;
                case 'choose_crypto':
                    await chooseCryptoForPayScreenHandler(
                        ctx,
                        ctx.session.chooseCryptoState,
                        true,
                    );
                    break;
                case 'choose_chain':
                    await payCryptoPackagesScreen(ctx, true);
                    break;
                case 'pay_card_scene':
                    await payCardPackagesScreen(ctx, true);
                    break;
                default:
                    await welcomeScreenHandler(ctx, true);
            }
        };

        if (opts.message_id) {
            // Back handler
            if (command === 'back') {
                await goBack();
                return;
            }

            // ********* SCREENS HANDLERS *********

            // Start/back to main
            if (command === 'start') {
                initNav();
                ctx.session.navStack = [];
                ctx.session.currentScreen = 'start';
                await welcomeScreenHandler(ctx, true);
            }

            // if (command.includes("about_chanel")) {
            //     await aboutScreenHandler(ctx, true);
            // }

            if (command === 'about_aviral') {
                await navigateTo('about_aviral', async () =>
                    aboutAviralScreen(ctx, true),
                );
            }
            if (command === 'faq') {
                await navigateTo('faq', async () => await faqScreen(ctx, true));
            }
            if (command === 'aviral_more') {
                await navigateTo('aviral_more', async () =>
                    aviralMoreScreen(ctx, true),
                );
            }

            // Portfolio
            if (command === 'portfolio') {
                await navigateTo('portfolio', async () => portfolioScreen(ctx));
            }
            if (
                command === 'case_1' ||
                command === 'case_2' ||
                command === 'case_3'
            ) {
                initNav();
                if (ctx.session.currentScreen)
                    ctx.session.navStack.push(ctx.session.currentScreen);
                ctx.session.currentScreen = command;
                const text =
                    command === 'case_1'
                        ? 'Кейс 1: скоро будут детали.'
                        : command === 'case_2'
                          ? 'Кейс 2: скоро будут детали.'
                          : 'Кейс 3: скоро будут детали.';
                const reply_markup = {
                    inline_keyboard: [
                        [
                            {
                                text: '❓Обратная связь',
                                callback_data: JSON.stringify({
                                    command: 'faq',
                                }),
                            },
                        ],
                        [
                            {
                                text: '⏪ Вернуться назад',
                                callback_data: JSON.stringify({
                                    command: 'back',
                                }),
                            },
                        ],
                    ],
                };
                await ctx.telegram.editMessageText(
                    ctx?.chat?.id,
                    ctx?.callbackQuery?.message?.message_id,
                    undefined,
                    text,
                    {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup,
                    },
                );
            }

            // Contacts
            if (command === 'contacts') {
                await navigateTo('contacts', async () =>
                    contactsScreen(ctx, true),
                );
            }

            // Free lesson flow
            if (command === 'free_lesson_start') {
                const isSubscribed = await checkIsSubscribed(ctx);

                if (isSubscribed) {
                    await navigateTo('free_lesson', async () =>
                        freeLessonScreen(ctx, true),
                    );
                } else {
                    await navigateTo('free_lesson_start', async () =>
                        freeLessonStartScreen(ctx, true),
                    );
                }
            }

            if (command === 'check_subscription_free_lesson') {
                try {
                    const isSubscribed = await checkIsSubscribed(ctx);

                    if (isSubscribed) {
                        await ctx.answerCbQuery(
                            'Подписка подтверждена! Открываю урок…',
                            { show_alert: false },
                        );
                        await navigateTo('free_lesson', async () =>
                            freeLessonScreen(ctx, true),
                        );
                    } else {
                        await notSubscribedScreen(ctx, command);
                    }
                } catch (e) {
                    console.error('Subscription check error:', e);
                    await ctx.answerCbQuery(
                        'Не удалось проверить подписку. Попробуйте позже.',
                        { show_alert: false },
                    );
                }
            }

            if (command === 'free_prompts_start') {
                const isSubscribed = await checkIsSubscribed(ctx);

                if (isSubscribed) {
                    await navigateTo('free_prompts', async () =>
                        freePromptsScreen(ctx, true),
                    );
                } else {
                    await navigateTo('free_prompts_start', async () =>
                        freePromptsStartScreen(ctx, true),
                    );
                }
            }

            if (command === 'check_subscription_free_prompts') {
                try {
                    const isSubscribed = await checkIsSubscribed(ctx);

                    if (isSubscribed) {
                        await ctx.answerCbQuery(
                            'Подписка подтверждена! Открываю промпты…',
                            { show_alert: false },
                        );
                        await navigateTo('free_prompts', async () =>
                            freePromptsScreen(ctx, true),
                        );
                    } else {
                        await notSubscribedScreen(ctx, command);
                    }
                } catch (e) {
                    console.error('Subscription check error:', e);
                    await ctx.answerCbQuery(
                        'Не удалось проверить подписку. Попробуйте позже.',
                        { show_alert: false },
                    );
                }
            }

            if (command === 'free_ai_start') {
                const isSubscribed = await checkIsSubscribed(ctx);

                if (isSubscribed) {
                    await navigateTo('free_ai', async () =>
                        freeAiScreen(ctx, true),
                    );
                } else {
                    await navigateTo('free_ai_start', async () =>
                        freeAiStartScreen(ctx, true),
                    );
                }
            }

            if (command === 'check_subscription_free_ai') {
                try {
                    const isSubscribed = await checkIsSubscribed(ctx);

                    if (isSubscribed) {
                        await ctx.answerCbQuery(
                            'Подписка подтверждена! Открываю топ нейронок…',
                            { show_alert: false },
                        );
                        await navigateTo('free_ai', async () =>
                            freeAiScreen(ctx, true),
                        );
                    } else {
                        await notSubscribedScreen(ctx, command);
                    }
                } catch (e) {
                    console.error('Subscription check error:', e);
                    await ctx.answerCbQuery(
                        'Не удалось проверить подписку. Попробуйте позже.',
                        { show_alert: false },
                    );
                }
            }

            // Payment methods and packages
            if (command === 'payment_methods') {
                await navigateTo('payment_methods', async () =>
                    paymentMethodsScreen(ctx, true),
                );
            }
            if (command === 'pay_card') {
                await navigateTo('pay_card', async () =>
                    payCardPackagesScreen(ctx, true),
                );
            }
            if (command === 'pay_crypto') {
                await navigateTo('pay_crypto', async () =>
                    payCryptoPackagesScreen(ctx, true),
                );
            }

            if (
                command === 'order_card_start_confirm' ||
                command === 'order_card_pro_confirm' ||
                command === 'order_card_premium_confirm'
            ) {
                initNav();
                if (ctx.session.currentScreen)
                    ctx.session.navStack.push(ctx.session.currentScreen);
                ctx.session.currentScreen = 'pay_card_scene';
                const tariff = command.split('_')[2];

                await ctx.scene.enter('payByCardScene', {
                    tariff,
                    isGift: false,
                });
            }
            if (
                command === 'order_crypto_start_confirm' ||
                command === 'order_crypto_pro_confirm' ||
                command === 'order_crypto_premium_confirm'
            ) {
                initNav();
                const tariff = command.split('_')[2];
                ctx.session.chooseCryptoState = { tariff, isGift: false };

                await navigateTo('choose_crypto', async () =>
                    chooseCryptoForPayScreenHandler(
                        ctx,
                        ctx.session.chooseCryptoState,
                        true,
                    ),
                );
            }

            if (
                command === 'order_card_start' ||
                command === 'order_card_pro' ||
                command === 'order_card_premium'
            ) {
                initNav();
                const tariff = command.split('_')[2];
                ctx.session.chooseCryptoState = { tariff, isGift: false };

                await navigateTo(`confirmTariff_${command}`, async () =>
                    confirmTariffHandler(
                        ctx,
                        command,
                        ctx.session.chooseCryptoState,
                        true,
                    ),
                );
            }
            if (
                command === 'order_crypto_start' ||
                command === 'order_crypto_pro' ||
                command === 'order_crypto_premium'
            ) {
                initNav();
                const tariff = command.split('_')[2];
                ctx.session.chooseCryptoState = { tariff, isGift: false };

                await navigateTo(`confirmTariff_${command}`, async () =>
                    confirmTariffHandler(
                        ctx,
                        command,
                        ctx.session.chooseCryptoState,
                        true,
                    ),
                );
            }

            if (command.includes('choose_chain_crypto_')) {
                let isGift;
                let symbol;
                let tariff;

                if (command.split('_')[3] === 'gift') {
                    symbol = command.split('_')[4];
                    tariff = command.split('_')[5];
                    isGift = true;
                } else {
                    symbol = command.split('_')[3];
                    tariff = command.split('_')[4];
                    isGift = false;
                }

                initNav();
                ctx.session.chooseChainState = { symbol, tariff, isGift };
                await navigateTo('choose_chain', async () =>
                    chooseChainForPayScreenHandler(
                        ctx,
                        ctx.session.chooseChainState,
                        true,
                    ),
                );
            }

            if (command === 'check_is_payment_completed') {
                await ctx.answerCbQuery(ERROR_UNSUCCESSFULL_CHECK, {
                    show_alert: false,
                });
            }

            if (command.includes('pay_crypto_')) {
                initNav();
                await navigateTo('pay_crypto_final', async () =>
                    payCryptoFinalScreen(ctx, command),
                );
            }

            // ****************************************************************************************

            // ********* CARD PAY **********

            const regexCard =
                /^pay_(russian|world)_card(_gift)?_(start|pro|premium)$/;

            if (command.match(regexCard)) {
                initNav();
                await navigateTo('pay_card_final', async () =>
                    payCardFinalScreen(ctx, command),
                );
            }

            // ****************************************************************************************

            // ********* SEND FILE *********

            if (command.includes('send_file_')) {
                if (command === 'send_file_offer_agreement') {
                    await ctx.replyWithDocument({
                        source: './src/data/Terms of use iaifun.pdf',
                    });
                }

                if (command === 'send_file_personal_policy') {
                    await ctx.sendDocument({
                        source: './src/data/Privacy Policy iaifun.pdf',
                    });
                }
            }

            // if (command === 'send_welcome') {
            //     const photoUrls = [
            //         './src/data/photo.jpg',
            //         './src/data/photo_2025-01-30_16-52-53 (2).jpg',
            //         './src/data/photo_2025-01-30_16-52-54.jpg',
            //         './src/data/photo_2025-01-30_16-52-54 (2).jpg',
            //         './src/data/photo_2025-02-08_01-14-28.jpg',
            //         './src/data/photo_2025-02-08_14-06-37.jpg',
            //     ];
            //
            //     const media = photoUrls.map(url => ({
            //         type: 'photo',
            //         media: { source: url },
            //     }));
            //
            //     await ctx.replyWithMediaGroup(media);
            //
            //     await welcomeScreenHandler(ctx, false, false);
            // }

            // ****************************************************************************************
        }
    }
};
