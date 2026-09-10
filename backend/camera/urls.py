from django.urls import path
from .views import CameraListCreateView, CameraRetrieveUpdateDestroyView, toggle_camera_status, cameras_status_api

urlpatterns = [
    path('', CameraListCreateView.as_view(), name='camera_list_create'),
    path('status/', cameras_status_api, name='cameras_status'),
    path('<int:pk>/', CameraRetrieveUpdateDestroyView.as_view(), name='camera_detail'),
    path('<int:pk>/toggle-status/', toggle_camera_status, name='camera_toggle_status'),
]

