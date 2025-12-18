import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT) || 4000,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? '',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? '',
  LIVEKIT_URL: process.env.LIVEKIT_URL ?? '',
};


