from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Dashboard, Widget
from schemas import DashboardCreate, DashboardResponse, WidgetCreate, WidgetResponse

router = APIRouter()

@router.post("/", response_model=DashboardResponse)
async def create_dashboard(dashboard_data: DashboardCreate, db: Session = Depends(get_db)):
    dashboard = Dashboard(
        name=dashboard_data.name,
        description=dashboard_data.description,
        layout=dashboard_data.layout or {},
        widgets=dashboard_data.widgets or [],
        is_public=dashboard_data.is_public
    )
    
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    
    return DashboardResponse.from_orm(dashboard)

@router.get("/", response_model=List[DashboardResponse])
async def list_dashboards(db: Session = Depends(get_db)):
    dashboards = db.query(Dashboard).order_by(Dashboard.updated_at.desc()).all()
    return [DashboardResponse.from_orm(dashboard) for dashboard in dashboards]

@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(dashboard_id: str, db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    return DashboardResponse.from_orm(dashboard)

@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: str,
    dashboard_data: DashboardCreate,
    db: Session = Depends(get_db)
):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    dashboard.name = dashboard_data.name
    dashboard.description = dashboard_data.description
    dashboard.layout = dashboard_data.layout or {}
    dashboard.widgets = dashboard_data.widgets or []
    dashboard.is_public = dashboard_data.is_public
    
    db.commit()
    db.refresh(dashboard)
    
    return DashboardResponse.from_orm(dashboard)

@router.delete("/{dashboard_id}")
async def delete_dashboard(dashboard_id: str, db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    db.delete(dashboard)
    db.commit()
    
    return {"message": "Dashboard deleted successfully"}

@router.post("/{dashboard_id}/widgets", response_model=WidgetResponse)
async def add_widget_to_dashboard(
    dashboard_id: str,
    widget_data: WidgetCreate,
    db: Session = Depends(get_db)
):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    widget = Widget(
        name=widget_data.name,
        widget_type=widget_data.widget_type,
        configuration=widget_data.configuration,
        data_source=widget_data.data_source,
        position=widget_data.position,
        dashboard_id=dashboard_id
    )
    
    db.add(widget)
    db.commit()
    db.refresh(widget)
    
    return WidgetResponse.from_orm(widget)

@router.get("/{dashboard_id}/widgets", response_model=List[WidgetResponse])
async def get_dashboard_widgets(dashboard_id: str, db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    widgets = db.query(Widget).filter(Widget.dashboard_id == dashboard_id).all()
    
    return [WidgetResponse.from_orm(widget) for widget in widgets]

@router.put("/widgets/{widget_id}", response_model=WidgetResponse)
async def update_widget(
    widget_id: str,
    widget_data: WidgetCreate,
    db: Session = Depends(get_db)
):
    widget = db.query(Widget).join(Dashboard).filter(Widget.id == widget_id).first()
    
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    widget.name = widget_data.name
    widget.widget_type = widget_data.widget_type
    widget.configuration = widget_data.configuration
    widget.data_source = widget_data.data_source
    widget.position = widget_data.position
    
    db.commit()
    db.refresh(widget)
    
    return WidgetResponse.from_orm(widget)

@router.delete("/widgets/{widget_id}")
async def delete_widget(widget_id: str, db: Session = Depends(get_db)):
    widget = db.query(Widget).join(Dashboard).filter(Widget.id == widget_id).first()
    
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    db.delete(widget)
    db.commit()
    
    return {"message": "Widget deleted successfully"}