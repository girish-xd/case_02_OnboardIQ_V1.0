import app from './app.js';
import { connectDatabase } from './db.js';
import { runSeed } from './scripts/seed.js';
import { User } from './models/User.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    await connectDatabase();

    // Auto-seed demo data if fresh database
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is empty. Running initial seed...');
      await runSeed(false);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🚀 OnboardIQ Backend Service running on port ${PORT}`);
      console.log(`📌 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`🩺 Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
