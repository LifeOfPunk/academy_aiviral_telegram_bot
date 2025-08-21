import redis from "../redis.js";
import {UserService} from "./User.service.js";
import {addMonths} from "date-fns";
import {PromoService} from "./Promo.service.js";

export class OrderService {
    async getOrders() {
        try {
            const orderIds = await redis.lrange('order_list', 0, -1);

            const orders = [];
            for (const orderId of orderIds) {
                const orderData = await redis.get(`order:${orderId}`);
                if (orderData) {
                    orders.push({ orderId, ...JSON.parse(orderData) });
                }
            }

            return orders;
        } catch (error) {
            console.error('Error fetching all orders:', error);
            return [];
        }
    }

    async addOrder(orderData) {
        try {
            await redis.set(`order:${orderData.orderId}`, JSON.stringify(orderData));

            await redis.lpush('order_list', orderData.orderId);

            if (orderData.userId) {
                await redis.lpush(`user_orders:${orderData.userId}`, orderData.orderId);
            }

            if (orderData.isFiat) {
                await redis.set(`email_to_order:${orderData.input.email}`, orderData.orderId);
            }

            console.log(`Order ${orderData.orderId} added successfully.`);
        } catch (error) {
            console.error('Error adding order:', error);
        }
    };

    async getOrderById (orderId) {
        try {
            const orderData = await redis.get(`order:${orderId}`);
            return orderData ? JSON.parse(orderData) : null;
        } catch (error) {
            console.error(`Error fetching order with ID ${orderId}:`, error);
            return null;
        }
    };

    async updateOrder(orderId, orderData) {
        try {
            await redis.set(`order:${orderData.orderId}`, JSON.stringify(orderData));

            console.log(`Order ${orderData.orderId} updated successfully.`);
        } catch (error) {
            console.error(`Error fetching order with ID ${orderId}:`, error);
            return null;
        }
    }

    async setOrderSuccessAndGiveAccess(orderId, linkForAccess) {
        try {
            const orderData = await this.getOrderById(orderId);

            orderData.isPayed = true;

            await redis.set(`order:${orderData.orderId}`, JSON.stringify(orderData));

            console.log(`Order ${orderData.orderId} updated successfully.`);

            const UserServiceInst = new UserService();

            const userData = await UserServiceInst.getUser(orderData.userId)

            if (userData !== null) {
                userData.subscriptions.mainChannel = {
                    subscriptionStatus: "active",
                    expiresAt: userData.subscriptions.mainChannel.expiresAt
                        ? addMonths(new Date(userData.subscriptions.mainChannel.expiresAt), orderData.input.month).toISOString()
                        : addMonths(new Date(), orderData.input.month).toISOString(),
                    subPrice: orderData.input.amountUSD,
                    isUserWasSubscribed: true,
                    isFiat: orderData.isFiat
                };

                userData.updatedAt = new Date().toISOString();

                userData.subscriptions.mainChannel.linksHistory = userData.subscriptions.mainChannel.linksHistory === undefined ?
                    [linkForAccess] :
                    [...userData.subscriptions.mainChannel.linksHistory, linkForAccess];

                await UserServiceInst.updateUser(orderData.userId, userData);
                await UserServiceInst.addUserToSubscribed(orderData.userId);

                console.log(`User ${orderData.userId} updated successfully.`);

                return true
            } else {
                console.log('Error: user do not exist');

                return false
            }
        } catch (error) {
            console.error(`Error fetching order with ID ${orderId}:`, error);
            return false;
        }
    }

    async renewSubscription(orderId) {
        try {
            const orderData = await this.getOrderById(orderId);

            orderData.isPayed = true;

            await redis.set(`order:${orderData.orderId}`, JSON.stringify(orderData));

            console.log(`Order ${orderData.orderId} updated successfully.`);

            const UserServiceInst = new UserService();

            const userData = await UserServiceInst.getUser(orderData.userId)

            if (userData !== null) {
                userData.subscriptions.mainChannel = {
                    ...userData.subscriptions.mainChannel,
                    expiresAt: userData.subscriptions.mainChannel.expiresAt
                        ? addMonths(new Date(userData.subscriptions.mainChannel.expiresAt), orderData.input.month).toISOString()
                        : addMonths(new Date(), orderData.input.month).toISOString(),
                    subPrice: orderData.input.amountUSD,
                    isFiat: orderData.isFiat,
                    reminders: {
                        threeDays: false,
                        oneDay: false,
                        sixHours: false,
                    }
                };

                userData.updatedAt = new Date().toISOString();

                await UserServiceInst.updateUser(orderData.userId, userData);
                await UserServiceInst.addUserToSubscribed(orderData.userId);

                console.log(`User ${orderData.userId} updated successfully.`);

                return true
            } else {
                console.log('Error: user do not exist');

                return false
            }
        } catch (error) {
            console.error(`Error fetching order with ID ${orderId}:`, error);
            return false;
        }
    }

    async setPromoSuccessAndGiveAccess(promoCode, userId, linkForAccess) {
        try {
            const promoObject = await new PromoService().getPromoObject(promoCode);

            promoObject.status = 'inactive';
            promoObject.timesUsed++;
            promoObject.usedAd = new Date().toISOString();
            promoObject.usedBy.push(userId);


            await redis.set(`promoCode:${promoCode}`, JSON.stringify(promoObject));

            console.log(`Promo code ${promoCode} used successfully.`);

            const UserServiceInst = new UserService();

            const userData = await UserServiceInst.getUser(userId);

            if (userData !== null) {
                userData.subscriptions.mainChannel = {
                    subscriptionStatus: "active",
                    expiresAt: userData.subscriptions.mainChannel.expiresAt
                        ? addMonths(new Date(userData.subscriptions.mainChannel.expiresAt), promoObject.month).toISOString()
                        : addMonths(new Date(), promoObject.month).toISOString(),
                    subPrice: promoObject.amountUSD,
                    isUserWasSubscribed: true,
                    isFiat: false,
                    reminders: {
                        threeDays: false,
                        oneDay: false,
                        sixHours: false,
                    }
                };

                userData.updatedAt = new Date().toISOString();

                userData.subscriptions.mainChannel.linksHistory = userData.subscriptions.mainChannel.linksHistory === undefined ?
                    [linkForAccess] :
                    [...userData.subscriptions.mainChannel.linksHistory, linkForAccess];

                await UserServiceInst.updateUser(userId, userData);
                await UserServiceInst.addUserToSubscribed(userId);

                console.log(`User ${userId} updated successfully.`);

                return true
            } else {
                console.log('Error: user do not exist');

                return false
            }
        } catch (error) {
            console.error(`Error using promo`, error);
            return false;
        }
    }

    async getOrdersByUserId(userId) {
        try {
            // Получаем все orderId пользователя
            const orderIds = await redis.lrange(`user_orders:${userId}`, 0, -1);

            // Получаем данные по каждому orderId
            const orders = [];
            for (const orderId of orderIds) {
                const orderData = await redis.get(`order:${orderId}`);
                if (orderData) {
                    orders.push(JSON.parse(orderData));
                }
            }

            return orders;
        } catch (error) {
            console.error(`Error fetching orders for user ${userId}:`, error);
            return [];
        }
    };

    async getOrderByEmail(email) {
        try {
            const orderId = await redis.get(`email_to_order:${email}`);

            return this.getOrderById(orderId);
        } catch (error) {
            console.error(`Error fetching orders for user ${email}:`, error);
            return null;
        }
    };
}