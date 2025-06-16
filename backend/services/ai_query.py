import re
from typing import Dict, Any, Optional
from models import SemanticModel

class AIQueryService:
    def __init__(self):
        self.query_templates = {
            'revenue_by_period': {
                'pattern': r'revenue.*by.*(month|day|year|quarter)',
                'template': lambda timeframe: f"""
                    SELECT 
                        DATE_TRUNC('{timeframe}', orders.created_at) as period,
                        SUM(orders.total) as revenue
                    FROM orders
                    GROUP BY DATE_TRUNC('{timeframe}', orders.created_at)
                    ORDER BY period
                """
            },
            'top_products': {
                'pattern': r'top.*products?',
                'template': lambda limit=10: f"""
                    SELECT 
                        product_name,
                        SUM(quantity) as total_sold,
                        SUM(total) as revenue
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    GROUP BY product_name
                    ORDER BY revenue DESC
                    LIMIT {limit}
                """
            },
            'customer_segments': {
                'pattern': r'customer.*segment',
                'template': lambda: """
                    SELECT 
                        customers.segment,
                        COUNT(orders.id) as order_count,
                        SUM(orders.total) as total_revenue,
                        AVG(orders.total) as avg_order_value
                    FROM customers
                    JOIN orders ON customers.id = orders.customer_id
                    GROUP BY customers.segment
                    ORDER BY total_revenue DESC
                """
            },
            'revenue_by_region': {
                'pattern': r'revenue.*by.*region',
                'template': lambda: """
                    SELECT 
                        region,
                        SUM(total) as revenue
                    FROM orders
                    GROUP BY region
                    ORDER BY revenue DESC
                """
            }
        }
    
    async def generate_query(self, prompt: str, model: Optional[SemanticModel] = None) -> Dict[str, Any]:
        """Generate SQL query from natural language prompt"""
        prompt_lower = prompt.lower()
        
        # Pattern matching for common queries
        for template_name, template_info in self.query_templates.items():
            if re.search(template_info['pattern'], prompt_lower, re.IGNORECASE):
                sql = self._generate_from_template(template_info, prompt)
                return {
                    'sql': sql.strip(),
                    'explanation': self._generate_explanation(prompt, sql),
                    'confidence': 0.85,
                    'template_used': template_name
                }
        
        # Fallback to basic query
        return self._generate_fallback_query(prompt)
    
    def _generate_from_template(self, template_info: Dict, prompt: str) -> str:
        """Generate SQL from template"""
        # Extract parameters from prompt
        timeframe = self._extract_timeframe(prompt)
        limit = self._extract_limit(prompt)
        
        if 'revenue_by_period' in str(template_info['pattern']):
            return template_info['template'](timeframe or 'month')
        elif 'top_products' in str(template_info['pattern']):
            return template_info['template'](limit or 10)
        else:
            return template_info['template']()
    
    def _extract_timeframe(self, prompt: str) -> Optional[str]:
        """Extract timeframe from prompt"""
        timeframes = ['day', 'month', 'quarter', 'year']
        for tf in timeframes:
            if tf in prompt.lower():
                return tf
        return None
    
    def _extract_limit(self, prompt: str) -> Optional[int]:
        """Extract limit from prompt"""
        match = re.search(r'top\s+(\d+)', prompt.lower())
        return int(match.group(1)) if match else None
    
    def _generate_fallback_query(self, prompt: str) -> Dict[str, Any]:
        """Generate fallback query for unrecognized prompts"""
        return {
            'sql': """
                SELECT 
                    COUNT(*) as count,
                    SUM(total) as total_amount,
                    AVG(total) as avg_amount
                FROM orders
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            """.strip(),
            'explanation': f'Generated a basic aggregation query based on your request: "{prompt}"',
            'confidence': 0.6,
            'template_used': 'fallback'
        }
    
    def _generate_explanation(self, prompt: str, sql: str) -> str:
        """Generate explanation for the generated SQL"""
        return f'This query was generated based on your request: "{prompt}". It aggregates data according to common analytics patterns.'
    
    async def explain_query(self, sql: str) -> str:
        """Explain what a SQL query does"""
        # Simple query explanation based on SQL keywords
        sql_lower = sql.lower()
        
        explanations = []
        
        if 'select' in sql_lower:
            explanations.append("This query retrieves data")
        
        if 'sum(' in sql_lower:
            explanations.append("calculates totals")
        
        if 'count(' in sql_lower:
            explanations.append("counts records")
        
        if 'avg(' in sql_lower:
            explanations.append("computes averages")
        
        if 'group by' in sql_lower:
            explanations.append("groups results by specific columns")
        
        if 'order by' in sql_lower:
            explanations.append("sorts the results")
        
        if 'where' in sql_lower:
            explanations.append("filters data based on conditions")
        
        if 'join' in sql_lower:
            explanations.append("combines data from multiple tables")
        
        if explanations:
            return f"This query {', '.join(explanations)}."
        else:
            return "This is a SQL query that performs data operations."