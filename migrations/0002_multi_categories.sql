CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

INSERT OR IGNORE INTO categories (name)
SELECT DISTINCT TRIM(category) FROM projects WHERE TRIM(category) <> '';

INSERT OR IGNORE INTO categories (name)
SELECT DISTINCT TRIM(category) FROM skills WHERE TRIM(category) <> '';

INSERT OR IGNORE INTO project_categories (project_id, category_id)
SELECT projects.id, categories.id
FROM projects
JOIN categories ON categories.name = TRIM(projects.category)
WHERE TRIM(projects.category) <> '';

INSERT OR IGNORE INTO skill_categories (skill_id, category_id)
SELECT skills.id, categories.id
FROM skills
JOIN categories ON categories.name = TRIM(skills.category)
WHERE TRIM(skills.category) <> '';

CREATE INDEX IF NOT EXISTS idx_project_categories_category_id ON project_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_skill_categories_category_id ON skill_categories(category_id);
