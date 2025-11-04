import 'dotenv/config';
import axios from 'axios';
import redis from '../redis.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserService } from './User.service.js';
import { errorLogger } from './ErrorLogger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GenerationService {
    constructor(bot = null) {
        this.apiKey = process.env.KIE_AI_API_KEY;
        // Kie.ai Sora 2 API endpoint
        this.apiUrl = `https://api.kie.ai/api/v1/jobs`;
        this.modelName = 'sora-2-text-to-video';
        this.bot = bot; // Telegram bot instance для отправки уведомлений
        this.userService = new UserService(); // Сервис для работы с квотами
    }

    // Загрузка промпта мема
    loadMemePrompt(memeId) {
        try {
            const memePath = path.join(__dirname, '../memes', `${memeId}.json`);
            const memeData = JSON.parse(fs.readFileSync(memePath, 'utf8'));
            return memeData;
        } catch (err) {
            console.error(`❌ Error loading meme ${memeId}: ${err.message}`);
            return null;
        }
    }

    // Создание генерации
    async createGeneration({ userId, memeId, name, gender, customPrompt = null, chatId = null }) {
        try {
            const generationId = this.generateId();
            let prompt;
            let memeName = 'Custom';

            if (customPrompt) {
                // Используем кастомный промпт
                prompt = customPrompt;
                memeName = 'Пользовательский промпт';
            } else {
                // Используем мем из каталога
                const memeData = this.loadMemePrompt(memeId);

                if (!memeData) {
                    return { error: 'Мем не найден' };
                }

                // Определяем все варианты замены для гендера
                const genderReplacements = this.getGenderReplacements(gender);
                
                // Обрабатываем промпт - может быть строкой или объектом
                if (typeof memeData.prompt === 'string') {
                    // Простой строковый промпт
                    prompt = memeData.prompt
                        .replace('{name}', name)
                        .replace('{gender}', gender)
                        .replace('{gender_text}', genderReplacements.gender_text);
                } else {
                    // Сложный JSON промпт - рекурсивно заменяем все плейсхолдеры
                    prompt = this.replacePlaceholders(
                        JSON.parse(JSON.stringify(memeData.prompt)), 
                        { name, ...genderReplacements }
                    );
                }
                
                memeName = memeData.name;
            }

            const generation = {
                generationId,
                userId,
                chatId: chatId || userId, // Сохраняем chatId для отправки уведомлений
                memeId,
                memeName,
                name,
                gender,
                prompt,
                status: 'queued',
                videoUrl: null,
                error: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await redis.set(`generation:${generationId}`, JSON.stringify(generation));
            await redis.lpush('generation_queue', generationId);
            await redis.lpush(`user_generations:${userId}`, generationId);

            console.log(`🎬 Generation ${generationId} created for user ${userId}`);

            // Запуск генерации асинхронно
            this.processGeneration(generationId).catch(err => {
                console.error(`❌ Error processing generation ${generationId}: ${err.message}`);
            });

            return generation;
        } catch (err) {
            console.error(`❌ Error creating generation: ${err.message}`);
            return { error: err.message };
        }
    }

    // Получение всех замен для гендера
    getGenderReplacements(gender) {
        if (gender === 'male') {
            return {
                gender_text: 'мальчик',
                gender_child: 'boy',
                gender_pronoun: 'He',
                gender_possessive: 'his',
                gender_object: 'him',
                gender_full_description: 'полный мальчик славянской национальности'
            };
        } else {
            return {
                gender_text: 'девочка',
                gender_child: 'girl',
                gender_pronoun: 'She',
                gender_possessive: 'her',
                gender_object: 'her',
                gender_full_description: 'полная девочка славянской национальности'
            };
        }
    }

    // Рекурсивная замена плейсхолдеров в объекте/строке
    replacePlaceholders(obj, replacements) {
        if (typeof obj === 'string') {
            // Заменяем все плейсхолдеры в строке
            let result = obj;
            for (const [key, value] of Object.entries(replacements)) {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
            return result;
        } else if (Array.isArray(obj)) {
            // Обрабатываем массивы
            return obj.map(item => this.replacePlaceholders(item, replacements));
        } else if (typeof obj === 'object' && obj !== null) {
            // Обрабатываем объекты
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.replacePlaceholders(value, replacements);
            }
            return result;
        }
        return obj;
    }

    // Обработка генерации
    async processGeneration(generationId) {
        try {
            const generation = await this.getGeneration(generationId);
            if (!generation) return;

            // Обновляем статус
            await this.updateGeneration(generationId, { status: 'processing' });

            // Вызов Kie.ai Sora 2 API
            const videoUrl = await this.generateVideo(generation.prompt);

            if (videoUrl) {
                await this.updateGeneration(generationId, {
                    status: 'done',
                    videoUrl: videoUrl
                });
                
                // Увеличиваем счетчик успешных генераций
                const generation = await this.getGeneration(generationId);
                if (generation && generation.userId) {
                    const user = await this.userService.getUser(generation.userId);
                    if (user) {
                        await this.userService.updateUser(generation.userId, {
                            successful_generations: (user.successful_generations || 0) + 1
                        });
                    }
                }
                
                console.log(`✅ Generation ${generationId} completed successfully`);
                
                // Отправляем уведомление пользователю
                await this.notifyUser(generation.chatId || generation.userId, {
                    status: 'success',
                    videoUrl: videoUrl,
                    generationId: generationId
                });
            } else {
                throw new Error('Failed to generate video');
            }
        } catch (err) {
            console.error(`❌ Generation ${generationId} failed: ${err.message}`);
            
            // Логируем ошибку в систему
            const errorData = await errorLogger.logError({
                message: `Video generation failed: ${err.message}`,
                stack: err.stack,
                name: 'GenerationError',
                source: 'Generation Service',
                context: { generationId }
            });
            
            await this.updateGeneration(generationId, {
                status: 'failed',
                error: err.message,
                errorId: errorData.id
            });
            
            // Получаем генерацию для доступа к chatId и userId
            const generation = await this.getGeneration(generationId);
            if (generation) {
                // Увеличиваем счетчик ошибок
                if (generation.userId) {
                    const user = await this.userService.getUser(generation.userId);
                    if (user) {
                        await this.userService.updateUser(generation.userId, {
                            failed_generations: (user.failed_generations || 0) + 1
                        });
                    }
                }
                
                // Отправляем уведомление об ошибке
                await this.notifyUser(generation.chatId || generation.userId, {
                    status: 'failed',
                    error: err.message,
                    errorId: errorData.id,
                    generationId: generationId
                });
            }
        }
    }

    // Генерация видео через Kie.ai Sora 2 API
    async generateVideo(prompt) {
        try {
            if (!this.apiKey) {
                throw new Error('Kie.ai API key not configured');
            }

            console.log('🎬 Starting video generation with Kie.ai Sora 2...');
            
            // Определяем, является ли prompt объектом или строкой
            let promptData;
            if (typeof prompt === 'object') {
                // Если это объект, преобразуем в JSON строку для API
                promptData = JSON.stringify(prompt);
                console.log('Prompt (JSON):', promptData);
            } else {
                promptData = prompt;
                console.log('Prompt:', promptData);
            }

            // Создание задачи через Kie.ai Sora 2 API
            const response = await axios.post(
                `${this.apiUrl}/createTask`,
                {
                    model: this.modelName,
                    input: {
                        prompt: promptData,
                        aspect_ratio: 'portrait', // 9:16 формат (1080x1920)
                        n_frames: "10", 
                        remove_watermark: true
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: 30000 // 30 секунд для создания задачи
                }
            );

            console.log('API Response:', JSON.stringify(response.data, null, 2));

            // Проверка на ошибки API
            if (response.data && response.data.code !== 200) {
                const errorCode = response.data.code;
                const errorMsg = response.data.msg || 'Unknown error';
                
                // Специальная обработка для ошибки 402 (недостаточно кредитов)
                if (errorCode === 402) {
                    throw new Error(`❌ Недостаточно кредитов на Kie.ai API: ${errorMsg}`);
                }
                
                throw new Error(`API Error (${errorCode}): ${errorMsg}`);
            }

            // Проверка успешного ответа
            if (response.data && response.data.code === 200 && response.data.data && response.data.data.taskId) {
                const taskId = response.data.data.taskId;
                console.log('✅ Task created successfully. Task ID:', taskId);
                console.log('⏳ Starting polling for task completion...');
                
                // Запускаем polling для проверки статуса
                return await this.pollVideoGeneration(taskId);
            }

            throw new Error('Invalid API response: ' + (response.data?.msg || response.data?.message || 'no task ID received'));
        } catch (err) {
            console.error(`❌ Video generation error: ${err.message}`);
            if (err.response && err.response.data) {
                console.error('API Error Response:', JSON.stringify(err.response.data, null, 2));
                
                // Проверяем ошибку в response
                if (err.response.data.code === 402) {
                    throw new Error(`❌ Недостаточно кредитов на Kie.ai API: ${err.response.data.msg}`);
                }
                
                throw new Error(`API Error (${err.response.data.code}): ${err.response.data.msg || 'Unknown error'}`);
            }
            throw err;
        }
    }

    // Polling для проверки статуса генерации
    async pollVideoGeneration(taskId, maxAttempts = 60, interval = 10000) {
        console.log('⏳ Starting polling for task:', taskId);
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await axios.get(
                    `${this.apiUrl}/recordInfo`,
                    {
                        params: {
                            taskId: taskId
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.apiKey}`
                        }
                    }
                );

                console.log(`Polling attempt ${i + 1}/${maxAttempts}...`);
                console.log('Status response:', JSON.stringify(response.data, null, 2));

                // Проверяем успешный статус выполнения
                if (response.data && response.data.code === 200 && response.data.data) {
                    const taskData = response.data.data;
                    
                    // Задача успешно завершена
                    if (taskData.state === 'success') {
                        console.log('✅ Task completed successfully!');
                        
                        // Парсим результат
                        if (taskData.resultJson) {
                            const result = typeof taskData.resultJson === 'string' 
                                ? JSON.parse(taskData.resultJson) 
                                : taskData.resultJson;
                            
                            // Используем URL без водяного знака, если доступен
                            const videoUrl = result.resultUrls && result.resultUrls.length > 0 
                                ? result.resultUrls[0] 
                                : null;
                            
                            if (videoUrl) {
                                console.log('✅ Video URL received:', videoUrl);
                                return videoUrl;
                            }
                        }
                        
                        throw new Error('Task completed but no video URL found');
                    }
                    
                    // Задача завершилась с ошибкой
                    if (taskData.state === 'fail') {
                        const errorMsg = taskData.failMsg || 'Unknown error';
                        throw new Error(`Video generation failed: ${errorMsg}`);
                    }
                    
                    // Задача еще в процессе (generating, queuing, waiting)
                    console.log(`Task status: ${taskData.state}. Waiting...`);
                }

                // Ждём перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, interval));
            } catch (err) {
                console.error(`❌ Polling error: ${err.message}`);
                
                // Если это ошибка завершения задачи, пробрасываем сразу
                if (err.message.includes('generation failed')) {
                    throw err;
                }
                
                // Если это последняя попытка, пробрасываем ошибку
                if (i === maxAttempts - 1) {
                    throw err;
                }
                
                // Иначе ждём и пробуем снова
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }

        throw new Error('Video generation timeout after ' + (maxAttempts * interval / 1000) + ' seconds');
    }

    // Получение генерации
    async getGeneration(generationId) {
        const data = await redis.get(`generation:${generationId}`);
        return data ? JSON.parse(data) : null;
    }

    // Обновление генерации
    async updateGeneration(generationId, data) {
        const generation = await this.getGeneration(generationId);
        if (!generation) return null;

        const updated = {
            ...generation,
            ...data,
            updatedAt: new Date().toISOString()
        };

        await redis.set(`generation:${generationId}`, JSON.stringify(updated));
        return updated;
    }

    // Получение генераций пользователя
    async getUserGenerations(userId) {
        const generationIds = await redis.lrange(`user_generations:${userId}`, 0, -1);
        const generations = [];

        for (const id of generationIds) {
            const gen = await this.getGeneration(id);
            if (gen) generations.push(gen);
        }

        return generations;
    }

    // Генерация ID
    generateId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `GEN-${timestamp}-${random}`;
    }

    // Получение статистики генераций
    async getGenerationStats() {
        const queueLength = await redis.llen('generation_queue');
        
        // Получаем все ID генераций (можно оптимизировать)
        const allKeys = await redis.keys('generation:*');
        const stats = {
            total: allKeys.length,
            queued: 0,
            processing: 0,
            done: 0,
            failed: 0
        };

        for (const key of allKeys) {
            const gen = await redis.get(key);
            if (gen) {
                const { status } = JSON.parse(gen);
                stats[status] = (stats[status] || 0) + 1;
            }
        }

        return { ...stats, queueLength };
    }

    // Получение топ мемов
    async getTopMemes() {
        const allKeys = await redis.keys('generation:*');
        const memeCounts = {};

        for (const key of allKeys) {
            const gen = await redis.get(key);
            if (gen) {
                const { memeId, memeName, status } = JSON.parse(gen);
                if (status === 'done') {
                    if (!memeCounts[memeId]) {
                        memeCounts[memeId] = { memeId, memeName, count: 0 };
                    }
                    memeCounts[memeId].count++;
                }
            }
        }

        return Object.values(memeCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    // Отправка уведомления пользователю о завершении генерации
    async notifyUser(chatId, data) {
        if (!this.bot) {
            console.log('⚠️ Bot instance not provided, skipping notification');
            return;
        }

        try {
            if (data.status === 'success' && data.videoUrl) {
                console.log(`📤 Sending video to user ${chatId}...`);
                
                try {
                    // Пытаемся отправить видео
                    await this.bot.telegram.sendVideo(
                        chatId,
                        { url: data.videoUrl },
                        { 
                            caption: '✅ Ваше видео готово!\n\n🎬 Генерация успешно завершена!',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🎬 Создать ещё', callback_data: 'catalog' }],
                                    [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                                ]
                            }
                        }
                    );
                    console.log(`✅ Video sent successfully to user ${chatId}`);
                } catch (videoErr) {
                    console.error(`❌ Failed to send video, sending link instead:`, videoErr.message);
                    
                    // Если не удалось отправить видео, отправляем ссылку
                    await this.bot.telegram.sendMessage(
                        chatId,
                        `✅ Ваше видео готово!\n\n🎬 Генерация успешно завершена!\n\n🔗 Ссылка на видео: ${data.videoUrl}`,
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🎬 Создать ещё', callback_data: 'catalog' }],
                                    [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                                ]
                            }
                        }
                    );
                }
            } else if (data.status === 'failed') {
                console.log(`📤 Sending failure notification to user ${chatId}...`);
                
                // Получаем генерацию для возврата квоты
                const generation = await this.getGeneration(data.generationId);
                if (generation && generation.userId) {
                    // Возвращаем квоту пользователю
                    await this.userService.refundQuota(generation.userId);
                    console.log(`💰 Refunded quota for user ${generation.userId}`);
                }
                
                // Формируем упрощённое сообщение об ошибке
                const errorId = data.errorId || 'UNKNOWN';
                await this.bot.telegram.sendMessage(
                    chatId,
                    `❌ К сожалению, не удалось создать видео.\n\n` +
                    `Ошибка номер ${errorId}. Обратитесь к менеджеру @aiviral_manager с номером ошибки.\n\n` +
                    `💰 Ваша генерация возвращена на баланс.`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 Попробовать снова', callback_data: 'catalog' }],
                                [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
                console.log(`✅ Failure notification sent to user ${chatId}`);
            }
        } catch (err) {
            console.error(`❌ Failed to send notification to user ${chatId}:`, err.message);
        }
    }
}