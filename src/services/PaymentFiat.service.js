import axios from "axios";
import "dotenv/config";
import {OrderService} from "./Order.service.js";
import redis from "../redis.js";
import {GLOBAL_CONFIG} from "../config.js";
import {UserService} from "./User.service.js";

export class PaymentFiatServiceClass {
    baseUrl;
    api;
    offerId;
    currency;
    periodicity;

    constructor() {
        this.baseUrl = 'https://gate.lava.top';
        this.api = process.env.LAVA_PAYMENT_API;
        this.offerId = process.env.LAVA_OFFER_ID;
        this.currency = {
            'BANK131': 'RUB',
            'UNLIMINT': 'USD'
        }
        this.periodicity = {
            1: 'MONTHLY',
            3: 'PERIOD_90_DAYS',
            6: 'PERIOD_180_DAYS',
            12: 'PERIOD_YEAR',
        }
    }

    async createNewOrder({userId, email, amount, bank, tariff}, isGift = false) {
        try {
            const orderService = new OrderService();

            const orderId = this.generateOrderId();

            let data;

            // if (!isGift) {
            //     data = {
            //         email,
            //         offerId: this.offerId,
            //         periodicity: this.periodicity[month],
            //         currency: this.currency[bank],
            //         paymentMethod: bank,
            //         buyerLanguage: "EN"
            //     };
            // } else {
                data = {
                    email,
                    offerId: GLOBAL_CONFIG.tariffs[tariff]?.offerIdLavaGift,
                    buyerLanguage: "EN",
                    currency: this.currency[bank],
                };
            //}

            const response = await axios.post(
                `${this.baseUrl}/api/v2/invoice`,
                data,
                {
                    headers:
                        {
                            'X-Api-Key': this.api
                        }
                },
            );

            if (response.data.error === undefined) {
                data.amountUSD = amount;
                data.amount = amount;
                data.tariff = tariff;
                data.createdAt = new Date().toISOString();

                const user = await new UserService().getUser(userId);

                const orderData = {
                    orderId,
                    userId: userId,
                    input: data,
                    output: response.data,
                    isPayed: false,
                    tariff: tariff,
                    isGift,
                    isFiat: true,
                    isRenew: user?.subscriptionStatus === 'active',
                    parentId: response.data.id,
                }

                await orderService.addOrder(orderData);
                return orderData;
            } else {
                return {error: response.data.error};
            }
        } catch (err) {
            console.log(`Error with creating payment ${err.message}`);
            console.log(err)

            return {error: err.toString()};
        }
    }

    generateOrderId() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000000000 + Math.random() * 9000000000);
        return `FIAT-${datePart}-${randomPart}`;
    };

    async saveParentIdToOrder(lavaOrderId, orderId) {
        await redis.set(`lava_id:${lavaOrderId}`, orderId);
    }

    async getOrderIdByParent(lavaOrderId) {
        const orderId = await redis.get(`lava_id:${lavaOrderId}`);

        return orderId ? orderId : null;
    }

    async cancelUserSubscription(email, contractId) {
        try {
            const url = `https://api.lava.top/pas/api/v1/subscriptions?contractId=${contractId}&email=${email}`;

            console.log(url)

            await axios.delete(url, {
                headers:
                    {
                        'X-Api-Key': this.api
                    }
            });

            return true
        } catch (err) {
            console.log(`Error: ${err.toString()}`);
            return false
        }
    }
}