import {UserService} from "../services/User.service.js";
import {
    NOTIFICATION_1_DAYS_UNTIL_EXPIRE,
    NOTIFICATION_3_DAYS_UNTIL_EXPIRE,
    NOTIFICATION_6_HOURS_UNTIL_EXPIRE, NOTIFICATION_EXPIRE
} from "../config.js";

export async function checkSubscriptions(bot) {
    console.log("Checking Subscriptions");
    const userService = new UserService();

    // Получаем список активных пользователей
    const userSubscribed = await userService.getUsersSubscribed();

    const now = Date.now();

    for (const userId of userSubscribed) {
        const user = await userService.getUser(userId);

        if (!user) continue;

        const mainChannel = user.subscriptions.mainChannel;

        if (mainChannel.subscriptionStatus === "active" && mainChannel.expiresAt) {
            console.log(`user: ${userId}`);
            const expiresAt = new Date(mainChannel.expiresAt).getTime();
            const timeLeft = expiresAt - now;

            if (user.notifications.renewalReminder) {
                if (timeLeft <= 3 * 24 * 60 * 60 * 1000 && timeLeft > 2 * 24 * 60 * 60 * 1000) {
                    if (!mainChannel.reminders.threeDays) {
                        await bot.telegram.sendMessage(userId, NOTIFICATION_3_DAYS_UNTIL_EXPIRE);

                        mainChannel.reminders.threeDays = true;

                        await userService.updateUser(userId, user);
                    }
                } else if (timeLeft <= 24 * 60 * 60 * 1000 && timeLeft > 6 * 60 * 60 * 1000) {
                    if (!mainChannel.reminders.oneDay) {
                        await bot.telegram.sendMessage(userId, NOTIFICATION_1_DAYS_UNTIL_EXPIRE);

                        mainChannel.reminders.oneDay = true;

                        await userService.updateUser(userId, user);
                    }
                } else if (timeLeft <= 6 * 60 * 60 * 1000 && timeLeft > 0) {
                    if (!mainChannel.reminders.sixHours) {
                        await bot.telegram.sendMessage(userId, NOTIFICATION_6_HOURS_UNTIL_EXPIRE);

                        mainChannel.reminders.sixHours = true;

                        await userService.updateUser(userId, user);
                    }
                }
            }

            console.log(timeLeft);

            if (timeLeft <= 0) {
                mainChannel.subscriptionStatus = "inactive";
                mainChannel.expiresAt = null;

                mainChannel.reminders = {
                    threeDays: false,
                    oneDay: false,
                    sixHours: false,
                };

                await userService.updateUser(userId, user);

                await userService.removeUserFromSubscribed(userId);

                const oneMinuteLater = Math.floor(Date.now() / 1000) + 60;

                await bot.telegram.banChatMember(process.env.PRIVATE_CHANNEL_ID, userId, oneMinuteLater);

                await bot.telegram.sendMessage(userId, NOTIFICATION_EXPIRE);
            }
        }
    }
}
