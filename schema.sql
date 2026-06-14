CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    summary_description TEXT,
    full_description TEXT,
    image_url TEXT,
    image_key TEXT,
    link TEXT NOT NULL,
    live_url TEXT,
    category TEXT NOT NULL,
    icon_slug TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (featured = 1 AND order_index IS NOT NULL)
        OR
        (featured = 0 AND order_index IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_skills (
    project_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, skill_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS project_categories (
    project_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, category_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS skill_categories (
    skill_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (skill_id, category_id),
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS traffic_logs (
    id INTEGER PRIMARY KEY,
    visitor_hash TEXT NOT NULL,
    user_agent TEXT,
    country TEXT,
    path TEXT,
    is_bot BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(featured DESC, order_index ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_skills_project_id ON project_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_skill_id ON project_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_category_id ON project_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_skill_categories_category_id ON skill_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_image_key ON projects(image_key);
CREATE INDEX IF NOT EXISTS idx_traffic_logs_created_at ON traffic_logs(created_at);
