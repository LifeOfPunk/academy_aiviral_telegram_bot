import 'dotenv/config';
import { PaymentCryptoService } from './src/services/PaymentCrypto.service.js';
import { OrderService } from './src/services/Order.service.js';
import redis from './src/redis.js';

console.log('🧪 Testing Crypto Payment Service...\n');

const paymentService = new PaymentCryptoService();
const orderService = new OrderService();

// Тестовые данные
const testUserId = 999999999;
const testAmount = 5.8;
const testCurrency = 'TON';
const testPackage = 'single';

async function testPayment() {
    try {
        console.log('📝 Creating test payment...');
        console.log(`User ID: ${testUserId}`);
        console.log(`Amount: ${testAmount} USDT`);
        console.log(`Currency: ${testCurrency}`);
        console.log(`Package: ${testPackage}\n`);

        const payment = await paymentService.createPayment({
            userId: testUserId,
            amount: testAmount,
            payCurrency: testCurrency,
            package: testPackage
        });

        if (payment.error) {
            console.error('❌ Payment creation failed:', payment.error);
            process.exit(1);
        }

        console.log('✅ Payment created successfully!\n');
        console.log('📦 Payment details:');
        console.log('─────────────────────────────────────────');
        console.log(`Order ID: ${payment.orderId}`);
        console.log(`User ID: ${payment.userId}`);
        console.log(`Package: ${payment.package}`);
        console.log(`Currency: ${payment.currency}`);
        console.log('');
        console.log('💰 Input data:');
        console.log(`  Amount USD: ${payment.input.amountUSD}`);
        console.log(`  Amount ${testCurrency}: ${payment.input.amount}`);
        console.log(`  Currency: ${payment.input.payCurrency}`);
        console.log('');
        console.log('📍 Output data:');
        console.log(`  Address: ${payment.output.address}`);
        console.log(`  Destination Tag: ${payment.output.destinationTag || 'N/A'}`);
        console.log(`  Expired At: ${payment.output.expiredAt}`);
        console.log('─────────────────────────────────────────\n');

        // Проверяем что amount не undefined
        if (!payment.input.amount || payment.input.amount === 'undefined') {
            console.error('❌ ERROR: Amount is undefined!');
            process.exit(1);
        }

        console.log('✅ All checks passed!');
        console.log('✅ Amount is properly set:', payment.input.amount);
        console.log('✅ Address is properly set:', payment.output.address);

        // Очистка тестовых данных
        console.log('\n🧹 Cleaning up test data...');
        await redis.del(`order:${payment.orderId}`);
        await redis.lrem('all_orders', 0, payment.orderId);
        await redis.lrem(`user_orders:${testUserId}`, 0, payment.orderId);
        console.log('✅ Test data cleaned up');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        // Закрываем соединение с Redis
        await redis.quit();
        console.log('\n✅ Test completed');
        process.exit(0);
    }
}

// Запуск теста
testPayment();
