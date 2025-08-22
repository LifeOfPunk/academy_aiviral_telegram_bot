import redis from "../redis.js";
import {ERROR_PROMO_ALREADY_USED, ERROR_PROMO_NOT_FOUND} from "../config.js";


export class PromoService {
    async createPromoCode(userId, tariff){

        let promoCode = null;

        while (promoCode === null) {
            const generatedPromoCode = this.generateCode();

            const allPromoArr = await this.getAllPromoCodes();

            if (!allPromoArr.includes(generatedPromoCode)) {
                promoCode = generatedPromoCode;
            }
        }

        const initialObj = {
            promoCode,        // Unique identifier for the promo code
            createdByUserId: userId,          // ID of the user who created the promo code
            usageLimit: 1,                         // Maximum number of times the promo code can be used
            timesUsed: 0,                          // Number of times the promo code has been used
            status: "active",
            tariff,
            createdAt: new Date().toISOString(),     // Timestamp when the promo code was created
            usedAt: null,     // Timestamp when the promo code was created
            usedBy: []
        }

        await redis.set(`promoCode:${promoCode}`, JSON.stringify(initialObj));
        await redis.sadd(`all_promo`, promoCode);

        return initialObj;
    }

    async getPromoObject(promoCode) {
        const promo = await redis.get(`promoCode:${promoCode}`);

        return promo ? JSON.parse(promo) : null;
    }

    async validatePromoCode(promoCode) {
        const allPromos = await this.getAllPromoCodes();

        if (allPromos.includes(promoCode)) {
            const promoObject = await this.getPromoObject(promoCode);

            if (promoObject.status === "active" && promoObject.timesUsed === 0) {
                return promoObject;
            } else {
                return {error: ERROR_PROMO_ALREADY_USED}
            }
        } else {
            return {error: ERROR_PROMO_NOT_FOUND}
        }
    }

    generateCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let promoCode = '';
        for (let i = 0; i < 10; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            promoCode += characters[randomIndex];
        }
        return promoCode;
    }

    async getAllPromoCodes() {
        return redis.smembers('all_promo');
    }
}