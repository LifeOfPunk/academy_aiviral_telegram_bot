import redis from "../redis.js";
import {OrderService} from "./Order.service.js";
import {PaymentFiatServiceClass} from "./PaymentFiat.service.js";

export class UserService {
    async createNewUser(telegramUser) {
        const { id: userId, username, first_name: firstName, last_name: lastName, source } = telegramUser;

        const existingUser = await redis.get(`user:${userId}`);

        if (!existingUser) {
            const newUser = {
                userId,
                username: username || null,
                firstName: firstName || null,
                lastName: lastName || null,
                subscriptions: {
                    mainChannel: {
                        subscriptionStatus: "inactive",
                        expiresAt: null,
                        subPrice: null,
                        isUserWasSubscribed: false,
                        linksHistory: [],
                        reminders: {
                            threeDays: false,
                            oneDay: false,
                            sixHours: false,
                        }
                    },
                    additionalChannels: []
                },
                notifications: {
                    renewalReminder: true,
                    paymentReminder: true
                },
                sourceFrom: source,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await redis.set(`user:${userId}`, JSON.stringify(newUser));

            const sourceString = String(source);

            const sourceKey = `source:${sourceString}`;
            const allSourcesKey = "all:sources";

            const sourceExists = await redis.exists(sourceKey);
            if (!sourceExists) {
                await redis.rpush(allSourcesKey, sourceString);
            }

            await redis.rpush(sourceKey, userId);
            await redis.sadd(`active_users`, userId);
        }
    }

    async getAllSources() {
        return redis.lrange('all:sources', 0, -1);
    }

    async getUsersBySource(sourceString) {
        return redis.lrange(`source:${sourceString}`, 0, -1);
    }

    async updateUser(userId, newData) {
        await redis.set(`user:${userId}`, JSON.stringify(newData));

        console.log(`User ${userId} updated successfully.`);
    }

    async getUser(userId) {
        const user = await redis.get(`user:${userId}`);

        return user ? JSON.parse(user) : null;
    }

    async addUserToSubscribed(userId) {
        await redis.sadd('user_subscribed', userId);
    }

    async removeUserFromSubscribed(userId) {
        await redis.srem("user_subscribed", userId);
    }

    async getUsersSubscribed() {
        return redis.smembers("user_subscribed");
    }

    async getTotalUniqueUsers() {
        return redis.scard('active_users');
    }

    async addEmailToUser(userId, email) {
        await redis.set(`user_email:${email}`, userId);
        const user = await this.getUser(userId);

        if (user !== null) {
            user.email = email;

            await this.updateUser(userId, user);

            return user;
        } else {
            return null
        }
    }

    async getUserFromEmail(email) {
        const userId = await redis.get(`user_email:${email}`);

        return userId ? userId : null;
    }

    async cancelUserRenew(userId) {
        const userObj = await this.getUser(userId);

        if (userObj !== null) {
            const orderId = await new OrderService().getOrderByEmail(userObj.email);

            if (orderId !== null) {
                userObj.subscriptions.mainChannel.isFiat = false;
                userObj.updatedAt = new Date().toISOString();

                const isSuccess = new PaymentFiatServiceClass().cancelUserSubscription(userObj.email, orderId.parentId);

                if (isSuccess) {
                    await this.updateUser(userId, userObj);
                }

                return isSuccess;
            }
        }
    }
}