import redis from '../redis.js';
import { UserService } from './User.service.js';
import { REFERRAL_BONUS, EXPERT_CASHBACK_PERCENT } from '../config.js';

export class ReferralService {
    constructor() {
        this.userService = new UserService();
    }

    // Создание реферальной ссылки для пользователя
    generateUserReferralLink(userId, botName) {
        return `https://t.me/${botName}?start=ref_${userId}`;
    }

    // Создание реферальной ссылки для эксперта
    generateExpertReferralLink(userId, botName) {
        return `https://t.me/${botName}?start=expert_${userId}`;
    }

    // Обработка реферала пользователя
    async processUserReferral(referrerId, newUserId) {
        try {
            // Проверка на самореферал
            if (referrerId === newUserId) {
                console.log(`⚠️ Self-referral blocked: ${referrerId}`);
                return false;
            }

            // Проверка: новый пользователь уже использовал реферальную ссылку?
            const existingReferrer = await redis.get(`user_referrer:${newUserId}`);
            if (existingReferrer) {
                console.log(`⚠️ User ${newUserId} already used referral from ${existingReferrer}`);
                return false;
            }

            const referrer = await this.userService.getUser(referrerId);
            if (!referrer) {
                console.log(`⚠️ Referrer ${referrerId} not found`);
                return false;
            }

            // Проверяем, не был ли уже засчитан этот реферал
            if (referrer.referredUsers && referrer.referredUsers.includes(newUserId)) {
                console.log(`⚠️ Referral ${newUserId} already counted for ${referrerId}`);
                return false;
            }

            // Сохраняем связь пользователь-реферер (навсегда)
            await redis.set(`user_referrer:${newUserId}`, referrerId);

            // Добавляем бонусную генерацию рефереру
            await this.userService.addFreeQuota(referrerId, REFERRAL_BONUS);

            // Добавляем бонусную генерацию новому пользователю
            await this.userService.addFreeQuota(newUserId, REFERRAL_BONUS);

            // Обновляем список рефералов
            const updatedReferredUsers = [...(referrer.referredUsers || []), newUserId];
            await this.userService.updateUser(referrerId, { 
                referredUsers: updatedReferredUsers 
            });

            // Логируем для антиабуз анализа
            await this.logReferralActivity(referrerId, newUserId);

            console.log(`✅ User referral processed: ${referrerId} -> ${newUserId}`);
            return true;
        } catch (err) {
            console.error(`❌ Error processing user referral: ${err.message}`);
            return false;
        }
    }

    // Обработка экспертного реферала
    async processExpertReferral(expertId, newUserId) {
        try {
            if (expertId === newUserId) {
                console.log(`⚠️ Self-referral blocked: ${expertId}`);
                return false;
            }

            // Проверка: новый пользователь уже использовал экспертную ссылку?
            const existingExpert = await redis.get(`expert_referral:${newUserId}`);
            if (existingExpert) {
                console.log(`⚠️ User ${newUserId} already used expert referral from ${existingExpert}`);
                return false;
            }

            const expert = await this.userService.getUser(expertId);
            if (!expert) {
                console.log(`⚠️ Expert ${expertId} not found`);
                return false;
            }

            // Сохраняем связь эксперт-реферал (навсегда)
            await redis.set(`expert_referral:${newUserId}`, expertId);

            // Обновляем список экспертных рефералов
            const updatedExpertReferrals = [...(expert.expertReferrals || []), newUserId];
            await this.userService.updateUser(expertId, { 
                expertReferrals: updatedExpertReferrals 
            });

            // Логируем для антиабуз анализа
            await this.logReferralActivity(expertId, newUserId, 'expert');

            console.log(`✅ Expert referral processed: ${expertId} -> ${newUserId}`);
            return true;
        } catch (err) {
            console.error(`❌ Error processing expert referral: ${err.message}`);
            return false;
        }
    }

    // Логирование активности для антиабуз анализа
    async logReferralActivity(referrerId, newUserId, type = 'user') {
        try {
            const activityId = `REF_ACTIVITY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const activity = {
                activityId,
                referrerId,
                newUserId,
                type,
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0]
            };
            
            // Сохраняем активность
            await redis.set(`ref_activity:${activityId}`, JSON.stringify(activity));
            await redis.lpush(`ref_activities:${referrerId}`, activityId);
            
            // Проверяем подозрительную активность (больше 10 рефералов за день)
            const todayActivities = await redis.lrange(`ref_activities:${referrerId}`, 0, -1);
            let todayCount = 0;
            
            for (const id of todayActivities) {
                const act = await redis.get(`ref_activity:${id}`);
                if (act) {
                    const parsed = JSON.parse(act);
                    if (parsed.date === activity.date) {
                        todayCount++;
                    }
                }
            }
            
            if (todayCount > 10) {
                console.log(`⚠️ SUSPICIOUS ACTIVITY: User ${referrerId} has ${todayCount} referrals today`);
                // Можно добавить флаг для модерации
                await redis.set(`suspicious_referrer:${referrerId}`, Date.now());
            }
        } catch (err) {
            console.error(`❌ Error logging referral activity: ${err.message}`);
        }
    }

    // Начисление кешбэка эксперту при оплате
    async processExpertCashback(userId, amount) {
        try {
            const expertId = await redis.get(`expert_referral:${userId}`);
            if (!expertId) return null;

            const cashback = (amount * EXPERT_CASHBACK_PERCENT) / 100;
            
            // Сохраняем кешбэк
            const cashbackId = `CASHBACK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const cashbackData = {
                cashbackId,
                expertId,
                userId,
                amount: cashback,
                originalAmount: amount,
                percent: EXPERT_CASHBACK_PERCENT,
                createdAt: new Date().toISOString()
            };

            await redis.set(`cashback:${cashbackId}`, JSON.stringify(cashbackData));
            await redis.lpush(`expert_cashbacks:${expertId}`, cashbackId);

            // Обновляем баланс эксперта
            const expert = await this.userService.getUser(expertId);
            const totalCashback = (expert.totalCashback || 0) + cashback;
            await this.userService.updateUser(expertId, { totalCashback });

            console.log(`💰 Cashback ${cashback} credited to expert ${expertId}`);
            return cashbackData;
        } catch (err) {
            console.error(`❌ Error processing cashback: ${err.message}`);
            return null;
        }
    }

    // Получение статистики рефералов
    async getReferralStats(userId) {
        const user = await this.userService.getUser(userId);
        if (!user) return null;

        return {
            referredUsers: user.referredUsers?.length || 0,
            expertReferrals: user.expertReferrals?.length || 0,
            totalCashback: user.totalCashback || 0
        };
    }
}