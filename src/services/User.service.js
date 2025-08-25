import redis from "../redis.js";
import {setPermissions} from "./chatServices.js";
import 'dotenv/config';

const MAIN_CHAT_ID = process.env.PRIVATE_CHANNEL_ID;
const PREMIUM_CHAT_ID = process.env.PREMIUM_CHAT_ID;

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
                tariff: null,
                permissionsSynced: false,
                subscriptionStatus: "inactive",
                subPrice: null,
                isUserWasSubscribed: false,
                isFiat: false,
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

    async syncPermissionsForAllUsers() {
        try {
            const userIds = await redis.smembers('active_users');
            if (!Array.isArray(userIds) || userIds.length === 0) return;

            for (const userId of userIds) {
                try {
                    const user = await this.getUser(userId);
                    if (!user) continue;

                    if (user.permissionsSynced === true || user.subscriptionStatus === 'inactive') {
                        continue;
                    }

                    let isSuccess = false;

                    if (user.tariff !== 'premium') {
                        isSuccess = await setPermissions(MAIN_CHAT_ID, Number(userId), user.tariff);
                    } else {
                        const isSuccessDef = await setPermissions(MAIN_CHAT_ID, Number(userId), user.tariff);
                        const isSuccessPrem = await setPermissions(PREMIUM_CHAT_ID, Number(userId), user.tariff);

                        isSuccess = isSuccessDef && isSuccessPrem;
                    }

                    if (isSuccess) {
                        user.permissionsSynced = true;
                        user.updatedAt = new Date().toISOString();
                        await this.updateUser(userId, user);
                    }
                } catch (innerErr) {
                    console.warn(`syncPermissions: user ${userId} error`, innerErr?.message || innerErr);
                }
            }
        } catch (err) {
            console.error("syncPermissionsForAllUsers error", err?.message || err);
        }
    }
}