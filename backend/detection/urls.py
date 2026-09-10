from django.urls import path
from .views import (
    DetectionHistoryView, 
    latest_detection_stats, 
    camera_stream_view, 
    detect_single_image, 
    manage_thresholds_api,
    satellite_area_analysis
)

urlpatterns = [
    path('history/', DetectionHistoryView.as_view(), name='detection_history'),
    path('latest/<int:camera_id>/', latest_detection_stats, name='latest_detection_stats'),
    path('stream/<int:camera_id>/', camera_stream_view, name='camera_stream'),
    path('detect-image/', detect_single_image, name='detect_single_image'),
    path('thresholds/', manage_thresholds_api, name='manage_thresholds'),
    path('satellite-analyze/', satellite_area_analysis, name='satellite_area_analysis'),
]


