import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';

const create = async (req, res) => {
  try {
    const { projectId, name } = req.body;

    const project = await Project.findById(projectId);
    if (!project || project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only project owner can create workspaces' });
    }

    const workspace = await Workspace.create(projectId, name);
    await Workspace.addMember(workspace.id, req.user.id, 'owner');

    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listByProject = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const workspaces = await Workspace.listByProject(projectId);
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const invite = async (req, res) => {
  try {
    const { workspaceId, userId, role } = req.body;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const currentRole = await Workspace.userRole(workspaceId, req.user.id);
    if (currentRole !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owner can invite' });
    }

    await Workspace.addMember(workspaceId, userId, role);
    res.status(200).json({ message: 'User invited', workspaceId, userId, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const members = async (req, res) => {
  try {
    const workspaceId = Number(req.params.id);
    const members = await Workspace.getMembers(workspaceId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default { create, listByProject, invite, members };
