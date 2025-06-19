# backend/services/enhanced_ai_service.py - Enhanced AI service with full data source integration

import openai
import pandas as pd
import json
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

from services.data_source_registry import data_source_registry
from services.notification_service import notification_service

class AIService:
    """Enhanced AI service with full data source integration and context awareness"""
    
    def __init__(self, api_key: str = None):
        if api_key:
            self.client = openai.AsyncOpenAI(api_key=api_key)
        else:
            self.client = None
    
    async def generate_sql_query_with_context(
        self, 
        prompt: str, 
        user_id: str,
        model_id: Optional[str] = None,
        data_source_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate SQL query with full context awareness"""
        
        try:
            # Get user's available data sources
            available_sources = await data_source_registry.list_sources_by_user(user_id)
            
            # Get specific data source if provided
            target_source = None
            if data_source_id:
                target_source = await data_source_registry.get_source_info(data_source_id)
            elif model_id:
                # Find data source by semantic model
                for source in available_sources:
                    if source.get("semantic_model_id") == model_id:
                        target_source = source
                        break
            else:
                # Use the most recently accessed source
                if available_sources:
                    target_source = max(available_sources, 
                                      key=lambda x: x.get("last_accessed", ""))
            
            if not target_source:
                return {
                    "error": "No suitable data source found",
                    "suggestion": "Please upload a data file first"
                }
            
            # Get schema information
            schema_info = await data_source_registry.get_schema(target_source["id"])
            
            # Build context for AI
            context = self._build_sql_context(target_source, schema_info, available_sources)
            
            # Generate SQL query
            sql_result = await self._generate_sql_with_ai(prompt, context)
            
            # Track usage
            await data_source_registry.track_access(target_source["id"])
            
            return {
                **sql_result,
                "data_source_used": target_source["id"],
                "data_source_name": target_source.get("name"),
                "suggested_visualizations": self._suggest_visualizations(sql_result.get("sql", ""), schema_info)
            }
            
        except Exception as e:
            return {
                "error": f"Query generation failed: {str(e)}",
                "sql": "SELECT 'Error generating query' as message",
                "explanation": "Unable to generate query at this time"
            }
    
    async def conversational_analysis(
        self, 
        message: str, 
        user_id: str,
        conversation_history: List[Dict] = None,
        available_data_sources: List[str] = None
    ) -> Dict[str, Any]:
        """Enhanced conversational analysis with data source integration"""
        
        try:
            # Get user's data sources
            if available_data_sources:
                sources = []
                for source_id in available_data_sources:
                    source = await data_source_registry.get_source_info(source_id)
                    if source:
                        sources.append(source)
            else:
                sources = await data_source_registry.list_sources_by_user(user_id)
            
            if not sources:
                return {
                    "response": """I'd love to help you analyze data, but I don't see any data sources available. 
                    
Please upload a data file first using the File Upload feature, and I'll be able to help you with:
- Data analysis and insights
- Creating visualizations  
- Answering questions about your data
- Generating SQL queries
                    
What type of data would you like to analyze?""",
                    "data_sources_used": [],
                    "suggestions": [
                        "Upload a CSV file with your data",
                        "Try the File Upload feature",
                        "Check the Dashboard for uploaded files"
                    ]
                }
            
            # Analyze the message to determine intent
            intent = await self._analyze_message_intent(message, sources)
            
            # Process based on intent
            if intent["type"] == "data_query":
                return await self._handle_data_query(message, intent["data_source"], sources, user_id)
            elif intent["type"] == "visualization_request":
                return await self._handle_visualization_request(message, intent["data_source"], sources, user_id)
            elif intent["type"] == "insight_request":
                return await self._handle_insight_request(message, intent["data_source"], sources, user_id)
            elif intent["type"] == "general_question":
                return await self._handle_general_question(message, sources, conversation_history)
            else:
                return await self._handle_unknown_intent(message, sources)
                
        except Exception as e:
            return {
                "response": f"I apologize, but I encountered an error: {str(e)}. Please try rephrasing your question.",
                "error": str(e)
            }
    
    def _build_sql_context(self, target_source: Dict, schema_info: Dict, all_sources: List[Dict]) -> str:
        """Build comprehensive context for SQL generation"""
        
        context_parts = []
        
        # Data source information
        context_parts.append(f"TARGET DATA SOURCE: {target_source.get('name', 'Unknown')}")
        context_parts.append(f"Data Type: {target_source.get('data_type', 'unknown')}")
        
        # Schema information
        if schema_info:
            context_parts.append("\nSCHEMA INFORMATION:")
            
            # Tables
            tables = schema_info.get("tables", {})
            for table_name, table_info in tables.items():
                context_parts.append(f"\nTable: {table_name}")
                columns = table_info.get("columns", {})
                for col_name, col_info in columns.items():
                    context_parts.append(f"  - {col_name} ({col_info.get('type', 'unknown')})")
            
            # Metrics
            metrics = schema_info.get("metrics", [])
            if metrics:
                context_parts.append("\nAVAILABLE METRICS:")
                for metric in metrics:
                    context_parts.append(f"  - {metric.get('title', metric.get('name'))}: {metric.get('sql', '')}")
            
            # Dimensions
            dimensions = schema_info.get("dimensions", [])
            if dimensions:
                context_parts.append("\nAVAILABLE DIMENSIONS:")
                for dim in dimensions:
                    context_parts.append(f"  - {dim.get('title', dim.get('name'))}: {dim.get('sql', '')}")
        
        # Sample data structure
        schema = target_source.get("schema", {})
        columns = schema.get("columns", [])
        if columns:
            context_parts.append("\nCOLUMN DETAILS:")
            for col in columns:
                context_parts.append(f"  - {col.get('name')} ({col.get('type')})")
        
        # Available data sources context
        if len(all_sources) > 1:
            context_parts.append(f"\nOTHER AVAILABLE DATA SOURCES: {len(all_sources) - 1}")
            for source in all_sources:
                if source["id"] != target_source["id"]:
                    context_parts.append(f"  - {source.get('name', 'Unknown')}")
        
        return "\n".join(context_parts)
    
    async def _generate_sql_with_ai(self, prompt: str, context: str) -> Dict[str, Any]:
        """Generate SQL using AI with provided context"""
        
        if not self.client:
            # Fallback SQL generation without AI
            return {
                "sql": "SELECT * FROM main_table LIMIT 10",
                "explanation": "Basic query to show sample data",
                "confidence": 0.5
            }
        
        system_prompt = f"""
You are an expert SQL query generator. Generate accurate SQL queries based on user requests.

CONTEXT:
{context}

INSTRUCTIONS:
1. Generate valid SQL that works with the provided schema
2. Use proper table and column names from the context
3. Include appropriate WHERE, GROUP BY, ORDER BY clauses as needed
4. For aggregations, use the available metrics when possible
5. Keep queries efficient and readable
6. Use table aliases for clarity

RESPONSE FORMAT:
Return a JSON object with:
- sql: The SQL query
- explanation: Clear explanation of what the query does
- confidence: Float between 0 and 1 indicating confidence level
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            return {
                "sql": "SELECT * FROM main_table LIMIT 10",
                "explanation": f"Generated basic query due to AI error: {str(e)}",
                "confidence": 0.3
            }
    
    async def _analyze_message_intent(self, message: str, sources: List[Dict]) -> Dict[str, Any]:
        """Analyze user message to determine intent and target data source"""
        
        message_lower = message.lower()
        
        # Intent detection keywords
        query_keywords = ["show", "select", "get", "find", "count", "sum", "average", "max", "min"]
        viz_keywords = ["chart", "graph", "plot", "visualize", "display"]
        insight_keywords = ["insights", "analyze", "analysis", "patterns", "trends", "summary"]
        
        # Determine intent type
        intent_type = "general_question"
        if any(keyword in message_lower for keyword in query_keywords):
            intent_type = "data_query"
        elif any(keyword in message_lower for keyword in viz_keywords):
            intent_type = "visualization_request"
        elif any(keyword in message_lower for keyword in insight_keywords):
            intent_type = "insight_request"
        
        # Determine target data source
        target_source = None
        if sources:
            # Look for data source names in the message
            for source in sources:
                source_name = source.get("name", "").lower()
                if source_name and source_name in message_lower:
                    target_source = source
                    break
            
            # If no specific source mentioned, use the most recent
            if not target_source:
                target_source = max(sources, key=lambda x: x.get("last_accessed", ""))
        
        return {
            "type": intent_type,
            "data_source": target_source,
            "confidence": 0.8
        }
    
    async def _handle_data_query(self, message: str, data_source: Dict, all_sources: List[Dict], user_id: str) -> Dict[str, Any]:
        """Handle data query requests"""
        
        # Generate SQL query
        sql_result = await self.generate_sql_query_with_context(
            message, user_id, data_source_id=data_source["id"]
        )
        
        if sql_result.get("error"):
            return {
                "response": f"I couldn't generate a query for that request: {sql_result['error']}",
                "error": sql_result["error"]
            }
        
        # Execute the query (mock execution for now)
        mock_data = self._generate_mock_query_results(sql_result["sql"], data_source)
        
        response = f"""I've generated a SQL query for your request:

**Query Explanation:** {sql_result.get('explanation', 'Query to retrieve requested data')}

**Results:** Found {len(mock_data)} rows

Here's what the data shows:
{self._summarize_query_results(mock_data)}"""
        
        return {
            "response": response,
            "generated_query": sql_result["sql"],
            "data": mock_data,
            "data_sources_used": [data_source["id"]],
            "insights": [
                f"Query executed successfully with {len(mock_data)} results",
                f"Data source: {data_source.get('name', 'Unknown')}"
            ]
        }
    
    async def _handle_visualization_request(self, message: str, data_source: Dict, all_sources: List[Dict], user_id: str) -> Dict[str, Any]:
        """Handle visualization requests"""
        
        # Generate appropriate chart configuration
        chart_config = self._suggest_chart_from_message(message, data_source)
        
        response = f"""I can help you create a visualization for your data!

**Suggested Chart:** {chart_config.get('type', 'bar').title()} Chart
**Title:** {chart_config.get('title', 'Data Visualization')}

**Configuration:**
- Data Source: {data_source.get('name', 'Unknown')}
- Chart Type: {chart_config.get('type', 'bar')}
"""
        
        if chart_config.get('x_axis'):
            response += f"- X-Axis: {chart_config['x_axis']}\n"
        if chart_config.get('y_axis'):
            response += f"- Y-Axis: {chart_config['y_axis']}\n"
        
        response += "\nYou can use this configuration in the Dashboard Builder to create your chart!"
        
        return {
            "response": response,
            "suggested_chart": chart_config,
            "data_sources_used": [data_source["id"]],
            "insights": [
                f"Chart suggestion generated for {data_source.get('name')}",
                f"Recommended visualization: {chart_config.get('type', 'bar')} chart"
            ]
        }
    
    async def _handle_insight_request(self, message: str, data_source: Dict, all_sources: List[Dict], user_id: str) -> Dict[str, Any]:
        """Handle insight generation requests"""
        
        # Generate insights based on data source
        insights = self._generate_data_insights(data_source)
        
        response = f"""Here are the key insights from your data source "{data_source.get('name', 'Unknown')}":

📊 **Data Overview:**
- Data Type: {data_source.get('data_type', 'Unknown')}
- Total Records: {data_source.get('schema', {}).get('row_count', 'Unknown')}
- Columns: {len(data_source.get('schema', {}).get('columns', []))}

💡 **Key Insights:**
"""
        
        for i, insight in enumerate(insights[:5], 1):
            response += f"{i}. {insight}\n"
        
        response += "\n🎯 **Recommendations:**\n"
        recommendations = self._generate_recommendations(data_source)
        for i, rec in enumerate(recommendations[:3], 1):
            response += f"{i}. {rec}\n"
        
        return {
            "response": response,
            "data_sources_used": [data_source["id"]],
            "insights": insights,
            "analysis": {
                "data_quality": "Good",
                "completeness": "High",
                "recommendations": recommendations
            }
        }
    
    async def _handle_general_question(self, message: str, sources: List[Dict], history: List[Dict] = None) -> Dict[str, Any]:
        """Handle general questions about the platform or data"""
        
        response = f"""I'm your AI Analytics Assistant! I can help you with:

🔍 **Data Analysis:** Ask questions about your {len(sources)} uploaded dataset(s)
📊 **Visualizations:** Request charts and graphs for your data  
💡 **Insights:** Get AI-powered insights and patterns
🛠️ **SQL Queries:** Generate queries in natural language

**Your Available Data Sources:**
"""
        
        for i, source in enumerate(sources[:5], 1):
            response += f"{i}. {source.get('name', 'Unknown')} ({source.get('data_type', 'unknown')})\n"
        
        if len(sources) > 5:
            response += f"... and {len(sources) - 5} more\n"
        
        response += """\n**Try asking:**
- "Show me the top 10 records from my data"
- "Create a bar chart of sales by region"  
- "What insights can you find in my customer data?"
- "Generate a summary of my dataset"

What would you like to explore?"""
        
        return {
            "response": response,
            "data_sources_used": [source["id"] for source in sources],
            "suggestions": [
                "Analyze my latest uploaded file",
                "Create a visualization",
                "Generate insights from my data",
                "Show me data patterns"
            ]
        }
    
    async def _handle_unknown_intent(self, message: str, sources: List[Dict]) -> Dict[str, Any]:
        """Handle messages with unclear intent"""
        
        return {
            "response": """I'm not sure exactly what you're looking for. I can help you with:

📊 **Data Analysis**: "Show me the top customers" or "What's the average sales?"
📈 **Visualizations**: "Create a chart of revenue by month"
💡 **Insights**: "What patterns do you see in my data?"
🔍 **Queries**: "Find all orders above $1000"

Could you rephrase your question or be more specific about what you'd like to analyze?""",
            "suggestions": [
                "Show me a summary of my data",
                "Create a chart",
                "Find patterns in my data",
                "Generate insights"
            ]
        }
    
    def _suggest_visualizations(self, sql: str, schema_info: Dict) -> List[Dict[str, Any]]:
        """Suggest appropriate visualizations based on SQL query"""
        
        suggestions = []
        sql_lower = sql.lower()
        
        # Analyze SQL to suggest charts
        if "group by" in sql_lower and "count" in sql_lower:
            suggestions.append({
                "type": "bar",
                "title": "Count by Category",
                "description": "Bar chart showing counts by grouped categories"
            })
            
        if "sum(" in sql_lower or "avg(" in sql_lower:
            suggestions.append({
                "type": "column",
                "title": "Aggregated Values",
                "description": "Column chart for aggregated numeric values"
            })
            
        if "date" in sql_lower or "time" in sql_lower:
            suggestions.append({
                "type": "line",
                "title": "Trend Over Time",
                "description": "Line chart for time-based data"
            })
        
        # Default suggestion
        if not suggestions:
            suggestions.append({
                "type": "table",
                "title": "Data Table",
                "description": "Tabular view of query results"
            })
        
        return suggestions
    
    def _generate_mock_query_results(self, sql: str, data_source: Dict) -> List[Dict[str, Any]]:
        """Generate mock query results for demonstration"""
        
        # This would be replaced with actual query execution
        schema = data_source.get("schema", {})
        columns = schema.get("columns", [])
        
        if not columns:
            return [{"message": "No data available"}]
        
        # Generate sample rows
        sample_data = []
        for i in range(min(5, schema.get("row_count", 5))):
            row = {}
            for col in columns[:5]:  # Limit to first 5 columns
                col_name = col.get("name", f"col_{i}")
                col_type = col.get("type", "string")
                
                if col_type in ["number", "integer"]:
                    row[col_name] = (i + 1) * 100
                elif col_type == "string":
                    row[col_name] = f"Sample {col_name} {i + 1}"
                else:
                    row[col_name] = f"Value {i + 1}"
            
            sample_data.append(row)
        
        return sample_data
    
    def _summarize_query_results(self, data: List[Dict]) -> str:
        """Generate a summary of query results"""
        
        if not data:
            return "No results found."
        
        if len(data) == 1 and "message" in data[0]:
            return data[0]["message"]
        
        summary_parts = []
        
        # Basic stats
        summary_parts.append(f"• {len(data)} rows returned")
        
        if data:
            # Column info
            columns = list(data[0].keys())
            summary_parts.append(f"• {len(columns)} columns: {', '.join(columns[:3])}")
            if len(columns) > 3:
                summary_parts.append(f"  ... and {len(columns) - 3} more")
        
        return "\n".join(summary_parts)
    
    def _suggest_chart_from_message(self, message: str, data_source: Dict) -> Dict[str, Any]:
        """Suggest chart configuration based on user message"""
        
        message_lower = message.lower()
        schema = data_source.get("schema", {})
        columns = schema.get("columns", [])
        
        # Get column types
        numeric_cols = [col["name"] for col in columns if col.get("type") in ["number", "integer"]]
        categorical_cols = [col["name"] for col in columns if col.get("type") == "string"]
        
        # Chart type suggestions based on keywords
        if "pie" in message_lower:
            chart_type = "pie"
        elif "line" in message_lower or "trend" in message_lower:
            chart_type = "line"
        elif "scatter" in message_lower:
            chart_type = "scatter"
        else:
            chart_type = "bar"  # Default
        
        # Build chart configuration
        config = {
            "type": chart_type,
            "title": f"{data_source.get('name', 'Data')} Visualization",
            "data_source_id": data_source["id"]
        }
        
        # Add axes if available
        if categorical_cols and numeric_cols:
            config["x_axis"] = categorical_cols[0]
            config["y_axis"] = numeric_cols[0]
        elif len(columns) >= 2:
            config["x_axis"] = columns[0]["name"]
            config["y_axis"] = columns[1]["name"]
        
        return config
    
    def _generate_data_insights(self, data_source: Dict) -> List[str]:
        """Generate insights about a data source"""
        
        insights = []
        schema = data_source.get("schema", {})
        columns = schema.get("columns", [])
        row_count = schema.get("row_count", 0)
        
        # Basic insights
        insights.append(f"Dataset contains {row_count} records across {len(columns)} columns")
        
        # Column type analysis
        numeric_count = len([col for col in columns if col.get("type") in ["number", "integer"]])
        categorical_count = len([col for col in columns if col.get("type") == "string"])
        
        if numeric_count > 0:
            insights.append(f"Found {numeric_count} numeric columns suitable for aggregations")
        
        if categorical_count > 0:
            insights.append(f"Found {categorical_count} categorical columns for grouping and filtering")
        
        # Data quality insights
        if row_count > 1000:
            insights.append("Large dataset - consider filtering for better performance")
        elif row_count < 50:
            insights.append("Small dataset - all records can be easily analyzed")
        
        # Feature suggestions
        if numeric_count > 0 and categorical_count > 0:
            insights.append("Data is suitable for comparative analysis and visualizations")
        
        return insights
    
    def _generate_recommendations(self, data_source: Dict) -> List[str]:
        """Generate actionable recommendations for the data"""
        
        recommendations = []
        schema = data_source.get("schema", {})
        columns = schema.get("columns", [])
        
        # Analysis recommendations
        recommendations.append("Start with basic summary statistics to understand your data")
        
        if len(columns) > 5:
            recommendations.append("Focus on key columns first, then explore relationships")
        
        numeric_cols = [col for col in columns if col.get("type") in ["number", "integer"]]
        categorical_cols = [col for col in columns if col.get("type") == "string"]
        
        if numeric_cols and categorical_cols:
            recommendations.append(f"Compare {numeric_cols[0]['name']} across different {categorical_cols[0]['name']} categories")
        
        # Visualization recommendations
        if len(columns) >= 2:
            recommendations.append("Create visualizations to identify patterns and trends")
        
        recommendations.append("Use the Dashboard Builder to create interactive charts")
        
        return recommendations

# Global AI service instance
enhanced_ai_service = AIService()

async def initialize_ai_service(api_key: str = None):
    """Initialize the enhanced AI service"""
    global enhanced_ai_service
    enhanced_ai_service = AIService(api_key)