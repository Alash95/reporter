import openai
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
import json
import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv
load_dotenv()

class AIService:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv("AZURE_OPENAI_KEY"))
    
    async def generate_sql_query(self, prompt: str, model: Optional[Any] = None) -> Dict[str, Any]:
        """Generate SQL query from natural language prompt"""
        
        system_prompt = """You are an expert SQL query generator. Generate SQL queries based on natural language prompts.
        
        Rules:
        1. Generate valid SQL queries
        2. Use appropriate aggregations and grouping
        3. Include helpful comments
        4. Provide confidence score (0-1)
        5. Explain what the query does
        
        Return JSON format:
        {
            "sql": "SELECT ...",
            "explanation": "This query...",
            "confidence": 0.95
        }
        """
        
        if model:
            schema_info = f"Database schema: {json.dumps(model.schema_definition, indent=2)}"
            system_prompt += f"\n\n{schema_info}"
        
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
            # Fallback response
            return {
                "sql": f"-- Generated from: {prompt}\nSELECT * FROM data LIMIT 10;",
                "explanation": "Basic data preview query",
                "confidence": 0.5
            }
    
    async def explain_query(self, sql: str) -> str:
        """Explain what a SQL query does"""
        
        system_prompt = """You are an expert at explaining SQL queries in simple terms.
        Explain what the given SQL query does in plain English."""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Explain this SQL query: {sql}"}
                ],
                temperature=0.1
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return "Unable to explain this query at the moment."
    
    async def analyze_dataset(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze dataset and provide insights"""
        
        if not data or 'rows' not in data:
            return {"error": "Invalid data format"}
        
        try:
            df = pd.DataFrame(data['rows'])
            
            analysis = {
                "summary": {
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "missing_values": df.isnull().sum().to_dict(),
                    "data_types": df.dtypes.astype(str).to_dict()
                },
                "insights": [],
                "recommended_visualizations": [],
                "data_quality": {},
                "suggested_questions": []
            }
            
            # Generate insights using AI
            data_summary = f"""
            Dataset Summary:
            - Rows: {len(df)}
            - Columns: {list(df.columns)}
            - Data types: {df.dtypes.to_dict()}
            - Missing values: {df.isnull().sum().to_dict()}
            
            Sample data:
            {df.head().to_string()}
            """
            
            insights_prompt = f"""
            Analyze this dataset and provide:
            1. Key insights about the data
            2. Recommended visualizations
            3. Data quality assessment
            4. Suggested analytical questions
            
            {data_summary}
            
            Return as JSON with keys: insights, recommended_visualizations, data_quality, suggested_questions
            """
            
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a data analyst. Provide comprehensive data analysis."},
                    {"role": "user", "content": insights_prompt}
                ],
                temperature=0.3
            )
            
            ai_analysis = json.loads(response.choices[0].message.content)
            analysis.update(ai_analysis)
            
            return analysis
            
        except Exception as e:
            return {
                "summary": {"error": str(e)},
                "insights": ["Unable to analyze data at the moment"],
                "recommended_visualizations": [],
                "data_quality": {},
                "suggested_questions": []
            }
    
    async def process_conversation(
        self, 
        message: str, 
        context: Dict[str, Any], 
        available_data: List[Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Process conversational AI requests"""
        
        data_summary = ""
        if available_data:
            data_summary = f"Available datasets: {[f.original_filename for f in available_data]}"
        
        system_prompt = f"""
        You are an AI analytics assistant. Help users analyze their data and answer questions.
        
        {data_summary}
        
        Provide helpful responses about data analysis, insights, and visualizations.
        When possible, suggest specific queries or visualizations.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7
            )
            
            return {
                "response": response.choices[0].message.content,
                "generated_query": None,
                "suggested_chart": None,
                "insights": []
            }
            
        except Exception as e:
            return {
                "response": "I'm here to help you analyze your data! Please tell me what you'd like to explore.",
                "generated_query": None,
                "suggested_chart": None,
                "insights": []
            }