// AI Query Engine for converting natural language to SQL
class AIQueryEngine {
  constructor() {
    this.queryTemplates = new Map();
    this.initializeTemplates();
  }

  initializeTemplates() {
    // Common query patterns
    this.queryTemplates.set('revenue_by_period', {
      pattern: /revenue.*by.*(month|day|year|quarter)/i,
      template: (model, timeframe) => `
        SELECT 
          DATE_TRUNC('${timeframe}', orders.created_at) as period,
          SUM(orders.total) as revenue
        FROM orders
        GROUP BY DATE_TRUNC('${timeframe}', orders.created_at)
        ORDER BY period
      `
    });

    this.queryTemplates.set('top_products', {
      pattern: /top.*products?/i,
      template: (model, limit = 10) => `
        SELECT 
          product_name,
          SUM(quantity) as total_sold,
          SUM(total) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        GROUP BY product_name
        ORDER BY revenue DESC
        LIMIT ${limit}
      `
    });

    this.queryTemplates.set('customer_segments', {
      pattern: /customer.*segment/i,
      template: (model) => `
        SELECT 
          customers.segment,
          COUNT(orders.id) as order_count,
          SUM(orders.total) as total_revenue,
          AVG(orders.total) as avg_order_value
        FROM customers
        JOIN orders ON customers.id = orders.customer_id
        GROUP BY customers.segment
        ORDER BY total_revenue DESC
      `
    });
  }

  async generateQuery(prompt, modelId) {
    // Mock AI processing - in production, this would call Azure OpenAI
    const model = this.getModelForQuery(modelId);
    
    // Pattern matching for common queries
    for (const [name, template] of this.queryTemplates) {
      if (template.pattern.test(prompt)) {
        const sql = this.generateFromTemplate(template, model, prompt);
        return {
          sql,
          explanation: this.generateExplanation(prompt, sql),
          confidence: 0.85,
          templateUsed: name
        };
      }
    }

    // Fallback to basic query generation
    return this.generateFallbackQuery(prompt, model);
  }

  generateFromTemplate(template, model, prompt) {
    // Extract parameters from prompt
    const timeframe = this.extractTimeframe(prompt);
    const limit = this.extractLimit(prompt);
    
    return template.template(model, timeframe || 'month', limit);
  }

  extractTimeframe(prompt) {
    const timeframes = ['day', 'month', 'quarter', 'year'];
    for (const tf of timeframes) {
      if (prompt.toLowerCase().includes(tf)) {
        return tf;
      }
    }
    return null;
  }

  extractLimit(prompt) {
    const match = prompt.match(/top\s+(\d+)/i);
    return match ? parseInt(match[1]) : 10;
  }

  generateFallbackQuery(prompt, model) {
    // Simple fallback for basic aggregations
    return {
      sql: `
        SELECT 
          COUNT(*) as count,
          SUM(total) as total_amount
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `,
      explanation: 'Generated a basic aggregation query based on your request.',
      confidence: 0.6,
      templateUsed: 'fallback'
    };
  }

  generateExplanation(prompt, sql) {
    return `This query was generated based on your request: "${prompt}". It aggregates data according to common analytics patterns.`;
  }

  getModelForQuery(modelId) {
    // Return model metadata for query generation
    return { id: modelId };
  }
}

export const aiQueryEngine = new AIQueryEngine();