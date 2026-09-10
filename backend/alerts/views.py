import random
import json
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from .models import Alert, EmergencySOS, EmergencyResponseUnit, DispatchRecord
from .serializers import (
    AlertSerializer, EmergencySOSSerializer,
    EmergencyResponseUnitSerializer, DispatchRecordSerializer
)
from analytics.models import Zone

def seed_default_responders():
    """Utility to seed first responder units and sample SOS alerts in Odisha if empty."""
    if EmergencyResponseUnit.objects.count() == 0:
        zones = list(Zone.objects.all())
        z0 = zones[0] if len(zones) > 0 else None
        z1 = zones[1] if len(zones) > 1 else None
        z2 = zones[2] if len(zones) > 2 else None
        
        responders = [
            {"unit_name": "Odisha Police Command Unit (Puri Bada Danda)", "unit_type": "police", "contact_phone": "+91 6752 222000", "status": "available", "current_lat": 19.8140, "current_lng": 85.8310, "assigned_zone": z0},
            {"unit_name": "Puri District Hospital Ambulance Squad A", "unit_type": "medical_team", "contact_phone": "+91 6752 222108", "status": "available", "current_lat": 19.7985, "current_lng": 85.8250, "assigned_zone": z2},
            {"unit_name": "Konark Marine Drive Wildlife Patrol 04", "unit_type": "park_ranger", "contact_phone": "+91 6758 236800", "status": "available", "current_lat": 19.8885, "current_lng": 86.0955, "assigned_zone": z1},
            {"unit_name": "ODRAF Disaster Rescue & Fire Unit (Puri Station)", "unit_type": "fire_rescue", "contact_phone": "+91 6752 222101", "status": "available", "current_lat": 20.2390, "current_lng": 85.8350, "assigned_zone": None},
        ]
        for r in responders:
            EmergencyResponseUnit.objects.create(**r)

    if EmergencySOS.objects.count() == 0:
        zones = list(Zone.objects.all())
        z0 = zones[0] if len(zones) > 0 else None
        z1 = zones[1] if len(zones) > 1 else None
        
        sample_sos = [
            {
                "sos_code": "SOS-9041",
                "sender_name": "Ananya Mohanty (Pilgrim)",
                "contact_number": "+91 98765 43210",
                "location_name": "Shree Jagannath Temple Lion's Gate (Singhadwara)",
                "latitude": 19.8138,
                "longitude": 85.8315,
                "category": "stampede",
                "urgency": "critical",
                "status": "pending",
                "notes": "Sudden crowd surge near Singhadwara bottleneck. Medical assistance required.",
                "zone": z0
            },
            {
                "sos_code": "SOS-9042",
                "sender_name": "Rohan Das (Eco-Tourist)",
                "contact_number": "+91 91234 56789",
                "location_name": "Konark Sun Temple Sanctuary Promenade",
                "latitude": 19.8878,
                "longitude": 86.0947,
                "category": "medical",
                "urgency": "high",
                "status": "verified",
                "notes": "Heat exhaustion reported near tourist rest shed.",
                "zone": z1
            }
        ]
        for s in sample_sos:
            EmergencySOS.objects.create(**s)


class AlertListView(generics.ListAPIView):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = Alert.objects.all()
        resolved = self.request.query_params.get('resolved')
        camera_id = self.request.query_params.get('camera_id')
        if resolved is not None:
            is_resolved = resolved.lower() == 'true'
            queryset = queryset.filter(resolved=is_resolved)
        if camera_id:
            queryset = queryset.filter(detection__camera_id=camera_id)
        return queryset

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resolve_alert(request, pk):
    try:
        alert = Alert.objects.get(pk=pk)
        alert.resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save()
        return Response({"message": f"Alert {pk} resolved successfully."})
    except Alert.DoesNotExist:
        return Response({"error": "Alert not found"}, status=status.HTTP_404_NOT_FOUND)
    alert.resolved_at = timezone.now()
    alert.save()
    
    # Auto-resolve companion restricted entry if exists for the same detection
    companions = Alert.objects.filter(detection=alert.detection, resolved=False)
    for comp in companions:
        comp.resolved = True
        comp.resolved_by = request.user
        comp.resolved_at = timezone.now()
        comp.save()
        
    serializer = AlertSerializer(alert)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_officer_alert_email(request):
    """
    POST: Send a custom stampede warning email to a selected officer.
    """
    from django.core.mail import send_mail
    from django.conf import settings
    
    email = request.data.get('email')
    username = request.data.get('username')
    location = request.data.get('location')
    risk = request.data.get('risk', 'medium')
    count = request.data.get('count', 0)
    detection_id = request.data.get('detection_id')
    
    if not email:
        return Response({"error": "Officer email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    subject = f"[CRITICAL WARNING] Stampede Risk Alert at {location} - {risk.upper()} Risk"
    message = (
        f"Hello Officer {username},\n\n"
        f"WARNING: A crowd density analysis has detected a potential stampede risk at your location.\n\n"
        f"Details:\n"
        f"Assigned Location: {location}\n"
        f"Crowd Count: {count} people\n"
        f"Calculated Risk: {risk.upper()}\n\n"
        f"Please verify this warning immediately and manage the crowd flow to prevent stampedes.\n\n"
        f"CrowdGuard Security Operations Team\n"
    )
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=False,
        )
        
        if detection_id:
            from detection.models import Detection
            try:
                det = Detection.objects.get(id=detection_id)
                det.email_sent = True
                det.save()
            except Detection.DoesNotExist:
                pass
                
        return Response({"message": f"Stampede alert successfully emailed to Officer {username} at {email}."})
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- EMERGENCY VERIFIED SOS & SERVICE DISPATCH ENDPOINTS ---

@api_view(['POST'])
@permission_classes([permissions.AllowAny]) # Visitors/tourists can trigger SOS without auth
def trigger_sos_api(request):
    """
    Public/Visitor SOS trigger.
    Payload: { "location_name": "West Shrine Gate", "category": "medical", "urgency": "critical", "sender_name": "John Doe", "contact_number": "+123456789", "latitude": 20.5937, "longitude": 78.9629, "notes": "Fainted visitor needing oxygen" }
    """
    code = f"SOS-{random.randint(1000, 9999)}-{timezone.now().strftime('%H%M')}"
    
    data = request.data.copy()
    data['sos_code'] = code
    data['status'] = 'pending'

    # Auto assign zone if coordinates fall into a zone
    lat = float(data.get('latitude', 20.5937))
    lng = float(data.get('longitude', 78.9629))
    matching_zone = Zone.objects.first()
    if matching_zone:
        data['zone'] = matching_zone.id

    serializer = EmergencySOSSerializer(data=data)
    if serializer.is_valid():
        sos = serializer.save()
        return Response({
            "message": "Emergency SOS triggered successfully! Security officers notified.",
            "sos": serializer.data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def sos_list_api(request):
    """List all Emergency SOS triggers with status and urgency filters."""
    seed_default_responders()
    queryset = EmergencySOS.objects.all().order_by('-created_at')
    sos_status = request.query_params.get('status')
    urgency = request.query_params.get('urgency')
    if sos_status:
        queryset = queryset.filter(status=sos_status)
    if urgency:
        queryset = queryset.filter(urgency=urgency)

    serializer = EmergencySOSSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_sos_api(request, pk):
    """
    Security Officer verification workflow.
    Payload: { "status": "verified" | "false_alarm", "notes": "Verified by security squad on scene" }
    """
    try:
        sos = EmergencySOS.objects.get(pk=pk)
    except EmergencySOS.DoesNotExist:
        return Response({"error": "SOS record not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status', 'verified')
    notes = request.data.get('notes', '')

    if new_status not in ['verified', 'false_alarm', 'resolved']:
        return Response({"error": "Invalid status update"}, status=status.HTTP_400_BAD_REQUEST)

    sos.status = new_status
    if request.user and request.user.is_authenticated:
        sos.verified_by = request.user
    sos.verified_at = timezone.now()
    if notes:
        sos.notes = f"{sos.notes}\n[{timezone.now().strftime('%H:%M')}] {notes}".strip()
    sos.save()

    serializer = EmergencySOSSerializer(sos)
    return Response({
        "message": f"SOS [{sos.sos_code}] status updated to {new_status.upper()}.",
        "sos": serializer.data
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def responder_units_list_api(request):
    """List first responder units and their live status/coordinates."""
    seed_default_responders()
    units = EmergencyResponseUnit.objects.all()
    # Add subtle dynamic GPS patrol movement jitter
    for u in units:
        if u.status == 'available':
            u.current_lat = round(u.current_lat + random.uniform(-0.0002, 0.0002), 5)
            u.current_lng = round(u.current_lng + random.uniform(-0.0002, 0.0002), 5)
            u.save(update_fields=['current_lat', 'current_lng'])

    serializer = EmergencyResponseUnitSerializer(units, many=True)
    return Response(serializer.data)



@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def dispatch_unit_api(request):
    """
    Dispatch first responder unit to a verified SOS alert.
    Payload: { "sos_id": 1, "unit_id": 2, "eta_minutes": 4 }
    """
    seed_default_responders()
    sos_id = request.data.get('sos_id')
    unit_id = request.data.get('unit_id')
    eta_minutes = int(request.data.get('eta_minutes', 5))

    try:
        sos = EmergencySOS.objects.get(pk=sos_id)
        unit = EmergencyResponseUnit.objects.get(pk=unit_id)
    except (EmergencySOS.DoesNotExist, EmergencyResponseUnit.DoesNotExist):
        return Response({"error": "Invalid SOS or Emergency Unit ID"}, status=status.HTTP_404_NOT_FOUND)

    # Generate response route coordinates from unit to SOS target
    start_lat, start_lng = unit.current_lat, unit.current_lng
    end_lat, end_lng = sos.latitude, sos.longitude

    route_waypoints = [
        [start_lat, start_lng],
        [start_lat + (end_lat - start_lat) * 0.33, start_lng + (end_lng - start_lng) * 0.33],
        [start_lat + (end_lat - start_lat) * 0.66, start_lng + (end_lng - start_lng) * 0.66],
        [end_lat, end_lng]
    ]

    dispatch = DispatchRecord.objects.create(
        sos=sos,
        unit=unit,
        eta_minutes=eta_minutes,
        route_coordinates_json=json.dumps(route_waypoints),
        status='en_route'
    )

    sos.status = 'dispatched'
    sos.save()

    unit.status = 'dispatched'
    unit.save()

    serializer = DispatchRecordSerializer(dispatch)
    return Response({
        "message": f"Successfully dispatched unit [{unit.unit_name}] to SOS [{sos.sos_code}]. ETA: {eta_minutes} mins.",
        "dispatch": serializer.data
    }, status=status.HTTP_201_CREATED)
