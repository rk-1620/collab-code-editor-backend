import { Queue } from 'bullmq';
import { redis } from '../config/database.js';

const connection = {
  host: new URL(process.env.REDIS_URL).hostname,
  port: Number(new URL(process.env.REDIS_URL).port || 6379)
};

const jobQueue = new Queue('code-execution', { connection });

const addJob = async (workspaceId, input, idempotencyKey) =>
  jobQueue.add(
    'execute',
    { workspaceId, input, idempotencyKey },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    }
  );

export default { jobQueue, addJob };
