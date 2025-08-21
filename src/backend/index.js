import express from 'express';
import bodyParser from "body-parser";
import crypto from "crypto";
import {OrderService} from "../services/Order.service.js";
import 'dotenv/config';
import * as https from "node:https";
import * as fs from "node:fs";
import bot from "../bot_start.js";
import {
    BACK_BUTTON_TO_WELCOME,
    ERROR_UNDEFINED_PAYMENT,
    PAYMENT_SUCCESSFUL_GIFT,
    SUCCESS_PAYMENT_AND_ACCESS, SUCCESS_RENEW,
} from "../config.js";
//import {checkSubscriptions} from "./checkSubscribtion.js";
import {PromoService} from "../services/Promo.service.js";
import {PaymentFiatServiceClass} from "../services/PaymentFiat.service.js";
import winston from "winston";

const app = express();
app.use(bodyParser.json());

const WEBHOOK_PASSWORD = process.env.WEBHOOK_PASSWORD_PROCESSING;
const channelId = process.env.PRIVATE_CHANNEL_ID;
const BOT_NAME = process.env.BOT_NAME;

const orderService = new OrderService();
const paymentFiatService = new PaymentFiatServiceClass();

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/errors.log' })
    ]
});

function verifySignature(data, signature) {
    const { PaymentId, MerchantId, Email, Currency } = data;
    const rawString = `${PaymentId}:${MerchantId}:${Email}:${Currency}:${WEBHOOK_PASSWORD}`;
    const hash = crypto.createHash('md5').update(rawString).digest('hex');
    return hash === signature;
}

const basicAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).send('Missing or invalid Authorization header');
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Проверяем логин и пароль из .env
    if (
        username !== process.env.WEBHOOK_USERNAME ||
        password !== process.env.WEBHOOK_PASSWORD
    ) {
        return res.status(401).send('Invalid username or password');
    }

    next();
};



app.post('/fiat_subscription', basicAuthMiddleware, async (req, res) => {
    try {
        const data = req.body;
        console.log('/fiat_subscription')

        console.log('Received Lava Webhook:', JSON.stringify(data, null, 2));

        // Проверяем статус платежа
        const {buyer, status, errorMessage, contractId} = data;

        let order;

        if (data.parentContractId !== undefined) {
            const originalOrderId = await paymentFiatService.getOrderIdByParent();

            order = await orderService.getOrderById(originalOrderId);
        } else {
            order = await orderService.getOrderByEmail(buyer.email);
        }

        const userId = order.userId;

        if (!order) {
            console.error(`Order with contractId ${contractId} not found.`);
            return res.status(204).json({error: 'Order not found'});
        }


        try {
            if (status === 'subscription-active' || status === 'completed') {
                console.log('Subscription payment successful:', contractId);

                if (order.webhook === undefined) {
                    order.webhook = [data];
                } else {
                    order.webhook.push(data);
                }

                await orderService.updateOrder(order.orderId, order);
                await paymentFiatService.saveParentIdToOrder(contractId, order.orderId);

                if (!order.isGift) {
                    if (!order.isRenew) {
                        const {invite_link} = await bot.telegram.createChatInviteLink(process.env.PRIVATE_CHANNEL_ID, {
                            member_limit: 1,
                        });

                        const isSuccess = await orderService.setOrderSuccessAndGiveAccess(order.orderId, invite_link);
                        if (isSuccess) {
                            await bot.telegram.sendMessage(userId, SUCCESS_PAYMENT_AND_ACCESS(invite_link), {
                                parse_mode: "HTML",
                                disable_web_page_preview: true,
                                reply_markup: BACK_BUTTON_TO_WELCOME,
                            });

                            if (order.msgId !== undefined) {
                                await bot.telegram.deleteMessage(userId, order.msgId);
                            }
                        } else {
                            console.error('Failed to update order status after successful payment.');
                            await bot.telegram.sendMessage(userId, ERROR_UNDEFINED_PAYMENT);
                        }
                    } else {
                        const isSuccess = await orderService.renewSubscription(order.orderId);
                        if (isSuccess) {
                            await bot.telegram.sendMessage(userId, SUCCESS_RENEW, {
                                parse_mode: "HTML",
                                disable_web_page_preview: true,
                                reply_markup: BACK_BUTTON_TO_WELCOME,
                            });
                        } else {
                            console.error('Failed to update order status after successful payment.');
                            await bot.telegram.sendMessage(userId, ERROR_UNDEFINED_PAYMENT);
                        }
                    }
                } else {
                    const newPromo = await new PromoService().createPromoCode(userId, order.input.month);

                    await bot.telegram.sendMessage(userId, PAYMENT_SUCCESSFUL_GIFT(`https://t.me/${BOT_NAME}?promo=${newPromo.promoCode}`), {
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                        reply_markup: BACK_BUTTON_TO_WELCOME,
                    });
                }

                res.status(200).json({message: 'Subscription payment processed successfully'});
            } else if (status === 'subscription-failed' || status === 'failed') {
                console.error(`Payment failed: ${errorMessage}`);

                if (userId !== undefined) {
                    await bot.telegram.sendMessage(userId, errorMessage);
                }

                res.status(201).json({error: 'Payment failed'});
            } else {
                console.warn('Unhandled payment status:', status);
                res.status(202).json({error: 'Unhandled payment status'});
            }
        } catch (error) {
            console.error('Error processing Lava Webhook:', error);
            res.status(203).json({error: 'Internal server error'});
        }
    } catch (error) {
        logger.error('Error processing payment: ', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        pid: process.pid
    });
});

const sslOptions = {
    key: fs.readFileSync('./env_data/privkey.pem'),
    cert: fs.readFileSync('./env_data/fullchain.pem')
};

const PORT = 3000;

//setInterval(async () => await checkSubscriptions(bot), 60 * 1000);
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Secure webhook server listening on port ${PORT}`);
});

process.on('uncaughtException', (error) => {
    logger.error('FATAL ERROR: ', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('FATAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});