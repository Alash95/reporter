import json
import asyncio
from typing import Dict, Any, List, Callable, Optional
from datetime import datetime
import aiofiles
import os
from enum import Enum

class NotificationType(Enum):
    DATA_SOURCE_ADDED = "data_source_added"
    DATA_SOURCE_UPDATED = "data_source_updated"
    DATA_SOURCE_REMOVED = "data_source_removed"
    SCHEMA_UPDATED = "schema_updated"
    PROCESSING_COMPLETED = "processing_completed"
    PROCESSING_FAILED = "processing_failed"

class NotificationService:
    """Service for handling cross-feature notifications and synchronization"""
    
    def __init__(self, notification_log_file: str = "notifications.log"):
        self.notification_log_file = notification_log_file
        self.feature_handlers = {
            "conversational_ai": [],
            "query_builder": [],
            "dashboard_builder": [],
            "ai_assistant": []
        }
        self.notification_queue = asyncio.Queue()
        self.is_processing = False
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize the notification service"""
        # Start the notification processor
        if not self.is_processing:
            asyncio.create_task(self._process_notifications())
            self.is_processing = True
    
    def register_handler(self, feature_name: str, handler: Callable):
        """Register a handler function for a specific feature"""
        if feature_name in self.feature_handlers:
            self.feature_handlers[feature_name].append(handler)
        else:
            self.feature_handlers[feature_name] = [handler]
    
    async def notify_feature(self, feature_name: str, notification_data: Dict[str, Any]):
        """Send notification to a specific feature"""
        notification = {
            "id": f"notif_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat(),
            "feature": feature_name,
            "data": notification_data,
            "type": notification_data.get("action", "unknown")
        }
        
        await self.notification_queue.put(notification)
        await self._log_notification(notification)
    
    async def notify_all_features(self, notification_data: Dict[str, Any]):
        """Send notification to all features"""
        for feature_name in self.feature_handlers.keys():
            await self.notify_feature(feature_name, notification_data)
    
    async def _process_notifications(self):
        """Process notifications from the queue"""
        while True:
            try:
                notification = await self.notification_queue.get()
                await self._handle_notification(notification)
                self.notification_queue.task_done()
            except Exception as e:
                print(f"Error processing notification: {str(e)}")
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.1)
    
    async def _handle_notification(self, notification: Dict[str, Any]):
        """Handle a specific notification"""
        feature_name = notification.get("feature")
        notification_data = notification.get("data", {})
        notification_type = notification.get("type")
        
        # Call registered handlers
        handlers = self.feature_handlers.get(feature_name, [])
        for handler in handlers:
            try:
                await handler(notification_data)
            except Exception as e:
                print(f"Error in handler for {feature_name}: {str(e)}")
        
        # Handle built-in notifications
        await self._handle_builtin_notifications(feature_name, notification_type, notification_data)
    
    async def _handle_builtin_notifications(self, feature_name: str, notification_type: str, data: Dict[str, Any]):
        """Handle built-in notification types"""
        
        if notification_type == "data_source_added":
            await self._handle_data_source_added(feature_name, data)
        elif notification_type == "data_source_removed":
            await self._handle_data_source_removed(feature_name, data)
        elif notification_type == "schema_updated":
            await self._handle_schema_updated(feature_name, data)
    
    async def _handle_data_source_added(self, feature_name: str, data: Dict[str, Any]):
        """Handle data source added notification"""
        
        if feature_name == "conversational_ai":
            # Update conversational AI context
            await self._update_conversational_ai_context(data)
        
        elif feature_name == "query_builder":
            # Update query builder schemas
            await self._update_query_builder_schemas(data)
        
        elif feature_name == "dashboard_builder":
            # Update dashboard builder data sources
            await self._update_dashboard_builder_sources(data)
        
        elif feature_name == "ai_assistant":
            # Update AI assistant knowledge base
            await self._update_ai_assistant_knowledge(data)
    
    async def _handle_data_source_removed(self, feature_name: str, data: Dict[str, Any]):
        """Handle data source removed notification"""
        file_id = data.get("file_id")
        
        if not file_id:
            return
        
        # Remove from feature-specific storage
        await self._remove_from_feature_storage(feature_name, file_id)
    
    async def _handle_schema_updated(self, feature_name: str, data: Dict[str, Any]):
        """Handle schema updated notification"""
        schema_info = data.get("schema", {})
        
        if feature_name == "query_builder":
            await self._sync_query_builder_schema(schema_info)
    
    async def _update_conversational_ai_context(self, data: Dict[str, Any]):
        """Update conversational AI with new data source context"""
        try:
            context_file = "conversational_ai_context.json"
            
            # Load existing context
            context = {}
            if os.path.exists(context_file):
                async with aiofiles.open(context_file, 'r') as f:
                    content = await f.read()
                    context = json.loads(content)
            
            # Add new data source
            source_id = data.get("context", {}).get("data_source_id")
            if source_id:
                context[source_id] = {
                    "data_type": data.get("context", {}).get("data_type"),
                    "columns": data.get("context", {}).get("columns", []),
                    "sample_data": data.get("context", {}).get("sample_data", []),
                    "semantic_model": data.get("context", {}).get("semantic_model"),
                    "suggestions": data.get("context", {}).get("suggestions", []),
                    "added_at": datetime.now().isoformat()
                }
                
                # Save updated context
                async with aiofiles.open(context_file, 'w') as f:
                    await f.write(json.dumps(context, indent=2, default=str))
                
                print(f"Updated conversational AI context for source: {source_id}")
                
        except Exception as e:
            print(f"Error updating conversational AI context: {str(e)}")
    
    async def _update_query_builder_schemas(self, data: Dict[str, Any]):
        """Update query builder with new schema information"""
        try:
            schema_file = "query_builder_schemas.json"
            
            # Load existing schemas
            schemas = {}
            if os.path.exists(schema_file):
                async with aiofiles.open(schema_file, 'r') as f:
                    content = await f.read()
                    schemas = json.loads(content)
            
            # Add new schema
            schema_info = data.get("schema")
            if schema_info:
                model_id = schema_info.get("model_id")
                if model_id:
                    schemas[model_id] = {
                        "model_name": schema_info.get("model_name"),
                        "tables": schema_info.get("tables", {}),
                        "metrics": schema_info.get("metrics", []),
                        "dimensions": schema_info.get("dimensions", []),
                        "file_id": schema_info.get("file_id"),
                        "updated_at": schema_info.get("updated_at"),
                        "available": True
                    }
                    
                    # Save updated schemas
                    async with aiofiles.open(schema_file, 'w') as f:
                        await f.write(json.dumps(schemas, indent=2, default=str))
                    
                    print(f"Updated query builder schemas for model: {model_id}")
                    
        except Exception as e:
            print(f"Error updating query builder schemas: {str(e)}")
    
    async def _update_dashboard_builder_sources(self, data: Dict[str, Any]):
        """Update dashboard builder with new data sources"""
        try:
            sources_file = "dashboard_builder_sources.json"
            
            # Load existing sources
            sources = {}
            if os.path.exists(sources_file):
                async with aiofiles.open(sources_file, 'r') as f:
                    content = await f.read()
                    sources = json.loads(content)
            
            # Add new source
            source_info = data.get("source")
            if source_info:
                source_id = source_info.get("source_id")
                if source_id:
                    sources[source_id] = {
                        "source_name": source_info.get("source_name"),
                        "source_type": source_info.get("source_type"),
                        "data_type": source_info.get("data_type"),
                        "columns": source_info.get("columns", []),
                        "semantic_model": source_info.get("semantic_model"),
                        "chart_suggestions": source_info.get("chart_suggestions", []),
                        "available": True,
                        "added_at": datetime.now().isoformat()
                    }
                    
                    # Save updated sources
                    async with aiofiles.open(sources_file, 'w') as f:
                        await f.write(json.dumps(sources, indent=2, default=str))
                    
                    print(f"Updated dashboard builder sources for: {source_id}")
                    
        except Exception as e:
            print(f"Error updating dashboard builder sources: {str(e)}")
    
    async def _update_ai_assistant_knowledge(self, data: Dict[str, Any]):
        """Update AI assistant knowledge base"""
        try:
            knowledge_file = "ai_assistant_knowledge.json"
            
            # Load existing knowledge
            knowledge = {}
            if os.path.exists(knowledge_file):
                async with aiofiles.open(knowledge_file, 'r') as f:
                    content = await f.read()
                    knowledge = json.loads(content)
            
            # Add new knowledge
            context = data.get("context", {})
            source_id = context.get("data_source_id")
            
            if source_id:
                knowledge[source_id] = {
                    "data_summary": {
                        "type": context.get("data_type"),
                        "columns": context.get("columns", []),
                        "sample_queries": self._generate_sample_queries(context)
                    },
                    "semantic_model": context.get("semantic_model"),
                    "query_patterns": self._extract_query_patterns(context),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Save updated knowledge
                async with aiofiles.open(knowledge_file, 'w') as f:
                    await f.write(json.dumps(knowledge, indent=2, default=str))
                
                print(f"Updated AI assistant knowledge for source: {source_id}")
                
        except Exception as e:
            print(f"Error updating AI assistant knowledge: {str(e)}")
    
    def _generate_sample_queries(self, context: Dict[str, Any]) -> List[str]:
        """Generate sample queries based on data context"""
        queries = []
        columns = context.get("columns", [])
        
        if columns:
            # Basic queries
            queries.extend([
                f"SELECT * FROM data LIMIT 10",
                f"SELECT COUNT(*) FROM data"
            ])
            
            # Column-specific queries
            for col in columns[:3]:  # Limit to first 3 columns
                col_name = col.get("name", "")
                col_type = col.get("type", "")
                
                if col_type in ["string"]:
                    queries.append(f"SELECT DISTINCT {col_name} FROM data")
                elif col_type in ["number", "integer"]:
                    queries.extend([
                        f"SELECT AVG({col_name}) FROM data",
                        f"SELECT MAX({col_name}) FROM data"
                    ])
        
        return queries[:10]  # Limit to 10 sample queries
    
    def _extract_query_patterns(self, context: Dict[str, Any]) -> List[Dict[str, str]]:
        """Extract common query patterns"""
        patterns = []
        semantic_model = context.get("semantic_model")
        
        if semantic_model:
            metrics = semantic_model.get("metrics", [])
            dimensions = semantic_model.get("dimensions", [])
            
            # Metric patterns
            for metric in metrics[:5]:  # Limit to first 5
                patterns.append({
                    "type": "metric",
                    "pattern": f"Show me {metric.get('title', 'the metric')}",
                    "sql_template": metric.get("sql", "")
                })
            
            # Dimension patterns
            for dimension in dimensions[:5]:  # Limit to first 5
                patterns.append({
                    "type": "dimension",
                    "pattern": f"Group by {dimension.get('title', 'the dimension')}",
                    "sql_template": f"SELECT {dimension.get('sql', '')}, COUNT(*) FROM data GROUP BY {dimension.get('sql', '')}"
                })
        
        return patterns
    
    async def _remove_from_feature_storage(self, feature_name: str, file_id: str):
        """Remove data source from feature-specific storage"""
        try:
            if feature_name == "conversational_ai":
                context_file = "conversational_ai_context.json"
                await self._remove_from_json_file(context_file, file_id)
            
            elif feature_name == "query_builder":
                schema_file = "query_builder_schemas.json"
                # Find and remove schemas related to this file
                await self._remove_schemas_by_file_id(schema_file, file_id)
            
            elif feature_name == "dashboard_builder":
                sources_file = "dashboard_builder_sources.json"
                await self._remove_from_json_file(sources_file, file_id)
            
            elif feature_name == "ai_assistant":
                knowledge_file = "ai_assistant_knowledge.json"
                await self._remove_from_json_file(knowledge_file, file_id)
                
        except Exception as e:
            print(f"Error removing from {feature_name} storage: {str(e)}")
    
    async def _remove_from_json_file(self, file_path: str, key_to_remove: str):
        """Remove a key from a JSON file"""
        try:
            if os.path.exists(file_path):
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                
                if key_to_remove in data:
                    del data[key_to_remove]
                    
                    async with aiofiles.open(file_path, 'w') as f:
                        await f.write(json.dumps(data, indent=2, default=str))
                        
        except Exception as e:
            print(f"Error removing from JSON file {file_path}: {str(e)}")
    
    async def _remove_schemas_by_file_id(self, schema_file: str, file_id: str):
        """Remove schemas associated with a specific file ID"""
        try:
            if os.path.exists(schema_file):
                async with aiofiles.open(schema_file, 'r') as f:
                    content = await f.read()
                    schemas = json.loads(content)
                
                # Find schemas with matching file_id
                schemas_to_remove = []
                for schema_id, schema_info in schemas.items():
                    if schema_info.get("file_id") == file_id:
                        schemas_to_remove.append(schema_id)
                
                # Remove identified schemas
                for schema_id in schemas_to_remove:
                    del schemas[schema_id]
                
                # Save updated schemas
                async with aiofiles.open(schema_file, 'w') as f:
                    await f.write(json.dumps(schemas, indent=2, default=str))
                    
        except Exception as e:
            print(f"Error removing schemas by file ID: {str(e)}")
    
    async def _log_notification(self, notification: Dict[str, Any]):
        """Log notification to file for debugging and audit"""
        try:
            log_entry = {
                "timestamp": notification.get("timestamp"),
                "id": notification.get("id"),
                "feature": notification.get("feature"),
                "type": notification.get("type"),
                "data_summary": {
                    "action": notification.get("data", {}).get("action"),
                    "source_id": notification.get("data", {}).get("context", {}).get("data_source_id") or 
                                notification.get("data", {}).get("file_id") or 
                                notification.get("data", {}).get("source", {}).get("source_id")
                }
            }
            
            async with aiofiles.open(self.notification_log_file, 'a') as f:
                await f.write(json.dumps(log_entry, default=str) + "\n")
                
        except Exception as e:
            print(f"Error logging notification: {str(e)}")
    
    async def get_notification_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent notification history"""
        try:
            if not os.path.exists(self.notification_log_file):
                return []
            
            notifications = []
            async with aiofiles.open(self.notification_log_file, 'r') as f:
                lines = await f.readlines()
                
                # Get last 'limit' lines
                recent_lines = lines[-limit:] if len(lines) > limit else lines
                
                for line in recent_lines:
                    try:
                        notification = json.loads(line.strip())
                        notifications.append(notification)
                    except json.JSONDecodeError:
                        continue
            
            return notifications
            
        except Exception as e:
            print(f"Error getting notification history: {str(e)}")
            return []
    
    async def cleanup_old_logs(self, days_to_keep: int = 30):
        """Clean up old notification logs"""
        try:
            if not os.path.exists(self.notification_log_file):
                return
            
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            kept_notifications = []
            
            async with aiofiles.open(self.notification_log_file, 'r') as f:
                lines = await f.readlines()
                
                for line in lines:
                    try:
                        notification = json.loads(line.strip())
                        timestamp_str = notification.get("timestamp", "")
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        
                        if timestamp > cutoff_date:
                            kept_notifications.append(line)
                    except (json.JSONDecodeError, ValueError):
                        continue
            
            # Write back only recent notifications
            async with aiofiles.open(self.notification_log_file, 'w') as f:
                await f.writelines(kept_notifications)
                
            print(f"Cleaned up notification logs, kept {len(kept_notifications)} recent entries")
            
        except Exception as e:
            print(f"Error cleaning up notification logs: {str(e)}")

# Global notification service instance
notification_service = NotificationService()

async def initialize_notification_service():
    """Initialize the global notification service"""
    await notification_service.initialize()