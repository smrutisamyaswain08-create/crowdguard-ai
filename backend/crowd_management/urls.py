"""
URL configuration for crowd_management project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse

from analytics.views import live_crowd_api, zone_crowd_api, real_incidents_api, isro_geospatial_api, crowd_stream_sse_api
from camera.views import cameras_status_api

def api_root_index(request):
    return JsonResponse({
        "status": "online",
        "system": "Smart Tourism & Crowd Management AI API",
        "message": "Puri Pilgrimage & Tourist Intelligence Engine active",
        "version": "v2.4",
        "endpoints": {
            "auth": "/api/auth/",
            "camera": "/api/camera/",
            "cameras_status": "/api/cameras/status/",
            "crowd_live": "/api/crowd/live/",
            "crowd_zones": "/api/crowd/zones/",
            "incidents": "/api/incidents/",
            "isro_geospatial": "/api/isro/geospatial/",
            "detection": "/api/detection/",
            "alerts": "/api/alerts/",
            "analytics": "/api/analytics/",
            "travel_ai": "/api/analytics/travel-ai-predict/",
            "satellite_analyze": "/api/detection/satellite-analyze/"
        }
    })

urlpatterns = [
    path('', api_root_index, name='root_index'),
    path('api/', api_root_index, name='api_index'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/camera/', include('camera.urls')),
    path('api/cameras/status/', cameras_status_api, name='cameras_status_root'),
    path('api/cameras/status', cameras_status_api),
    path('api/crowd/live/', live_crowd_api, name='live_crowd_root'),
    path('api/crowd/live', live_crowd_api),
    path('api/crowd/zones/', zone_crowd_api, name='zone_crowd_root'),
    path('api/crowd/zones', zone_crowd_api),
    path('api/crowd/stream/', crowd_stream_sse_api, name='crowd_stream_sse_root'),
    path('api/incidents/', real_incidents_api, name='real_incidents_root'),
    path('api/incidents', real_incidents_api),
    path('api/isro/geospatial/', isro_geospatial_api, name='isro_geospatial_root'),
    path('api/isro/geospatial', isro_geospatial_api),
    path('api/detection/', include('detection.urls')),
    path('api/alerts/', include('alerts.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/reports/', include('reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


