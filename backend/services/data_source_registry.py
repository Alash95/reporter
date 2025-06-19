import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio
import aiofiles

class DataSourceRegistry:
    """Central registry for managing data sources across all platform features"""
    
    def __init__(self, registry_file: str = "data_sources_registry.json"):
        self.registry_file = registry_file
        self.registry_cache = {}
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize the registry by loading existing data"""
        await self._load_registry()
    
    async def _load_registry(self):
        """Load registry from file"""
        try:
            if os.path.exists(self.registry_file):
                async with aiofiles.open(self.registry_file, 'r') as f:
                    content = await f.read()
                    self.registry_cache = json.loads(content)
            else:
                self.registry_cache = {
                    "sources": {},
                    "schemas": {},
                    "feature_mappings": {},
                    "last_updated": datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error loading registry: {str(e)}")
            self.registry_cache = {
                "sources": {},
                "schemas": {},
                "feature_mappings": {},
                "last_updated": datetime.now().isoformat()
            }
    
    async def _save_registry(self):
        """Save registry to file"""
        try:
            self.registry_cache["last_updated"] = datetime.now().isoformat()
            async with aiofiles.open(self.registry_file, 'w') as f:
                await f.write(json.dumps(self.registry_cache, indent=2, default=str))
        except Exception as e:
            print(f"Error saving registry: {str(e)}")
    
    async def register_source(self, source_id: str, source_info: Dict[str, Any]):
        """Register a new data source"""
        async with self._lock:
            await self._load_registry()
            
            self.registry_cache["sources"][source_id] = {
                **source_info,
                "registered_at": datetime.now().isoformat(),
                "last_accessed": datetime.now().isoformat(),
                "access_count": 0
            }
            
            # Initialize feature mappings
            if source_id not in self.registry_cache["feature_mappings"]:
                self.registry_cache["feature_mappings"][source_id] = {
                    "conversational_ai": {"enabled": True, "last_sync": None},
                    "query_builder": {"enabled": True, "last_sync": None},
                    "dashboard_builder": {"enabled": True, "last_sync": None},
                    "ai_assistant": {"enabled": True, "last_sync": None}
                }
            
            await self._save_registry()
    
    async def unregister_source(self, source_id: str):
        """Unregister a data source"""
        async with self._lock:
            await self._load_registry()
            
            if source_id in self.registry_cache["sources"]:
                del self.registry_cache["sources"][source_id]
            
            if source_id in self.registry_cache["schemas"]:
                del self.registry_cache["schemas"][source_id]
            
            if source_id in self.registry_cache["feature_mappings"]:
                del self.registry_cache["feature_mappings"][source_id]
            
            await self._save_registry()
    
    async def get_source_info(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a data source"""
        await self._load_registry()
        return self.registry_cache["sources"].get(source_id)
    
    async def get_source_status(self, source_id: str) -> Dict[str, Any]:
        """Get integration status for a data source"""
        await self._load_registry()
        
        source_info = self.registry_cache["sources"].get(source_id)
        feature_mappings = self.registry_cache["feature_mappings"].get(source_id, {})
        
        if not source_info:
            return {"status": "not_found"}
        
        return {
            "status": source_info.get("status", "unknown"),
            "registered_at": source_info.get("registered_at"),
            "last_accessed": source_info.get("last_accessed"),
            "access_count": source_info.get("access_count", 0),
            "feature_integrations": feature_mappings
        }
    
    async def list_sources_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """List all data sources for a specific user"""
        await self._load_registry()
        
        user_sources = []
        for source_id, source_info in self.registry_cache["sources"].items():
            if source_info.get("user_id") == user_id:
                user_sources.append({
                    "source_id": source_id,
                    **source_info
                })
        
        return user_sources
    
    async def get_sources_for_feature(self, feature_name: str, user_id: str) -> List[Dict[str, Any]]:
        """Get all available data sources for a specific feature"""
        await self._load_registry()
        
        available_sources = []
        for source_id, source_info in self.registry_cache["sources"].items():
            # Check if source belongs to user
            if source_info.get("user_id") != user_id:
                continue
            
            # Check if feature is enabled for this source
            feature_mappings = self.registry_cache["feature_mappings"].get(source_id, {})
            if feature_mappings.get(feature_name, {}).get("enabled", True):
                available_sources.append({
                    "source_id": source_id,
                    **source_info,
                    "feature_sync": feature_mappings.get(feature_name, {})
                })
        
        return available_sources
    
    async def update_feature_sync(self, source_id: str, feature_name: str, sync_info: Dict[str, Any]):
        """Update feature synchronization information"""
        async with self._lock:
            await self._load_registry()
            
            if source_id not in self.registry_cache["feature_mappings"]:
                self.registry_cache["feature_mappings"][source_id] = {}
            
            if feature_name not in self.registry_cache["feature_mappings"][source_id]:
                self.registry_cache["feature_mappings"][source_id][feature_name] = {}
            
            self.registry_cache["feature_mappings"][source_id][feature_name].update({
                **sync_info,
                "last_sync": datetime.now().isoformat()
            })
            
            await self._save_registry()
    
    async def track_access(self, source_id: str):
        """Track access to a data source"""
        async with self._lock:
            await self._load_registry()
            
            if source_id in self.registry_cache["sources"]:
                self.registry_cache["sources"][source_id]["last_accessed"] = datetime.now().isoformat()
                self.registry_cache["sources"][source_id]["access_count"] = \
                    self.registry_cache["sources"][source_id].get("access_count", 0) + 1
                
                await self._save_registry()
    
    async def register_schema(self, source_id: str, schema_info: Dict[str, Any]):
        """Register schema information for a data source"""
        async with self._lock:
            await self._load_registry()
            
            self.registry_cache["schemas"][source_id] = {
                **schema_info,
                "registered_at": datetime.now().isoformat()
            }
            
            await self._save_registry()
    
    async def get_schema(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get schema information for a data source"""
        await self._load_registry()
        return self.registry_cache["schemas"].get(source_id)
    
    async def get_all_schemas_for_user(self, user_id: str) -> Dict[str, Any]:
        """Get all schemas available to a user"""
        await self._load_registry()
        
        user_schemas = {}
        for source_id, source_info in self.registry_cache["sources"].items():
            if source_info.get("user_id") == user_id:
                schema = self.registry_cache["schemas"].get(source_id)
                if schema:
                    user_schemas[source_id] = {
                        "source_name": source_info.get("name", source_id),
                        "source_type": source_info.get("type", "unknown"),
                        "schema": schema
                    }
        
        return user_schemas
    
    async def get_feature_statistics(self) -> Dict[str, Any]:
        """Get statistics about data source usage across features"""
        await self._load_registry()
        
        stats = {
            "total_sources": len(self.registry_cache["sources"]),
            "feature_usage": {},
            "source_types": {},
            "user_distribution": {}
        }
        
        # Feature usage statistics
        for feature in ["conversational_ai", "query_builder", "dashboard_builder", "ai_assistant"]:
            stats["feature_usage"][feature] = 0
            
        for mappings in self.registry_cache["feature_mappings"].values():
            for feature, info in mappings.items():
                if info.get("enabled", True):
                    stats["feature_usage"][feature] = stats["feature_usage"].get(feature, 0) + 1
        
        # Source type distribution
        for source_info in self.registry_cache["sources"].values():
            source_type = source_info.get("type", "unknown")
            stats["source_types"][source_type] = stats["source_types"].get(source_type, 0) + 1
        
        # User distribution
        for source_info in self.registry_cache["sources"].values():
            user_id = source_info.get("user_id", "unknown")
            stats["user_distribution"][user_id] = stats["user_distribution"].get(user_id, 0) + 1
        
        return stats
    
    async def cleanup_inactive_sources(self, days_threshold: int = 30):
        """Cleanup sources that haven't been accessed in the specified number of days"""
        async with self._lock:
            await self._load_registry()
            
            from datetime import datetime, timedelta
            threshold_date = datetime.now() - timedelta(days=days_threshold)
            
            sources_to_remove = []
            for source_id, source_info in self.registry_cache["sources"].items():
                last_accessed_str = source_info.get("last_accessed")
                if last_accessed_str:
                    try:
                        last_accessed = datetime.fromisoformat(last_accessed_str.replace('Z', '+00:00'))
                        if last_accessed < threshold_date:
                            sources_to_remove.append(source_id)
                    except ValueError:
                        # If we can't parse the date, consider it for removal
                        sources_to_remove.append(source_id)
            
            # Remove inactive sources
            for source_id in sources_to_remove:
                await self.unregister_source(source_id)
            
            return len(sources_to_remove)

# Global registry instance
data_source_registry = DataSourceRegistry()

async def initialize_registry():
    """Initialize the global registry"""
    await data_source_registry.initialize()