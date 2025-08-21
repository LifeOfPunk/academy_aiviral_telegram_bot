import Redis from 'ioredis';
import 'dotenv/config'

const REDIS_URL = process.env.REDIS_URL;
//const REDIS_URL = undefined;

const redis = new Redis(REDIS_URL);

export default redis;