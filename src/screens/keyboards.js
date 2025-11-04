import { KEYBOARDS } from '../config.js';
import { loadActiveMemes } from '../utils/memeLoader.js';
import { UserService } from '../services/User.service.js';

const userService = new UserService();

// Генерация клавиатуры каталога с пагинацией
export function createCatalogKeyboard(page = 0, itemsPerPage = 5) {
    const memes = loadActiveMemes();
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageMemes = memes.slice(start, end);
    
    const buttons = pageMemes.map(meme => {
        const emoji = meme.status === 'soon' ? '⏳ ' : '🎬 ';
        return [{
            text: emoji + meme.name,
            callback_data: `meme_${meme.id}`
        }];
    });
    
    // Кнопки навигации
    const navButtons = [];
    if (page > 0) {
        navButtons.push({
            text: '⬅️ Назад',
            callback_data: `catalog_page_${page - 1}`
        });
    }
    if (end < memes.length) {
        navButtons.push({
            text: '➡️ Далее',
            callback_data: `catalog_page_${page + 1}`
        });
    }
    
    if (navButtons.length > 0) {
        buttons.push(navButtons);
    }
    
    buttons.push([{
        text: '🔙 Главное меню',
        callback_data: 'main_menu'
    }]);
    
    return { inline_keyboard: buttons };
}

// Генерация клавиатуры для выбора криптовалюты
export function createCryptoKeyboard(packageKey = 'single') {
    return {
        inline_keyboard: [
            [{ text: '💵 USDT', callback_data: `crypto_USDT_${packageKey}` }],
            [{ text: '💰 USDC', callback_data: `crypto_USDC_${packageKey}` }],
            [{ text: '💎 TON', callback_data: `crypto_TON_${packageKey}` }],
            [{ text: '🔙 Назад', callback_data: `select_package_${packageKey}` }]
        ]
    };
}

// Генерация клавиатуры для выбора сети
export function createChainKeyboard(crypto, chains, packageKey = 'single') {
    const buttons = chains.map(chain => [{
        text: chain.name,
        callback_data: `chain_${crypto}_${chain.processing.replace(/\s+/g, '_')}_${packageKey}`
    }]);
    
    buttons.push([{
        text: '🔙 Назад',
        callback_data: `pay_crypto_${packageKey}`
    }]);
    
    return { inline_keyboard: buttons };
}

// Генерация клавиатуры для оплаты криптой
export function createPaymentCryptoKeyboard(orderId) {
    return {
        inline_keyboard: [
            [{ text: '✅ Я оплатил', callback_data: `check_payment_${orderId}` }],
            [{ text: '🔙 Назад', callback_data: 'buy' }]
        ]
    };
}

// Генерация клавиатуры после успешной оплаты
export function createAfterPaymentKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '🎬 Запустить генерацию', callback_data: 'catalog' }],
            [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
        ]
    };
}

// Генерация динамической клавиатуры главного меню
export async function createMainMenuKeyboard(userId) {
    const user = await userService.getUser(userId);
    const freeQuota = user?.free_quota || 0;
    
    const buttons = [];
    
    // ЗАКОММЕНТИРОВАНО: Старая кнопка бесплатной генерации
    // if (freeQuota > 0) {
    //     buttons.push([{
    //         text: `🎁 Использовать бесплатную генерацию (осталось: ${freeQuota})`,
    //         callback_data: 'use_free_generation'
    //     }]);
    // }
    
    // Новая кнопка "Бесплатный мем" - ведет на каталог мемов
    buttons.push([{
        text: '🎁 Бесплатный мем',
        callback_data: 'catalog'
    }]);
    
    // Остальные кнопки меню
    buttons.push(
        [{ text: '🎬 Создать мем', callback_data: 'catalog' }],
        [{ text: '💳 Купить видео', callback_data: 'buy' }],
        [{ text: '👤 Личный кабинет', callback_data: 'profile' }],
        [{ text: '🎁 Приведи друга', callback_data: 'referral' }],
        [{ text: 'ℹ️ О проекте', callback_data: 'about' }]
    );
    
    return { inline_keyboard: buttons };
}

export { KEYBOARDS };
