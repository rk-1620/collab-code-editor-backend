import Job from '../models/Job.js';
import Workspace from '../models/Workspace.js';
import jobQueue from '../services/jobQueue.js';

const submit = async (req, res) => {
  try {
    const { workspaceId, input, idempotencyKey } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const role = await Workspace.userRole(workspaceId, req.user.id);
    if (!role || role === 'viewer') {
      return res.status(403).json({ error: 'Not allowed to submit jobs' });
    }

    const existing = await Job.findByIdempotency(idempotencyKey);
    if (existing) return res.json(existing);

    const jobRow = await Job.create(workspaceId, input, idempotencyKey);
    await jobQueue.addJob(workspaceId, input, idempotencyKey);

    res.status(202).json(jobRow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listByWorkspace = async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const jobs = await Job.findByWorkspace(workspaceId);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default { submit, listByWorkspace };
