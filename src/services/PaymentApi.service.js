import 'dotenv/config';
import axios from "axios";
import {OrderService} from "./Order.service.js";
import BigNumber from "bignumber.js";
import {ERROR_PAYMENT_IS_LESS_THEN_MINIMUM} from "../config.js";
import {UserService} from "./User.service.js";

export class CryptoPaymentApiService {
    baseUrl;
    api;

    constructor() {
        this.baseUrl = 'https://app.0xprocessing.com';
        this.api = process.env.PAYMENT_API;
        this.merchant = '0xMR8252827';
    }

    async createPayment({userId, amount, payCurrency, tariff}, isGift = false) {
        try {
            const orderService = new OrderService();

            const userOrders = await orderService.getOrdersByUserId(userId);

            const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

            const existingOrder = userOrders.find(order =>
                order?.input?.amount === amount &&
                new Date(order?.output?.expiredAt) < tenMinutesFromNow &&
                order?.input?.payCurrency === payCurrency
            );

            if (existingOrder) {
                return existingOrder;
            }

            const orderId = this.generateOrderId();

            const data = {
                merchantID: this.merchant,
                billingID: orderId,
                currency: payCurrency,
                email: 'test@test.com',
                clientId: userId,
            };

            const response = await axios.post(
                `${this.baseUrl}/payment`,
                data,
                {
                    headers:
                        {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                },
            );

            data.amountUSD = amount;
            data.amount = new BigNumber(amount)
                .div(payCurrency.includes('USDT') || payCurrency.includes('USDC')
                    ? 1
                    : response.data.rate)
                .toFixed(5);
            data.tariff = tariff;
            data.createdAt = new Date().toISOString();

            const coinInfoResponse = await axios.get(`${this.baseUrl}/Api/CoinInfo/${payCurrency}`);

            if (new BigNumber(data.amount).isLessThan(coinInfoResponse.data.min)) {
                return {error: ERROR_PAYMENT_IS_LESS_THEN_MINIMUM};
            }

            const user = await new UserService().getUser(userId);

            const orderData = {
                orderId,
                userId: userId,
                input: data,
                output: response.data,
                isPayed: false,
                isGift,
                isRenew: user?.subscriptionStatus === 'active',
            }

            await orderService.addOrder(orderData);
            return orderData;
        } catch (err) {
            console.log(`Error with creating payment ${err.message}`);
            console.log(err)
        }
    }

    // async createPaymentTest({userId, amount, payCurrency}) {
    //     try {
    //         const orderService = new OrderService();
    //
    //         const userOrders = await orderService.getOrdersByUserId(userId);
    //
    //         const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
    //
    //         const existingOrder = userOrders.find(order =>
    //             order?.input?.amount === amount &&
    //             new Date(order?.output?.expiredAt) < tenMinutesFromNow &&
    //             order?.input?.payCurrency === payCurrency
    //         );
    //
    //         if (existingOrder) {
    //             return existingOrder;
    //         }
    //
    //         const orderId = this.generateOrderId();
    //
    //         const data = {
    //             amountUSD: 100,
    //             merchantID: '0xMR8252827',
    //             billingID: orderId,
    //             currency: 'USDT (ERC20)',
    //             email: 'test@test.com',
    //             clientId: userId,
    //             test: true,
    //             returnUrl: true
    //         };
    //
    //         console.log(data)
    //
    //         const response = await axios.post(
    //             `${this.baseUrl}/payment`,
    //             data,
    //             {
    //                 headers:
    //                     {
    //                         'Content-Type': 'application/x-www-form-urlencoded'
    //                     }
    //             },
    //         );
    //
    //         console.log(response.data)
    //
    //         const orderData = {
    //             orderId,
    //             userId: userId,
    //             input: data,
    //             output: response.data,
    //             isPayed: false,
    //         }
    //
    //         await orderService.addOrder(orderData);
    //         return orderData;
    //     } catch (err) {
    //         console.log(`Error with creating payment ${err.message}`);
    //         console.log(err)
    //     }
    // }

    // async getSupportedCrypto() {
    //     try {
    //         const cacheKey = 'supportedCrypto';
    //
    //         const cachedData = await redis.get(cacheKey);
    //
    //         if (cachedData) {
    //             const parsedData = JSON.parse(cachedData);
    //             const currentTime = new Date().getTime();
    //             const expiryTime = parsedData.expiryTime;
    //
    //
    //             if (currentTime < expiryTime) {
    //                 return parsedData.data;
    //             }
    //         }
    //
    //         const {data} = await axios.post(`https://api.oxapay.com/api/currencies`);
    //
    //         if (data.result === 100) {
    //             const addedChains = Object.keys(data.data).filter(name => GLOBAL_CONFIG.supportedCrypto.includes(name) && data.data[name].status);
    //
    //             const resultData = addedChains.map(name => data.data[name]);
    //
    //             const expiryTime = new Date().getTime() + 5 * 60 * 1000; // 5 минут в миллисекундах
    //
    //             const cacheData = {
    //                 data: resultData,
    //                 expiryTime: expiryTime
    //             };
    //
    //             await redis.set(cacheKey, JSON.stringify(cacheData));
    //
    //             return resultData;
    //         } else {
    //             console.log(`Error: ${data.message}`);
    //             return []
    //         }
    //     } catch (err) {
    //         console.log(`Error fetching crypto: ${err}`);
    //         return []
    //     }
    // }

    generateOrderId() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000000000 + Math.random() * 9000000000);
        return `CRYPTO-${datePart}-${randomPart}`;
    };
}