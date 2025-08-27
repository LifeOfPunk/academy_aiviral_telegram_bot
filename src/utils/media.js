import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const resolveFirstExisting = (paths) => {
    const candidates = Array.isArray(paths) ? paths : [paths];
    for (const p of candidates) {
        if (!p) continue;
        const full = path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
        console.log('checking:', full);
        if (fs.existsSync(full)) return full;
    }
    return null;
};

export const sendOrEdit = async (
    ctx,
    {
        editMessage = false,
        text = '',
        reply_markup,
        photoCandidates,
        parse_mode = 'HTML',
        disable_web_page_preview = true,
        targetMessageId,
        originalIsPhoto,
    } = {},
) => {
    try {
        const chatId = ctx?.chat?.id;
        if (!chatId) return;

        if (!editMessage) {
            const absPath = resolveFirstExisting(photoCandidates);
            if (absPath) {
                return await ctx.telegram.sendPhoto(
                    chatId,
                    { source: absPath },
                    {
                        caption: text,
                        parse_mode,
                        reply_markup,
                    },
                );
            }
            return await ctx.telegram.sendMessage(chatId, text, {
                parse_mode,
                disable_web_page_preview,
                reply_markup,
            });
        }

        const messageId =
            targetMessageId ?? ctx?.callbackQuery?.message?.message_id;
        if (!messageId) return;

        let isPhoto = originalIsPhoto;
        if (typeof isPhoto === 'undefined') {
            const original = ctx?.callbackQuery?.message;
            isPhoto =
                Array.isArray(original?.photo) && original.photo.length > 0;
        }

        const absPath = resolveFirstExisting(photoCandidates);
        console.log(absPath);

        if (absPath) {
            await ctx.telegram.editMessageMedia(
                chatId,
                messageId,
                undefined,
                {
                    type: 'photo',
                    media: { source: absPath },
                    caption: text,
                    parse_mode,
                },
                { reply_markup },
            );
            return;
        }

        if (isPhoto) {
            try {
                await ctx.telegram.deleteMessage(chatId, messageId);
            } catch (err) {}

            return await ctx.telegram.sendMessage(chatId, text, {
                parse_mode,
                disable_web_page_preview,
                reply_markup,
            });
        }

        await ctx.telegram.editMessageText(chatId, messageId, undefined, text, {
            parse_mode,
            disable_web_page_preview,
            reply_markup,
        });
    } catch (e) {
        console.error('sendOrEdit error:', e?.message || e);
    }
};
