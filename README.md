# Collaborative Task Management System

A real-time collaborative task management system built with Next.js, PostgreSQL, and Redis. Features include real-time updates, drag-and-drop task boards, commenting system, and advanced caching for optimal performance.

## 🚀 Features

### Core Functionality
- **Project Management**: Create, edit, and organize multiple projects
- **Task Management**: Full CRUD operations with drag-and-drop Kanban boards
- **Real-time Collaboration**: Live updates across all connected clients
- **Comment System**: Real-time commenting with typing indicators
- **Task Dependencies**: Link tasks with dependency management
- **Advanced Filtering**: Search, filter by status, priority, and tags

### Technical Features
- **Real-time Updates**: WebSocket-based live synchronization
- **Performance Optimized**: Redis caching, virtual scrolling, optimistic updates
- **Rate Limiting**: Built-in API rate limiting and abuse prevention
- **Responsive Design**: Mobile-first design with dark mode support
- **Type Safety**: Full TypeScript implementation

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis with advanced caching strategies
- **Real-time**: WebSockets with Redis pub/sub
- **Styling**: Tailwind CSS v4 with custom design system
- **State Management**: SWR for client-side caching

### System Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   API Routes    │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │              ┌─────────────────┐              
         │              │      Redis      │              
         └──────────────►│  (Cache + PubSub)│              
                        └─────────────────┘              
                                 │                        
                        ┌─────────────────┐              
                        │   WebSocket     │              
                        │   (Real-time)   │              
                        └─────────────────┘              
\`\`\`

### Data Flow & Synchronization Strategy

1. **Client Actions**: User interactions trigger optimistic UI updates
2. **API Processing**: Server validates and processes requests
3. **Database Updates**: Changes persisted to PostgreSQL
4. **Cache Management**: Redis cache updated with intelligent invalidation
5. **Real-time Broadcasting**: Updates published via Redis pub/sub
6. **WebSocket Distribution**: All connected clients receive updates
7. **UI Synchronization**: Clients update their state in real-time

### Caching Strategy

- **Multi-layer Caching**: Browser cache, SWR cache, Redis cache
- **Tag-based Invalidation**: Efficient cache invalidation using tags
- **Optimistic Updates**: Immediate UI feedback with rollback on failure
- **Stale-while-revalidate**: Serve cached content while fetching updates

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm or yarn

### Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/task_management

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: For production deployments
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

### Installation & Setup

1. **Clone and Install Dependencies**
\`\`\`bash
git clone <repository-url>
cd collaborative-task-management
npm install
\`\`\`

2. **Database Setup**
\`\`\`bash
# Create PostgreSQL database
createdb task_management

# Run database migrations
npm run db:migrate
\`\`\`

3. **Redis Setup**
\`\`\`bash
# Start Redis server (macOS with Homebrew)
brew services start redis

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
\`\`\`

4. **Start Development Server**
\`\`\`bash
npm run dev
\`\`\`

The application will be available at `http://localhost:3000`

### Database Migrations

Run the SQL scripts in order:

\`\`\`bash
# Execute the database schema
psql $DATABASE_URL -f scripts/001-create-tables.sql
\`\`\`

## 📚 API Documentation

### Projects API

#### GET /api/projects
Retrieve all projects with caching.

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "name": "Project Name",
    "description": "Project description",
    "metadata": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
\`\`\`

#### POST /api/projects
Create a new project.

**Request Body:**
\`\`\`json
{
  "name": "New Project",
  "description": "Optional description",
  "metadata": {
    "status": "planning",
    "teamSize": 5
  }
}
\`\`\`

### Tasks API

#### GET /api/tasks?projectId={id}
Retrieve tasks for a specific project.

#### POST /api/tasks
Create a new task.

**Request Body:**
\`\`\`json
{
  "project_id": 1,
  "title": "Task Title",
  "status": "todo",
  "configuration": {
    "priority": "medium",
    "description": "Task description",
    "tags": ["frontend", "urgent"],
    "customFields": {}
  },
  "dependencies": [2, 3]
}
\`\`\`

### Comments API

#### GET /api/comments?taskId={id}
Retrieve comments for a specific task.

#### POST /api/comments
Add a comment to a task.

**Request Body:**
\`\`\`json
{
  "task_id": 1,
  "content": "Comment content",
  "author": "User Name"
}
\`\`\`

## 🔄 Real-time Features

### WebSocket Events

The system uses WebSocket connections for real-time updates:

- `projects`: Project CRUD operations
- `tasks`: Task updates and status changes  
- `comments`: New comments and typing indicators
- `user_typing`: Live typing indicators
- `user_presence`: User online/offline status

### Typing Indicators

Real-time typing indicators show when users are composing comments:

\`\`\`typescript
// Join task comment room
joinTaskComments(taskId)

// Send typing status
setTyping(taskId, true, "username")
\`\`\`

## 🚀 Deployment

### Docker Deployment

1. **Build Docker Image**
\`\`\`bash
docker build -t task-management .
\`\`\`

2. **Run with Docker Compose**
\`\`\`bash
docker-compose up -d
\`\`\`

### Vercel Deployment

1. **Connect Database & Redis**
   - Add PostgreSQL database (Neon, Supabase, etc.)
   - Add Redis instance (Upstash, Redis Cloud, etc.)

2. **Configure Environment Variables**
   - Set `DATABASE_URL` and `REDIS_URL` in Vercel dashboard
   - Configure other environment variables as needed

3. **Deploy**
\`\`\`bash
vercel --prod
\`\`\`

## 🔧 Performance Optimizations

### Implemented Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Redis Caching**: Multi-layer caching with intelligent invalidation
- **Virtual Scrolling**: Handle 10,000+ tasks efficiently
- **Debounced Search**: Optimized search with 300ms debounce
- **Rate Limiting**: API protection with configurable limits
- **Optimistic Updates**: Immediate UI feedback
- **Code Splitting**: Automatic Next.js code splitting

### Scaling Considerations

- **Horizontal Scaling**: Stateless design supports multiple instances
- **Database Scaling**: Read replicas and connection pooling
- **Redis Clustering**: Distributed caching for high availability
- **CDN Integration**: Static asset optimization
- **Load Balancing**: WebSocket sticky sessions support

## 🧪 Testing

### Running Tests
\`\`\`bash
# Unit tests
npm run test

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e
\`\`\`

### Load Testing
\`\`\`bash
# API load testing
npm run load-test

# WebSocket connection testing
npm run ws-test
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔍 Troubleshooting

### Common Issues

**Database Connection Issues**
- Verify PostgreSQL is running and accessible
- Check DATABASE_URL format and credentials
- Ensure database exists and migrations are run

**Redis Connection Issues**  
- Verify Redis server is running
- Check REDIS_URL configuration
- Test Redis connectivity: `redis-cli ping`

**WebSocket Connection Issues**
- Check firewall settings for WebSocket connections
- Verify NEXT_PUBLIC_APP_URL is correctly set
- Test WebSocket endpoint directly

**Performance Issues**
- Monitor Redis cache hit rates
- Check database query performance
- Review WebSocket connection counts
- Analyze bundle size and loading times

### Support

For additional support or questions, please open an issue in the GitHub repository.
