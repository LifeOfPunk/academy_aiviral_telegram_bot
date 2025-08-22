import 'dotenv/config';
import { UserService } from "../services/User.service.js";

const userService = new UserService();

const INTERVAL_MIN = process.env.CRON_INTERVAL_MIN ? Number(process.env.CRON_INTERVAL_MIN) : null;

async function runOnce() {
    try {
        console.log(`[syncPermissionsCron] start run at ${new Date().toISOString()}`);
        await userService.syncPermissionsForAllUsers();
        console.log(`[syncPermissionsCron] finished run at ${new Date().toISOString()}`);
    } catch (err) {
        console.error('[syncPermissionsCron] error', err?.message || err);
    }
}

async function main() {
    console.log(`[syncPermissionsCron] starting periodic worker every ${INTERVAL_MIN} minute(s)`);
    await runOnce(); // сделать первый запуск сразу
    setInterval(async () => {
        await runOnce();
    }, INTERVAL_MIN * 60 * 1000);
}

main();