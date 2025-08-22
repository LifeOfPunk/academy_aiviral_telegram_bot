import 'dotenv/config';
import {Scenes, session, Telegraf} from "telegraf";
import {welcomeScreenHandler} from "./screens/welcome.screen.js";
import {callbackQuery} from "telegraf/filters";
import {callbackQueryHandler} from "./controllers/callBack.handler.js";
import {UserService} from "./services/User.service.js";
import { URLSearchParams } from 'url';
import {ERROR_PROMO_UNDEFINED} from "./config.js";
import {PromoService} from "./services/Promo.service.js";
import {OrderService} from "./services/Order.service.js";
import {payByCardScene} from "./scenes/payByCard.scene.js";
import {applyPlanForUser} from "./services/chatServices.js";

if (process.env.BOT_TOKEN === undefined) {
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

const stage = new Scenes.Stage([payByCardScene]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
    const userId = ctx.from?.id;

    if (userId) {
        try {
            const startPayload = ctx.startPayload || '';
            const urlParams = new URLSearchParams(startPayload);

            const promoCode = urlParams.get('promo'); // promo=xxxxxxxx
            const source = urlParams.get('source');   // source=tiktok

            await new UserService().createNewUser({...ctx.from, source});

            if (promoCode) {
                const validatedPromoObject = await new PromoService().validatePromoCode(promoCode);

                if (validatedPromoObject.error === undefined) {
                    const isSuccess = await new OrderService().setPromoSuccessAndGiveAccess(promoCode, userId);

                    if (isSuccess) {
                        await applyPlanForUser(userId, validatedPromoObject.tariff);
                    } else {
                        await ctx.telegram.sendMessage(ctx?.chat?.id, ERROR_PROMO_UNDEFINED, {
                            parse_mode: "HTML",
                            disable_web_page_preview: true,
                        });
                    }
                } else {
                    await ctx.telegram.sendMessage(ctx?.chat?.id, validatedPromoObject.error, {
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                    });
                }
            }

            await welcomeScreenHandler(ctx, false, true);
        } catch (e) {
            console.log(`FATAL ERROR: ${e}`)
        }
    }
});

bot.on(callbackQuery("data"), async (ctx) => {
    try {
        await callbackQueryHandler(ctx);
        await ctx.answerCbQuery();
    } catch (e) {
        console.log(`FATAL ERROR: ${e}`)
    }
});


bot.launch()

export default bot;