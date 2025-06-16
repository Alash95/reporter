import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { semanticModels } from './models/semantic.js';
import { aiQueryEngine } from './services/ai-query.js';
import { cacheService } from './services/cache.js';
import { queryEngine } from './services/query-engine.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Mock users database
const users = [
  {
    id: '1',
    email: 'admin@analytics.com',
    password: bcrypt.hashSync('password', 10),
    role: 'admin',
    tenantId: 'tenant-1'
  }
];

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// Semantic models
app.get('/api/models', authMiddleware(JWT_SECRET), (req, res) => {
  res.json(semanticModels.getAllModels());
});

app.post('/api/models', authMiddleware(JWT_SECRET), (req, res) => {
  const model = semanticModels.createModel(req.body);
  res.json(model);
});

// AI Query Generation
app.post('/api/ai/query', authMiddleware(JWT_SECRET), async (req, res) => {
  try {
    const { prompt, model } = req.body;
    const query = await aiQueryEngine.generateQuery(prompt, model);
    res.json(query);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query Execution
app.post('/api/query/execute', authMiddleware(JWT_SECRET), async (req, res) => {
  try {
    const { sql, model, useCache = true } = req.body;
    
    // Check cache first
    if (useCache) {
      const cached = cacheService.get(sql);
      if (cached) {
        return res.json({ ...cached, fromCache: true });
      }
    }

    const result = await queryEngine.execute(sql, model);
    
    // Cache the result
    if (useCache) {
      cacheService.set(sql, result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics and Dimensions
app.get('/api/metrics', authMiddleware(JWT_SECRET), (req, res) => {
  const { modelId } = req.query;
  const metrics = semanticModels.getMetrics(modelId);
  res.json(metrics);
});

app.get('/api/dimensions', authMiddleware(JWT_SECRET), (req, res) => {
  const { modelId } = req.query;
  const dimensions = semanticModels.getDimensions(modelId);
  res.json(dimensions);
});

// Query Analytics
app.get('/api/analytics/queries', authMiddleware(JWT_SECRET), (req, res) => {
  const analytics = queryEngine.getQueryAnalytics();
  res.json(analytics);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Analytics API server running on port ${PORT}`);
});