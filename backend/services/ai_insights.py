import openai
import json
import os
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Insight
import pandas as pd
import numpy as np

class AIInsightsService:
    def __init__(self):
        self.openai_client = openai.AsyncOpenAI(
            api_key=os.getenv("AZURE_OPENAI_KEY"),
            base_url=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
    
    async def generate_insights(
        self, 
        data: Dict[str, Any], 
        data_source_id: str, 
        data_source_type: str,
        user_id: str, 
        tenant_id: str
    ):
        """Generate AI insights from data"""
        db = SessionLocal()
        try:
            insights = []
            
            if data.get("type") == "tabular":
                # Generate insights for tabular data
                insights.extend(await self._analyze_tabular_data(data))
            elif data.get("type") == "text":
                # Generate insights for text data
                insights.extend(await self._analyze_text_data(data))
            
            # Store insights in database
            for insight_data in insights:
                insight = Insight(
                    title=insight_data["title"],
                    content=insight_data["content"],
                    insight_type=insight_data["type"],
                    data_source={
                        "id": data_source_id,
                        "type": data_source_type
                    },
                    confidence_score=insight_data.get("confidence", 0.8),
                    user_id=user_id,
                    tenant_id=tenant_id
                )
                db.add(insight)
            
            db.commit()
            
        except Exception as e:
            print(f"Error generating insights: {str(e)}")
        finally:
            db.close()
    
    async def _analyze_tabular_data(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze tabular data and generate insights"""
        insights = []
        
        try:
            # Convert to DataFrame for analysis
            df = pd.DataFrame(data["rows"])
            
            # Basic statistics insights
            insights.extend(self._generate_statistical_insights(df))
            
            # Trend analysis
            insights.extend(self._generate_trend_insights(df))
            
            # Anomaly detection
            insights.extend(self._generate_anomaly_insights(df))
            
            # AI-powered insights using OpenAI
            ai_insights = await self._generate_ai_insights(df)
            insights.extend(ai_insights)
            
        except Exception as e:
            print(f"Error in tabular analysis: {str(e)}")
        
        return insights
    
    def _generate_statistical_insights(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate basic statistical insights"""
        insights = []
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            if df[col].notna().sum() > 0:
                mean_val = df[col].mean()
                median_val = df[col].median()
                std_val = df[col].std()
                
                insights.append({
                    "title": f"{col} Statistical Summary",
                    "content": f"The average {col} is {mean_val:.2f}, with a median of {median_val:.2f} and standard deviation of {std_val:.2f}.",
                    "type": "summary",
                    "confidence": 0.9
                })
        
        return insights
    
    def _generate_trend_insights(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate trend insights"""
        insights = []
        
        # Look for date columns
        date_columns = df.select_dtypes(include=['datetime64']).columns
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for date_col in date_columns:
            for num_col in numeric_columns:
                if len(df) > 5:  # Need enough data points
                    # Simple trend analysis
                    df_sorted = df.sort_values(date_col)
                    correlation = np.corrcoef(range(len(df_sorted)), df_sorted[num_col].fillna(0))[0, 1]
                    
                    if abs(correlation) > 0.5:
                        trend = "increasing" if correlation > 0 else "decreasing"
                        insights.append({
                            "title": f"{num_col} Trend Over Time",
                            "content": f"There is a {trend} trend in {num_col} over time (correlation: {correlation:.2f}).",
                            "type": "trend",
                            "confidence": min(abs(correlation), 0.95)
                        })
        
        return insights
    
    def _generate_anomaly_insights(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate anomaly detection insights"""
        insights = []
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            if df[col].notna().sum() > 10:  # Need enough data
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
                
                if len(outliers) > 0:
                    insights.append({
                        "title": f"Outliers Detected in {col}",
                        "content": f"Found {len(outliers)} outliers in {col}. Values outside the range [{lower_bound:.2f}, {upper_bound:.2f}] may require attention.",
                        "type": "anomaly",
                        "confidence": 0.8
                    })
        
        return insights
    
    async def _generate_ai_insights(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate AI-powered insights using OpenAI"""
        insights = []
        
        try:
            # Prepare data summary for AI
            data_summary = {
                "shape": df.shape,
                "columns": list(df.columns),
                "dtypes": df.dtypes.to_dict(),
                "sample_data": df.head(5).to_dict('records'),
                "statistics": df.describe().to_dict() if len(df.select_dtypes(include=[np.number]).columns) > 0 else {}
            }
            
            prompt = f"""
            Analyze the following dataset and provide 2-3 key business insights:
            
            Dataset Summary:
            - Shape: {data_summary['shape']}
            - Columns: {data_summary['columns']}
            - Sample Data: {json.dumps(data_summary['sample_data'], default=str)}
            
            Please provide insights in the following JSON format:
            [
                {{
                    "title": "Insight Title",
                    "content": "Detailed insight description",
                    "type": "recommendation|trend|summary",
                    "confidence": 0.8
                }}
            ]
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a data analyst providing business insights from datasets."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            ai_insights = json.loads(response.choices[0].message.content)
            insights.extend(ai_insights)
            
        except Exception as e:
            print(f"Error generating AI insights: {str(e)}")
            # Fallback insight
            insights.append({
                "title": "Data Overview",
                "content": f"Dataset contains {df.shape[0]} rows and {df.shape[1]} columns with various data types for analysis.",
                "type": "summary",
                "confidence": 0.7
            })
        
        return insights
    
    async def _analyze_text_data(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze text data and generate insights"""
        insights = []
        
        try:
            content = data.get("content", "")
            
            # Basic text statistics
            word_count = len(content.split())
            char_count = len(content)
            line_count = len(content.split('\n'))
            
            insights.append({
                "title": "Text Statistics",
                "content": f"Document contains {word_count} words, {char_count} characters, and {line_count} lines.",
                "type": "summary",
                "confidence": 0.9
            })
            
            # AI-powered text analysis
            if len(content) > 100:  # Only analyze substantial text
                ai_insights = await self._generate_text_ai_insights(content)
                insights.extend(ai_insights)
            
        except Exception as e:
            print(f"Error in text analysis: {str(e)}")
        
        return insights
    
    async def _generate_text_ai_insights(self, content: str) -> List[Dict[str, Any]]:
        """Generate AI insights from text content"""
        insights = []
        
        try:
            prompt = f"""
            Analyze the following text and provide 2-3 key insights about its content, themes, or structure:
            
            Text (first 1000 characters):
            {content[:1000]}
            
            Please provide insights in JSON format:
            [
                {{
                    "title": "Insight Title",
                    "content": "Detailed insight description",
                    "type": "summary|theme|structure",
                    "confidence": 0.8
                }}
            ]
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a text analyst providing insights about document content."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            ai_insights = json.loads(response.choices[0].message.content)
            insights.extend(ai_insights)
            
        except Exception as e:
            print(f"Error generating text AI insights: {str(e)}")
        
        return insights