ALTER TABLE projects ADD COLUMN summary_description TEXT;
ALTER TABLE projects ADD COLUMN full_description TEXT;
ALTER TABLE projects ADD COLUMN live_url TEXT;

UPDATE projects
SET
    summary_description = COALESCE(NULLIF(TRIM(summary_description), ''), description),
    full_description = COALESCE(NULLIF(TRIM(full_description), ''), description);

CREATE TABLE IF NOT EXISTS project_images (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    image_key TEXT,
    is_thumbnail BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

INSERT INTO project_images (id, project_id, image_url, image_key, is_thumbnail, order_index)
SELECT id, id, image_url, image_key, TRUE, 0
FROM projects
WHERE image_url IS NOT NULL AND TRIM(image_url) <> ''
ON CONFLICT(id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);
