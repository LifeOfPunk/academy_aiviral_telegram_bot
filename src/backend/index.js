import express from 'express';
import bodyParser from "body-parser";
import crypto from "crypto";
import {OrderService} from "../services/Order.service.js";
import 'dotenv/config';
import * as http from "node:http";
import bot from "../bot_start.js";
import {
    BACK_BUTTON_TO_WELCOME, ERROR_INSUFFICIENT_AMOUNT, ERROR_PAYMENT_CANCELLED, ERROR_TEST_OR_PAYMENT_ERROR,
    ERROR_UNDEFINED_PAYMENT,
    PAYMENT_SUCCESSFUL_GIFT,
    SUCCESS_RENEW,
} from "../config.js";
import {PromoService} from "../services/Promo.service.js";
import {PaymentFiatServiceClass} from "../services/PaymentFiat.service.js";
import winston from "winston";
import {applyPlanForUser} from "../services/chatServices.js";

const app = express();
app.use(bodyParser.json());

const WEBHOOK_USERNAME = process.env.WEBHOOK_USERNAME;
const WEBHOOK_PASSWORD = process.env.WEBHOOK_PASSWORD_PROCESSING;
const WEBHOOK_PASSWORD_LAVA = process.env.WEBHOOK_PASSWORD;
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

    if (
        username !== WEBHOOK_USERNAME ||
        password !== WEBHOOK_PASSWORD_LAVA
    ) {
        return res.status(401).send('Invalid username or password');
    }

    next();
};

app.post('/crypto_payment', async (req, res) => {
    try {
        const data = req.body;
        const receivedSignature = data.Signature;

        if (!verifySignature(data, receivedSignature)) {
            console.error('Invalid signature');
            return res.status(400).json({error: 'Invalid signature'});
        }

        const {PaymentId, Status, Insufficient, BillingID, TotalAmountUSD, Test} = data;
        console.log(`Received payment update for PaymentId: ${PaymentId}`);

        const order = await orderService.getOrderById(BillingID);

        if (!order) {
            console.error(`Order with BillingID ${BillingID} not found.`);
            return res.status(404).json({error: 'Order not found'});
        }

        const { userId, tariff } = order;

        if (Status === 'Success') {
            if (order.output.id === PaymentId && !Test) {
                //if (order.output.id === PaymentId) {
                if (order.webhook === undefined) {
                    order.webhook = [data];
                } else {
                    order.webhook.push(data);
                }

                const expectedAmount = order.input.amountUSD;
                console.log(expectedAmount + ' amount in order')
                const slippageAllowed = expectedAmount * 0.03; // 3% slippage
                const minAcceptableAmount = expectedAmount - slippageAllowed;

                if (TotalAmountUSD >= minAcceptableAmount) {
                    if (!order.isGift) {
                        if (!order.isRenew) {
                            console.log('Payment processed successfully and amount verified with slippage tolerance.');

                            const isSuccess = await orderService.setOrderSuccessAndGiveAccess(BillingID);

                            if (isSuccess) {
                                await applyPlanForUser(userId, tariff);

                                if (order.msgId !== undefined) {
                                    try {
                                        await bot.telegram.deleteMessage(userId, order.msgId);
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            } else {
                                console.log('Payment successful but something wrong');
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

                                if (order.msgId !== undefined) {
                                    try {
                                        await bot.telegram.deleteMessage(userId, order.msgId);
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            } else {
                                console.error('Failed to update order status after successful payment.');
                                await bot.telegram.sendMessage(userId, ERROR_UNDEFINED_PAYMENT);
                            }
                        }
                    } else {
                        const newPromo = await new PromoService().createPromoCode(userId, tariff);

                        await bot.telegram.sendMessage(userId, PAYMENT_SUCCESSFUL_GIFT(`https://t.me/${BOT_NAME}?promo=${newPromo.promoCode}`), {
                            parse_mode: "HTML",
                            disable_web_page_preview: true,
                            reply_markup: BACK_BUTTON_TO_WELCOME,
                        });
                    }
                } else {
                    console.error(`Received amount ${TotalAmountUSD} is less than acceptable amount ${minAcceptableAmount}.`);
                    await bot.telegram.sendMessage(userId, ERROR_INSUFFICIENT_AMOUNT);
                }
            } else {
                try {
                    await bot.telegram.sendMessage(userId, ERROR_TEST_OR_PAYMENT_ERROR);
                } catch (e) {
                    console.log(e);
                }
                console.log('PaymentID DONT MATCH WITH DATA IN DATABASE OR TEST IS SET');
            }
        } else if (Status === 'Canceled') {
            console.log('Payment was canceled.');
            await bot.telegram.sendMessage(userId, ERROR_PAYMENT_CANCELLED);

            if (order.msgId !== undefined) {
                try {
                    await bot.telegram.deleteMessage(userId, order.msgId);
                } catch (e) {
                    console.log(e)
                }
            }
        } else if (Status === 'Insufficient') {
            console.log('Payment is insufficient.');
            if (Insufficient) {
                console.log('Underpaid amount confirmed as successful.');
                try {
                    await bot.telegram.sendMessage(userId, ERROR_INSUFFICIENT_AMOUNT);
                } catch (e) {
                    console.log(e);
                }
            }
        }

        res.status(200).json({message: 'Webhook received successfully'});
    } catch (error) {
        logger.error('Error processing payment: ', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/fiat_subscription', basicAuthMiddleware, async (req, res) => {
    try {
        const data = req.body;
        console.log('/fiat_subscription')

        console.log('Received Lava Webhook:', JSON.stringify(data, null, 2));

        const {buyer, status, errorMessage, contractId} = data;

        let order;

        if (data.parentContractId !== undefined) {
            const originalOrderId = await paymentFiatService.getOrderIdByParent();

            order = await orderService.getOrderById(originalOrderId);
        } else {
            order = await orderService.getOrderByEmail(buyer.email);
        }

        const {userId, tariff} = order;

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
                        const isSuccess = await orderService.setOrderSuccessAndGiveAccess(order.orderId);
                        if (isSuccess) {
                            await applyPlanForUser(userId, tariff);

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
                    const newPromo = await new PromoService().createPromoCode(userId, tariff);

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

const PORT = 3000;

//setInterval(async () => await checkSubscriptions(bot), 60 * 1000);
http.createServer(app).listen(PORT, () => {
    console.log(`Secure webhook server listening on port ${PORT}`);
});

process.on('uncaughtException', (error) => {
    logger.error('FATAL ERROR: ', error);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('FATAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
    setTimeout(() => process.exit(1), 1000);
});