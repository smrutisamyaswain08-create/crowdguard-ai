from django.urls import path
from .views import (
    AlertListView, resolve_alert, send_officer_alert_email,
    trigger_sos_api, sos_list_api, verify_sos_api,
    responder_units_list_api, dispatch_unit_api
)

urlpatterns = [
    path('', AlertListView.as_view(), name='alert_list'),
    path('<int:pk>/resolve/', resolve_alert, name='alert_resolve'),
    path('send-officer-alert/', send_officer_alert_email, name='send_officer_alert'),

    # Emergency Verified SOS & Dispatch Endpoints
    path('sos/trigger/', trigger_sos_api, name='trigger_sos'),
    path('sos/', sos_list_api, name='sos_list'),
    path('sos/<int:pk>/verify/', verify_sos_api, name='verify_sos'),
    path('responders/', responder_units_list_api, name='responder_units_list'),
    path('dispatch/', dispatch_unit_api, name='dispatch_unit'),
]
