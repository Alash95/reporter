// Query execution engine with mock data
class QueryEngine {
  constructor() {
    this.queryStats = [];
    this.mockData = this.generateMockData();
  }

  generateMockData() {
    const data = [];
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
    const statuses = ['completed', 'pending', 'cancelled'];
    const segments = ['Enterprise', 'SMB', 'Consumer'];

    for (let i = 0; i < 1000; i++) {
      data.push({
        id: `order_${i + 1}`,
        customer_id: `customer_${Math.floor(Math.random() * 200) + 1}`,
        total: Math.round((Math.random() * 1000 + 50) * 100) / 100,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        region: regions[Math.floor(Math.random() * regions.length)],
        customer_segment: segments[Math.floor(Math.random() * segments.length)],
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return data;
  }

  async execute(sql, model) {
    const startTime = Date.now();
    
    try {
      // Mock query execution with transformed data
      const result = this.processQuery(sql);
      const executionTime = Date.now() - startTime;

      // Log query statistics
      this.queryStats.push({
        sql,
        executionTime,
        rowCount: result.data.length,
        timestamp: new Date().toISOString()
      });

      return {
        data: result.data,
        columns: result.columns,
        rowCount: result.data.length,
        executionTime,
        queryId: `query_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  processQuery(sql) {
    // Simple query processing for common patterns
    if (sql.includes('DATE_TRUNC') && sql.includes('revenue')) {
      return this.processRevenueByPeriod();
    }
    
    if (sql.includes('segment')) {
      return this.processCustomerSegments();
    }

    if (sql.includes('region')) {
      return this.processRevenueByRegion();
    }

    // Default aggregation
    return this.processBasicAggregation();
  }

  processRevenueByPeriod() {
    const monthlyData = {};
    
    this.mockData.forEach(order => {
      const date = new Date(order.created_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += order.total;
    });

    const data = Object.entries(monthlyData).map(([period, revenue]) => ({
      period,
      revenue: Math.round(revenue * 100) / 100
    })).sort((a, b) => a.period.localeCompare(b.period));

    return {
      data,
      columns: [
        { name: 'period', type: 'string' },
        { name: 'revenue', type: 'number' }
      ]
    };
  }

  processCustomerSegments() {
    const segmentData = {};
    
    this.mockData.forEach(order => {
      const segment = order.customer_segment;
      
      if (!segmentData[segment]) {
        segmentData[segment] = {
          segment,
          order_count: 0,
          total_revenue: 0
        };
      }
      
      segmentData[segment].order_count += 1;
      segmentData[segment].total_revenue += order.total;
    });

    const data = Object.values(segmentData).map(segment => ({
      ...segment,
      total_revenue: Math.round(segment.total_revenue * 100) / 100,
      avg_order_value: Math.round((segment.total_revenue / segment.order_count) * 100) / 100
    }));

    return {
      data,
      columns: [
        { name: 'segment', type: 'string' },
        { name: 'order_count', type: 'number' },
        { name: 'total_revenue', type: 'number' },
        { name: 'avg_order_value', type: 'number' }
      ]
    };
  }

  processRevenueByRegion() {
    const regionData = {};
    
    this.mockData.forEach(order => {
      const region = order.region;
      
      if (!regionData[region]) {
        regionData[region] = 0;
      }
      regionData[region] += order.total;
    });

    const data = Object.entries(regionData).map(([region, revenue]) => ({
      region,
      revenue: Math.round(revenue * 100) / 100
    }));

    return {
      data,
      columns: [
        { name: 'region', type: 'string' },
        { name: 'revenue', type: 'number' }
      ]
    };
  }

  processBasicAggregation() {
    const totalRevenue = this.mockData.reduce((sum, order) => sum + order.total, 0);
    const orderCount = this.mockData.length;

    return {
      data: [{
        count: orderCount,
        total_amount: Math.round(totalRevenue * 100) / 100,
        avg_amount: Math.round((totalRevenue / orderCount) * 100) / 100
      }],
      columns: [
        { name: 'count', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'avg_amount', type: 'number' }
      ]
    };
  }

  getQueryAnalytics() {
    const recentQueries = this.queryStats.slice(-50);
    const avgExecutionTime = recentQueries.reduce((sum, q) => sum + q.executionTime, 0) / recentQueries.length;
    
    return {
      totalQueries: this.queryStats.length,
      avgExecutionTime: Math.round(avgExecutionTime),
      recentQueries: recentQueries.slice(-10)
    };
  }
}

export const queryEngine = new QueryEngine();