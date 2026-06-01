ALTER TABLE projects ADD COLUMN image_key TEXT;

CREATE INDEX IF NOT EXISTS idx_project_skills_project_id ON project_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_image_key ON projects(image_key);
