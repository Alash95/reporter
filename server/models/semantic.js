// Semantic models for defining metrics, dimensions, and relationships
class SemanticModels {
  constructor() {
    this.models = new Map();
    this.initializeDefaultModels();
  }

  initializeDefaultModels() {
    // Sample e-commerce model
    const ecommerceModel = {
      id: 'ecommerce',
      name: 'E-commerce Analytics',
      description: 'Sales, orders, and customer metrics',
      tables: {
        orders: {
          sql: 'SELECT * FROM orders',
          columns: {
            id: { type: 'string', primary: true },
            customer_id: { type: 'string' },
            total: { type: 'number' },
            status: { type: 'string' },
            created_at: { type: 'datetime' },
            region: { type: 'string' }
          }
        },
        customers: {
          sql: 'SELECT * FROM customers',
          columns: {
            id: { type: 'string', primary: true },
            name: { type: 'string' },
            email: { type: 'string' },
            segment: { type: 'string' },
            created_at: { type: 'datetime' }
          }
        }
      },
      metrics: [
        {
          name: 'total_revenue',
          title: 'Total Revenue',
          type: 'sum',
          sql: 'SUM(orders.total)',
          format: 'currency'
        },
        {
          name: 'order_count',
          title: 'Order Count',
          type: 'count',
          sql: 'COUNT(orders.id)',
          format: 'number'
        },
        {
          name: 'avg_order_value',
          title: 'Average Order Value',
          type: 'avg',
          sql: 'AVG(orders.total)',
          format: 'currency'
        }
      ],
      dimensions: [
        {
          name: 'order_status',
          title: 'Order Status',
          sql: 'orders.status',
          type: 'string'
        },
        {
          name: 'customer_segment',
          title: 'Customer Segment',
          sql: 'customers.segment',
          type: 'string'
        },
        {
          name: 'region',
          title: 'Region',
          sql: 'orders.region',
          type: 'string'
        },
        {
          name: 'order_date',
          title: 'Order Date',
          sql: 'orders.created_at',
          type: 'datetime'
        }
      ],
      joins: [
        {
          name: 'order_customer',
          sql: 'orders.customer_id = customers.id'
        }
      ]
    };

    this.models.set('ecommerce', ecommerceModel);
  }

  getAllModels() {
    return Array.from(this.models.values());
  }

  getModel(id) {
    return this.models.get(id);
  }

  createModel(modelData) {
    const id = modelData.id || `model_${Date.now()}`;
    this.models.set(id, { ...modelData, id });
    return this.models.get(id);
  }

  getMetrics(modelId) {
    const model = this.getModel(modelId);
    return model ? model.metrics : [];
  }

  getDimensions(modelId) {
    const model = this.getModel(modelId);
    return model ? model.dimensions : [];
  }
}

export const semanticModels = new SemanticModels();