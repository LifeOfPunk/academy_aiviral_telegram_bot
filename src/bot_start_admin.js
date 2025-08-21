import 'dotenv/config';
import {Telegraf} from "telegraf";
import {GLOBAL_CONFIG} from "./config.js";
import {UserService} from "./services/User.service.js";
import {OrderService} from "./services/Order.service.js";


if (process.env.BOT_TOKEN_ADMIN === undefined) {
    process.exit(1);
}

async function getSubscriptionStats() {
    const orderService = new OrderService();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const orders = await orderService.getOrders();
    let newSubscriptions = 0;
    let renewedSubscriptions = 0;

    for (const order of orders) {
        const orderDate = new Date(order.input.createdAt);
        if (orderDate >= sevenDaysAgo && orderDate <= now && order.isPayed) {
            if (order.isRenew) {
                renewedSubscriptions++;
            } else {
                newSubscriptions++;
            }
        }
    }

    return {
        newSubscriptions,
        renewedSubscriptions,
    };
}

const prepareMsg = async () => {
    const userService = new UserService();

    const allUsers = await userService.getTotalUniqueUsers();
    const activeSubs = (await userService.getUsersSubscribed()).length;

    const {newSubscriptions, renewedSubscriptions} = await getSubscriptionStats();

    const allSources = await userService.getAllSources();

    console.log(allSources)

    let sourceInfo = '';


    for (const source of allSources) {
        const sourceUserAmount = (await userService.getUsersBySource(source)).length;

        sourceInfo += `${source}: ${sourceUserAmount}\n`;
    }

    return {allUsers, activeSubs, newSubscriptions, renewedSubscriptions, sourceInfo};
}

const botAdmin = new Telegraf(process.env.BOT_TOKEN_ADMIN);

botAdmin.start(async (ctx) => {
    const userId = ctx.from?.id;

    if (userId) {
        if (GLOBAL_CONFIG.admins.includes(userId)) {
            const {activeSubs, newSubscriptions, renewedSubscriptions, allUsers, sourceInfo} = await prepareMsg();

            const msg = `📊 Bot Statistics for Private Channel Subscriptions

Total Users: ${allUsers}
Active Subscriptions: ${activeSubs}
New Subscriptions (Last 7 Days): ${newSubscriptions}
Renewed Subscriptions (Last 7 Days): ${renewedSubscriptions}

Sources:
${sourceInfo}
`;

            await ctx.telegram.sendMessage(ctx?.chat?.id, msg, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
            });
        } else {
            await ctx.telegram.sendMessage(ctx?.chat?.id, 'Ты кто такой? Я тебя не знаю', {
                parse_mode: "HTML",
                disable_web_page_preview: true,
            });
        }
    }
});



botAdmin.launch()