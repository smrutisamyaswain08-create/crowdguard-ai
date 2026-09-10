from django.urls import path
from .views import (
    dashboard_summary, crowd_trends, peak_hours, alert_frequency,
    zone_list_create_api, crowd_forecast_api, unusual_incidents_api,
    site_environment_api, visitor_guidance_api, privacy_audit_api,
    simulate_event_api, satellite_telemetry_api, travel_ai_predict_api,
    realtime_flights_api, realtime_satellite_person_data_api,
    pilgrim_safe_predict_api, pilgrim_safe_zones_api,
    live_crowd_api, zone_crowd_api, real_incidents_api,
    isro_geospatial_api, crowd_stream_sse_api,
    run_simulation_api, compare_actions_api, simulation_runs_list_api, visitor_safety_api
)

urlpatterns = [
    path('summary/', dashboard_summary, name='dashboard_summary'),
    path('trends/', crowd_trends, name='crowd_trends'),
    path('peak-hours/', peak_hours, name='peak_hours'),
    path('alert-frequency/', alert_frequency, name='alert_frequency'),
    
    # Real API Endpoints
    path('crowd/live/', live_crowd_api, name='live_crowd_api'),
    path('crowd/zones/', zone_crowd_api, name='zone_crowd_api'),
    path('incidents/real/', real_incidents_api, name='real_incidents_api'),
    path('crowd/stream/', crowd_stream_sse_api, name='crowd_stream_sse_api'),
    path('isro/geospatial/', isro_geospatial_api, name='isro_geospatial_api'),

    # Smart Tourism & Site Coordination Endpoints
    path('zones/', zone_list_create_api, name='zone_list_create'),
    path('forecast/', crowd_forecast_api, name='crowd_forecast'),
    path('incidents/', unusual_incidents_api, name='unusual_incidents'),
    path('environment/', site_environment_api, name='site_environment'),
    path('guidance/', visitor_guidance_api, name='visitor_guidance'),
    path('privacy-audit/', privacy_audit_api, name='privacy_audit'),
    path('simulate/', simulate_event_api, name='simulate_event'),
    path('satellite-telemetry/', satellite_telemetry_api, name='satellite_telemetry'),
    path('travel-ai-predict/', travel_ai_predict_api, name='travel_ai_predict'),
    path('realtime-flights/', realtime_flights_api, name='realtime_flights'),
    path('realtime-satellite-person-data/', realtime_satellite_person_data_api, name='realtime_satellite_person_data'),
    path('pilgrim-safe-predict/', pilgrim_safe_predict_api, name='pilgrim_safe_predict'),
    path('pilgrim-safe-zones/', pilgrim_safe_zones_api, name='pilgrim_safe_zones'),

    # What-If Simulator & Digital Twin APIs
    path('simulation/run/', run_simulation_api, name='run_simulation'),
    path('simulation/compare/', compare_actions_api, name='compare_actions'),
    path('simulation/runs/', simulation_runs_list_api, name='simulation_runs_list'),
    path('visitor/safety/', visitor_safety_api, name='visitor_safety'),
]





