from django.urls import path
from .views import ReportListView, generate_report_api, share_report_api

urlpatterns = [
    path('', ReportListView.as_view(), name='report_list'),
    path('generate/', generate_report_api, name='report_generate'),
    path('<int:report_id>/share/', share_report_api, name='report_share'),
]
