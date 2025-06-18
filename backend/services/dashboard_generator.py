import pandas as pd
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models import Dashboard, Widget
import openai
import os
from dotenv import load_dotenv
load_dotenv()


class DashboardGenerator:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv("AZURE_OPENAI_KEY"))
    
    async def generate_dashboard(
        self,
        problem_statement: str,
        data: Dict[str, Any],
        preferences: Dict[str, Any],
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Generate a complete dashboard based on problem statement and data"""
        
        try:
            # Analyze data structure
            df = pd.DataFrame(data['rows'])
            data_info = {
                "columns": list(df.columns),
                "dtypes": df.dtypes.astype(str).to_dict(),
                "sample_data": df.head().to_dict('records')
            }
            
            # Generate dashboard design using AI
            dashboard_prompt = f"""
            Problem Statement: {problem_statement}
            
            Dataset Information:
            - Columns: {data_info['columns']}
            - Data Types: {data_info['dtypes']}
            - Sample Data: {json.dumps(data_info['sample_data'][:3], indent=2)}
            
            Generate a dashboard design that addresses the problem statement. Return JSON with:
            {{
                "dashboard_name": "...",
                "insights": ["insight1", "insight2", ...],
                "widgets": [
                    {{
                        "name": "Widget Name",
                        "type": "chart|metric|table",
                        "chart_type": "bar|line|pie|scatter|table",
                        "description": "What this widget shows",
                        "data_config": {{
                            "x_column": "column_name",
                            "y_column": "column_name",
                            "aggregation": "sum|avg|count",
                            "groupby": "column_name"
                        }}
                    }}
                ],
                "explanation": "How this dashboard addresses the problem"
            }}
            """
            
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert dashboard designer. Create comprehensive dashboards that solve business problems."
                    },
                    {"role": "user", "content": dashboard_prompt}
                ],
                temperature=0.3
            )
            
            dashboard_design = json.loads(response.choices[0].message.content)
            
            # Create dashboard in database
            dashboard = Dashboard(
                name=dashboard_design.get("dashboard_name", "Generated Dashboard"),
                description=f"Auto-generated dashboard for: {problem_statement}",
                user_id=user_id,
                layout={},
                widgets=[]
            )
            
            db.add(dashboard)
            db.commit()
            db.refresh(dashboard)
            
            # Create widgets
            created_widgets = []
            for widget_config in dashboard_design.get("widgets", []):
                widget_data = self._prepare_widget_data(df, widget_config)
                
                widget = Widget(
                    name=widget_config.get("name", "Unnamed Widget"),
                    widget_type=widget_config.get("type", "chart"),
                    configuration={
                        "chart_type": widget_config.get("chart_type", "bar"),
                        "data_config": widget_config.get("data_config", {}),
                        "data": widget_data
                    },
                    data_source={"file_data": True},
                    position={"x": 0, "y": 0, "w": 6, "h": 4},
                    dashboard_id=dashboard.id
                )
                
                db.add(widget)
                created_widgets.append(widget)
            
            db.commit()
            
            # Generate Streamlit code
            streamlit_code = self._generate_streamlit_code(dashboard_design, data_info)
            
            return {
                "dashboard_id": dashboard.id,
                "insights": dashboard_design.get("insights", []),
                "suggested_visualizations": dashboard_design.get("widgets", []),
                "generated_code": streamlit_code,
                "explanation": dashboard_design.get("explanation", "")
            }
            
        except Exception as e:
            raise Exception(f"Dashboard generation failed: {str(e)}")
    
    def _prepare_widget_data(self, df: pd.DataFrame, widget_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Prepare data for a specific widget"""
        try:
            data_config = widget_config.get("data_config", {})
            
            if widget_config.get("type") == "metric":
                # Calculate metric value
                column = data_config.get("y_column")
                if column and column in df.columns:
                    if data_config.get("aggregation") == "sum":
                        value = df[column].sum()
                    elif data_config.get("aggregation") == "avg":
                        value = df[column].mean()
                    else:
                        value = len(df)
                    
                    return [{"label": widget_config.get("name"), "value": value}]
            
            elif widget_config.get("type") == "chart":
                # Prepare chart data
                x_col = data_config.get("x_column")
                y_col = data_config.get("y_column")
                groupby = data_config.get("groupby")
                
                if groupby and groupby in df.columns:
                    if data_config.get("aggregation") == "sum":
                        chart_data = df.groupby(groupby)[y_col].sum().reset_index()
                    elif data_config.get("aggregation") == "avg":
                        chart_data = df.groupby(groupby)[y_col].mean().reset_index()
                    else:
                        chart_data = df.groupby(groupby).size().reset_index(name='count')
                        y_col = 'count'
                    
                    return [
                        {"x": row[groupby], "y": row[y_col]} 
                        for _, row in chart_data.iterrows()
                    ]
                
                elif x_col and y_col and x_col in df.columns and y_col in df.columns:
                    return [
                        {"x": row[x_col], "y": row[y_col]} 
                        for _, row in df.iterrows()
                    ]
            
            # Fallback: return sample data
            return df.head(10).to_dict('records')
            
        except Exception:
            return []
    
    def _generate_streamlit_code(self, dashboard_design: Dict[str, Any], data_info: Dict[str, Any]) -> str:
        """Generate Streamlit code for the dashboard"""
        
        code = f'''
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Dashboard: {dashboard_design.get("dashboard_name", "Generated Dashboard")}
st.set_page_config(page_title="{dashboard_design.get("dashboard_name", "Dashboard")}", layout="wide")

st.title("{dashboard_design.get("dashboard_name", "Generated Dashboard")}")
st.markdown("*{dashboard_design.get("explanation", "")}*")

# Load your data
# df = pd.read_csv("your_data.csv")  # Replace with your data loading method

# Create columns for layout
'''
        
        widgets = dashboard_design.get("widgets", [])
        cols_per_row = 2
        
        for i in range(0, len(widgets), cols_per_row):
            row_widgets = widgets[i:i+cols_per_row]
            if len(row_widgets) == 2:
                code += f"\ncol1, col2 = st.columns(2)\n"
            else:
                code += f"\ncol1 = st.columns(1)[0]\n"
            
            for j, widget in enumerate(row_widgets):
                col_name = f"col{j+1}"
                widget_code = self._generate_widget_code(widget, data_info)
                code += f"\nwith {col_name}:\n"
                for line in widget_code.split('\n'):
                    if line.strip():
                        code += f"    {line}\n"
        
        return code
    
    def _generate_widget_code(self, widget: Dict[str, Any], data_info: Dict[str, Any]) -> str:
        """Generate Streamlit code for a single widget"""
        
        widget_type = widget.get("type", "chart")
        widget_name = widget.get("name", "Widget")
        
        if widget_type == "metric":
            return f'''
st.metric(
    label="{widget_name}",
    value="Your calculated value here"
)
'''
        
        elif widget_type == "chart":
            chart_type = widget.get("chart_type", "bar")
            data_config = widget.get("data_config", {})
            
            if chart_type == "bar":
                return f'''
st.subheader("{widget_name}")
fig = px.bar(df, x="{data_config.get('groupby', 'x')}", y="{data_config.get('y_column', 'y')}")
st.plotly_chart(fig, use_container_width=True)
'''
            elif chart_type == "line":
                return f'''
st.subheader("{widget_name}")
fig = px.line(df, x="{data_config.get('x_column', 'x')}", y="{data_config.get('y_column', 'y')}")
st.plotly_chart(fig, use_container_width=True)
'''
            elif chart_type == "pie":
                return f'''
st.subheader("{widget_name}")
fig = px.pie(df, names="{data_config.get('groupby', 'category')}", values="{data_config.get('y_column', 'value')}")
st.plotly_chart(fig, use_container_width=True)
'''
        
        elif widget_type == "table":
            return f'''
st.subheader("{widget_name}")
st.dataframe(df.head(10), use_container_width=True)
'''
        
        return f'st.write("{widget_name} - Widget type not implemented")'