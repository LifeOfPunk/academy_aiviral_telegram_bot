import bot from "../bot_start.js";
import 'dotenv/config';

const MAIN_CHAT_ID = process.env.PRIVATE_CHANNEL_ID;
const PREMIUM_CHAT_ID = process.env.PREMIUM_CHAT_ID;

const PERMS_ALLOW_ALL = {
    can_send_messages: true,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
};

const PERMS_DENY_ALL = {
    can_send_messages: false,
    can_send_audios: false,
    can_send_documents: false,
    can_send_photos: false,
    can_send_videos: false,
    can_send_video_notes: false,
    can_send_voice_notes: false,
    can_send_polls: false,
    can_send_other_messages: false,
    can_add_web_page_previews: false,
};

async function ensureInvite(userId) {
    try {
        const link = await bot.telegram.createChatInviteLink(MAIN_CHAT_ID, {
            member_limit: 1,
            name: `auto-${userId}-${Date.now()}`,
        });
        await bot.telegram.sendMessage(
            userId,
            `Оплата прошла успешно!\nВаша ссылка для вступления: ${link.invite_link}`,
            { disable_web_page_preview: true }
        );
    } catch (e) {
        console.error("ensureInvite error", userId, e?.message);
    }
}

async function ensureInvitePremium(userId) {
    try {
        const link = await bot.telegram.createChatInviteLink(MAIN_CHAT_ID, {
            member_limit: 1,
            name: `auto-${userId}-${Date.now()}`,
        });

        const linkPrem = await bot.telegram.createChatInviteLink(PREMIUM_CHAT_ID, {
            member_limit: 1,
            name: `autoPrem-${userId}-${Date.now()}`,
        });

        await bot.telegram.sendMessage(
            userId,
            `Оплата прошла успешно!\nВаша ссылка для вступления: ${link.invite_link}\nПремиум чат: ${linkPrem.invite_link}`,
            { disable_web_page_preview: true }
        );
    } catch (e) {
        console.error("ensureInvite error", userId, e?.message);
    }
}

export async function setPermissions(chatId, userId, allow) {
    try {
        await bot.telegram.restrictChatMember(chatId, userId, allow ? PERMS_ALLOW_ALL : PERMS_DENY_ALL);
        return true;
    } catch (e) {
        console.warn("setPermissions warn", chatId, userId, e?.message);
        return false;
    }
}

export async function applyPlanForUser(userId, tariff) {
    if (!MAIN_CHAT_ID) {
        console.error("MAIN_CHAT_ID не задан в окружении");
        return;
    }

    if (tariff !== 'premium') {
        await ensureInvite(userId);
        await setPermissions(MAIN_CHAT_ID, userId, tariff === 'pro');
    } else {
        if (!PREMIUM_CHAT_ID) {
            console.error("PREMIUM_CHAT_ID не задан в окружении");
            return;
        }

        await ensureInvitePremium(userId);
        await setPermissions(MAIN_CHAT_ID, userId, true);
        await setPermissions(PREMIUM_CHAT_ID, userId, true);
    }
}