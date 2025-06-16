import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import random
from datetime import datetime, timedelta

class QueryEngine:
    def __init__(self):
        self.mock_data = self._generate_mock_data()
    
    def _generate_mock_data(self) -> List[Dict[str, Any]]:
        """Generate mock e-commerce data"""
        regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America']
        statuses = ['completed', 'pending', 'cancelled']
        segments = ['Enterprise', 'SMB', 'Consumer']
        
        data = []
        for i in range(1000):
            created_date = datetime.now() - timedelta(days=random.randint(0, 365))
            data.append({
                'id': f'order_{i + 1}',
                'customer_id': f'customer_{random.randint(1, 200)}',
                'total': round(random.uniform(50, 1000), 2),
                'status': random.choice(statuses),
                'region': random.choice(regions),
                'customer_segment': random.choice(segments),
                'created_at': created_date.isoformat(),
                'month': created_date.strftime('%Y-%m'),
                'year': created_date.year
            })
        
        return data
    
    async def execute(self, sql: str, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Execute SQL query against mock data"""
        try:
            # Simple query processing based on SQL patterns
            sql_lower = sql.lower()
            
            if 'date_trunc' in sql_lower and 'revenue' in sql_lower:
                return self._process_revenue_by_period()
            elif 'segment' in sql_lower:
                return self._process_customer_segments()
            elif 'region' in sql_lower:
                return self._process_revenue_by_region()
            else:
                return self._process_basic_aggregation()
                
        except Exception as e:
            raise Exception(f"Query execution failed: {str(e)}")
    
    def _process_revenue_by_period(self) -> Dict[str, Any]:
        """Process revenue by time period queries"""
        df = pd.DataFrame(self.mock_data)
        monthly_revenue = df.groupby('month')['total'].sum().reset_index()
        monthly_revenue = monthly_revenue.sort_values('month')
        
        data = [
            {'period': row['month'], 'revenue': round(row['total'], 2)}
            for _, row in monthly_revenue.iterrows()
        ]
        
        return {
            'data': data,
            'columns': [
                {'name': 'period', 'type': 'string'},
                {'name': 'revenue', 'type': 'number'}
            ]
        }
    
    def _process_customer_segments(self) -> Dict[str, Any]:
        """Process customer segment analysis"""
        df = pd.DataFrame(self.mock_data)
        segment_stats = df.groupby('customer_segment').agg({
            'id': 'count',
            'total': ['sum', 'mean']
        }).reset_index()
        
        segment_stats.columns = ['segment', 'order_count', 'total_revenue', 'avg_order_value']
        
        data = [
            {
                'segment': row['segment'],
                'order_count': int(row['order_count']),
                'total_revenue': round(row['total_revenue'], 2),
                'avg_order_value': round(row['avg_order_value'], 2)
            }
            for _, row in segment_stats.iterrows()
        ]
        
        return {
            'data': data,
            'columns': [
                {'name': 'segment', 'type': 'string'},
                {'name': 'order_count', 'type': 'number'},
                {'name': 'total_revenue', 'type': 'number'},
                {'name': 'avg_order_value', 'type': 'number'}
            ]
        }
    
    def _process_revenue_by_region(self) -> Dict[str, Any]:
        """Process revenue by region"""
        df = pd.DataFrame(self.mock_data)
        region_revenue = df.groupby('region')['total'].sum().reset_index()
        
        data = [
            {'region': row['region'], 'revenue': round(row['total'], 2)}
            for _, row in region_revenue.iterrows()
        ]
        
        return {
            'data': data,
            'columns': [
                {'name': 'region', 'type': 'string'},
                {'name': 'revenue', 'type': 'number'}
            ]
        }
    
    def _process_basic_aggregation(self) -> Dict[str, Any]:
        """Process basic aggregation queries"""
        df = pd.DataFrame(self.mock_data)
        
        total_revenue = df['total'].sum()
        order_count = len(df)
        avg_order_value = df['total'].mean()
        
        data = [{
            'count': order_count,
            'total_amount': round(total_revenue, 2),
            'avg_amount': round(avg_order_value, 2)
        }]
        
        return {
            'data': data,
            'columns': [
                {'name': 'count', 'type': 'number'},
                {'name': 'total_amount', 'type': 'number'},
                {'name': 'avg_amount', 'type': 'number'}
            ]
        }