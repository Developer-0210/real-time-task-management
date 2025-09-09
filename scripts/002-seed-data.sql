-- Seed data for development and testing

-- Insert sample projects
INSERT INTO projects (name, description, metadata) VALUES
('Website Redesign', 'Complete overhaul of company website with modern design', '{"status": "in-progress", "teamSize": 5, "priority": "high"}'),
('Mobile App Development', 'Native mobile app for iOS and Android platforms', '{"status": "planning", "teamSize": 8, "priority": "medium"}'),
('Database Migration', 'Migrate legacy database to new PostgreSQL cluster', '{"status": "planning", "teamSize": 3, "priority": "high"}'),
('Marketing Campaign', 'Q1 marketing campaign for product launch', '{"status": "in-progress", "teamSize": 4, "priority": "medium"}');

-- Insert sample tasks for Website Redesign project (ID: 1)
INSERT INTO tasks (project_id, title, status, assigned_to, configuration, dependencies) VALUES
(1, 'Design System Creation', 'done', ARRAY[1, 2], '{"priority": "high", "description": "Create comprehensive design system with components, colors, and typography", "tags": ["design", "frontend"], "customFields": {}}', ARRAY[]::integer[]),
(1, 'Homepage Redesign', 'in-progress', ARRAY[2], '{"priority": "high", "description": "Redesign homepage with new branding and improved UX", "tags": ["design", "frontend", "homepage"], "customFields": {}}', ARRAY[1]),
(1, 'Navigation Menu Update', 'todo', ARRAY[2, 3], '{"priority": "medium", "description": "Update navigation menu structure and styling", "tags": ["frontend", "navigation"], "customFields": {}}', ARRAY[1]),
(1, 'Contact Page Redesign', 'todo', ARRAY[3], '{"priority": "low", "description": "Redesign contact page with new form and layout", "tags": ["frontend", "forms"], "customFields": {}}', ARRAY[1]),
(1, 'Performance Optimization', 'todo', ARRAY[1], '{"priority": "medium", "description": "Optimize website performance and loading times", "tags": ["performance", "optimization"], "customFields": {}}', ARRAY[2, 3]);

-- Insert sample tasks for Mobile App Development project (ID: 2)
INSERT INTO tasks (project_id, title, status, assigned_to, configuration, dependencies) VALUES
(2, 'App Architecture Planning', 'in-progress', ARRAY[4, 5], '{"priority": "high", "description": "Define app architecture and technology stack", "tags": ["architecture", "planning"], "customFields": {}}', ARRAY[]::integer[]),
(2, 'User Authentication System', 'todo', ARRAY[4], '{"priority": "high", "description": "Implement secure user authentication and authorization", "tags": ["auth", "security", "backend"], "customFields": {}}', ARRAY[6]),
(2, 'API Development', 'todo', ARRAY[5], '{"priority": "high", "description": "Develop REST API for mobile app backend", "tags": ["api", "backend"], "customFields": {}}', ARRAY[6]),
(2, 'iOS App Development', 'todo', ARRAY[6], '{"priority": "medium", "description": "Develop native iOS application", "tags": ["ios", "mobile", "swift"], "customFields": {}}', ARRAY[7, 8]),
(2, 'Android App Development', 'todo', ARRAY[7], '{"priority": "medium", "description": "Develop native Android application", "tags": ["android", "mobile", "kotlin"], "customFields": {}}', ARRAY[7, 8]);

-- Insert sample comments
INSERT INTO comments (task_id, content, author, timestamp) VALUES
(1, 'Design system is looking great! The color palette really captures our brand identity.', 'Sarah Johnson', NOW() - INTERVAL '2 hours'),
(1, 'Agreed! The typography choices are excellent too. Should we add more spacing variants?', 'Mike Chen', NOW() - INTERVAL '1 hour 30 minutes'),
(1, 'Good suggestion Mike. I''ll add a few more spacing options to the system.', 'Sarah Johnson', NOW() - INTERVAL '1 hour'),
(2, 'Started working on the homepage mockups. Will have initial designs ready by EOD.', 'Sarah Johnson', NOW() - INTERVAL '3 hours'),
(2, 'Looking forward to seeing them! Make sure to include the new hero section we discussed.', 'Alex Rodriguez', NOW() - INTERVAL '2 hours 45 minutes'),
(6, 'We need to decide between React Native and native development. Thoughts?', 'David Kim', NOW() - INTERVAL '4 hours'),
(6, 'I think native would give us better performance, especially for complex animations.', 'Lisa Wang', NOW() - INTERVAL '3 hours 30 minutes'),
(6, 'Native development it is then. I''ll update the architecture document.', 'David Kim', NOW() - INTERVAL '3 hours');

-- Update sequences to avoid conflicts
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));
SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));
SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments));
