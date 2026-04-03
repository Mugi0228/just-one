import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ClientEvents, ServerEvents } from '@shared/types/events.js';
import { registerSocketHandlers } from './socket/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: IS_PRODUCTION
    ? {}
    : {
        origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          callback(null, true);
        },
        methods: ['GET', 'POST'],
      },
});

// ヘルスチェック（UptimeRobot用）
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// 本番時: ビルド済み静的ファイルを配信
if (IS_PRODUCTION) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA フォールバック
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Socket.io ハンドラー登録
registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  if (!IS_PRODUCTION) {
    console.log(`[Server] Development mode - CORS enabled for Vite dev server`);
  }
});

export { io, httpServer };
