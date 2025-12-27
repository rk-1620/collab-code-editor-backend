// worker.js
import { Worker } from 'bullmq';
import { pool } from './src/config/database.js';
import logger from './src/utils/logger.js';

const connection = {
  host: 'redis',
  port: 6379
};

const worker = new Worker(
  'code-execution',
  async (job) => {
    const { workspaceId, input, idempotencyKey } = job.data;

    const existing = await pool.query(
      'SELECT status FROM jobs WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    if (existing.rows[0]?.status === 'completed') {
      logger.info(`Job already completed: ${idempotencyKey}`);
      return { skipped: true };
    }

    try {
      await pool.query(
        "UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE idempotency_key = $1",
        [idempotencyKey]
      );

      const executionTime = Math.floor(Math.random() * 2000) + 1000;
      await new Promise((r) => setTimeout(r, executionTime));

      const output = {
        success: true,
        stdout: `Mock execution: ${JSON.stringify(input)}`,
        executionTime: `${executionTime}ms`
      };

      await pool.query(
        "UPDATE jobs SET status = 'completed', output_json = $1, updated_at = NOW() WHERE idempotency_key = $2",
        [JSON.stringify(output), idempotencyKey]
      );

      return { success: true, output };
    } catch (err) {
      const maxAttempts = 3;
      if (job.attemptsMade < maxAttempts) throw err;

      await pool.query(
        "UPDATE jobs SET status = 'failed', output_json = $1, retries = $2, updated_at = NOW() WHERE idempotency_key = $3",
        [JSON.stringify({ error: err.message }), job.attemptsMade, idempotencyKey]
      );
      return { success: false, error: err.message };
    }
  },
  { connection }
);

worker.on('completed', (job) => logger.info(`Job ${job.id} completed`));
worker.on('failed', (job, err) =>
  logger.error(`Job ${job.id} failed`, err)
);

console.log('Worker listening for jobs...');
