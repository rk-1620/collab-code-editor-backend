// src/controllers/projectController.js
import Project from '../models/Project.js';

const create = async (req, res) => {
  try {
    const { name } = req.body;
    const project = await Project.create(req.user.id, name);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const list = async (req, res) => {
  try {
    const projects = await Project.findByOwner(req.user.id);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default { create, list };
