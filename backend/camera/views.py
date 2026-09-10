from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Camera
from .serializers import CameraSerializer

class CameraListCreateView(generics.ListCreateAPIView):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer
    permission_classes = (permissions.IsAuthenticated,)

class CameraRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer
    permission_classes = (permissions.IsAuthenticated,)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_camera_status(request, pk):
    try:
        camera = Camera.objects.get(pk=pk)
    except Camera.DoesNotExist:
        return Response({"error": "Camera not found"}, status=status.HTTP_404_NOT_FOUND)
    
    camera.status = 'offline' if camera.status == 'online' else 'online'
    camera.save()
    serializer = CameraSerializer(camera)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def cameras_status_api(request):
    """Returns dynamic live camera health, RTSP stream URL status, and latest detection stats."""
    from detection.models import Detection
    from django.utils import timezone

    cameras = Camera.objects.all()
    total_cams = cameras.count()
    active_cams = cameras.filter(status='online').count()
    offline_cams = total_cams - active_cams

    results = []
    for cam in cameras:
        latest_det = Detection.objects.filter(camera=cam).first()
        results.append({
            "id": cam.id,
            "name": cam.name,
            "location": cam.location,
            "zone_id": cam.zone.id if cam.zone else None,
            "zone_name": cam.zone.name if cam.zone else "Unassigned Area",
            "status": cam.status,
            "latitude": cam.latitude,
            "longitude": cam.longitude,
            "stream_url": cam.stream_url or (cam.video_file.url if cam.video_file else ""),
            "current_person_count": latest_det.count if latest_det else 0,
            "current_density": latest_det.density if latest_det else 0.0,
            "last_detection_timestamp": latest_det.timestamp.isoformat() if latest_det else None
        })

    return Response({
        "source": "CCTV / RTSP YOLOv8 AI Backend Engine",
        "total_cameras": total_cams,
        "active_cameras": active_cams,
        "offline_cameras": offline_cams,
        "cameras": results,
        "timestamp": timezone.now().isoformat()
    })

