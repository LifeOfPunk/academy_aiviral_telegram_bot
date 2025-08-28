import 'dotenv/config';

const chatId = process.env.PUBLIC_CHANNEL_ID;

export const checkIsSubscribed = async (ctx) => {
    try {
        const userId = ctx.from?.id;

        if (!chatId || !userId) {
            await ctx.answerCbQuery('Ошибка проверки. Попробуйте позже.', {
                show_alert: false,
            });
            return;
        }
        const member = await ctx.telegram.getChatMember(chatId, userId);
        const status = member?.status;

        return (
            status === 'member' ||
            status === 'administrator' ||
            status === 'creator' ||
            status === 'owner'
        );
    } catch (e) {
        return false;
    }
};
