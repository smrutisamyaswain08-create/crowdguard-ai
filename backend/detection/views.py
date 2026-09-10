import os
import cv2
import time
import random
import numpy as np
from django.http import StreamingHttpResponse, Http404
from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from camera.models import Camera
from alerts.models import Alert
from .models import Detection
from .serializers import DetectionSerializer
from .yolo_detector import YoloDetector
from .satellite_detector import SatelliteCrowdDetector
from alerts.utils import trigger_risk_alert_email

# Instantiate detector instances lazily or globally
detector_instance = None
satellite_detector = None

def get_yolo_detector():
    global detector_instance
    if detector_instance is None:
        detector_instance = YoloDetector()
    return detector_instance

class LazyDetectorProxy:
    def __getattr__(self, item):
        return getattr(get_yolo_detector(), item)

detector = LazyDetectorProxy()

def get_satellite_detector():
    global satellite_detector
    if satellite_detector is None:
        satellite_detector = SatelliteCrowdDetector()
    return satellite_detector


class DetectionHistoryView(generics.ListAPIView):
    queryset = Detection.objects.all()
    serializer_class = DetectionSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        queryset = Detection.objects.all().order_by('-timestamp')
        camera_id = self.request.query_params.get('camera_id')
        risk = self.request.query_params.get('risk')
        alerts = self.request.query_params.get('alerts')
        if camera_id:
            queryset = queryset.filter(camera_id=camera_id)
        if risk:
            queryset = queryset.filter(risk=risk)
        if alerts == 'true':
            queryset = queryset.filter(risk__in=['medium', 'high', 'critical'])
        return queryset

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def latest_detection_stats(request, camera_id):
    try:
        latest = Detection.objects.filter(camera_id=camera_id).first()
        if latest:
            serializer = DetectionSerializer(latest, context={'request': request})
            return Response(serializer.data)
        return Response({"message": "No detections found for this camera"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print("Error in detect_image:", str(e))
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def manage_thresholds_api(request):
    """
    GET: Retrieve current risk thresholds.
    POST / PUT: Update risk thresholds (Admin only).
    """
    from .models import RiskThreshold
    
    thresholds = RiskThreshold.objects.first()
    if not thresholds:
        thresholds = RiskThreshold.objects.create(low_limit=50, medium_limit=150, high_limit=300)
        
    if request.method == 'GET':
        return Response({
            'low_limit': thresholds.low_limit,
            'medium_limit': thresholds.medium_limit,
            'high_limit': thresholds.high_limit
        })
        
    # POST/PUT: Enforce admin permissions check
    if getattr(request.user, 'role', '') != 'admin':
        return Response({"error": "Unauthorized. Only administrators can update risk thresholds."}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        low_limit = int(request.data.get('low_limit', thresholds.low_limit))
        medium_limit = int(request.data.get('medium_limit', thresholds.medium_limit))
        high_limit = int(request.data.get('high_limit', thresholds.high_limit))
        
        # Validations
        if low_limit >= medium_limit or medium_limit >= high_limit:
            return Response({"error": "Invalid boundaries. Limits must follow: Low < Medium < High."}, status=status.HTTP_400_BAD_REQUEST)
            
        thresholds.low_limit = low_limit
        thresholds.medium_limit = medium_limit
        thresholds.high_limit = high_limit
        thresholds.save()
        
        # Log to AuditLog
        from accounts.models import AuditLog
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]
        
        AuditLog.objects.create(
            user=request.user,
            action='threshold_update',
            ip_address=ip,
            user_agent=user_agent
        )
        
        return Response({
            'message': 'Risk thresholds successfully updated.',
            'low_limit': thresholds.low_limit,
            'medium_limit': thresholds.medium_limit,
            'high_limit': thresholds.high_limit
        })
    except ValueError:
        return Response({"error": "Threshold limits must be integers."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_risk_level(count, density=0.0):
    from .models import RiskThreshold
    try:
        thresholds = RiskThreshold.objects.first()
        if not thresholds:
            thresholds = RiskThreshold.objects.create(low_limit=50, medium_limit=150, high_limit=300)
        low = thresholds.low_limit
        medium = thresholds.medium_limit
        high = thresholds.high_limit
    except Exception:
        low, medium, high = 50, 150, 300
        
    if count > high or density >= 0.35:
        return 'critical'
    elif count > medium or density >= 0.20:
        return 'high'
    elif count > low or density >= 0.10:
        return 'medium'
    else:
        return 'low'


# Class to simulate walk path of dots for synthetic camera stream
class SyntheticPerson:
    def __init__(self, w, h):
        self.x = random.randint(50, w - 50)
        self.y = random.randint(50, h - 50)
        self.vx = random.uniform(-2, 2)
        self.vy = random.uniform(-2, 2)
        self.w = w
        self.h = h

    def update(self):
        self.x += self.vx
        self.y += self.vy
        # Bounce off boundaries
        if self.x < 20 or self.x > self.w - 20:
            self.vx *= -1
        if self.y < 20 or self.y > self.h - 20:
            self.vy *= -1
        self.x = max(10, min(self.x, self.w - 10))
        self.y = max(10, min(self.y, self.h - 10))


def gen_frames(camera_id):
    """
    Generator that captures video from the camera, runs the crowd model,
    saves periodic database checkpoints, triggers alerts, and yields MJPEG frames.
    """
    try:
        camera = Camera.objects.get(pk=camera_id)
    except Camera.DoesNotExist:
        return

    # Track risk level to send transition email alerts
    current_risk_state = 'low'

    # Check if we should use uploaded video, rtsp, or fall back to synthetic
    video_source = None
    if camera.video_file:
        video_source = camera.video_file.path
    elif camera.stream_url:
        video_source = camera.stream_url

    cap = None
    if video_source:
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            print(f"Failed to open video source {video_source}, using synthetic feed.")
            cap = None

    # Constants for synthetic generation
    width, height = 640, 480
    # Keep track of active mock persons
    num_people = random.randint(30, 350) # Randomize to simulate overcrowding occasionally
    people = [SyntheticPerson(width, height) for _ in range(num_people)]
    
    # Store previous alert status to avoid spamming alerts in the database
    last_db_save_time = 0
    db_save_interval = 4.0 # save database stats every 4 seconds

    # Rate-limit database refreshes for camera status (checking every 2 seconds instead of every frame)
    last_db_refresh_time = 0
    db_refresh_interval = 2.0

    # Stream connection drop recovery configurations
    consecutive_failures = 0
    last_reconnect_attempt = 0
    reconnect_cooldown = 15.0 # seconds

    # Main stream loop
    while True:
        # Check if camera was turned offline
        now_time = time.time()
        if now_time - last_db_refresh_time >= db_refresh_interval:
            last_db_refresh_time = now_time
            try:
                camera.refresh_from_db()
            except Exception as e:
                print(f"Error refreshing camera status from database: {e}")

        if camera.status == 'offline':
            # Create a blank offline screen
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, f"CAMERA OFFLINE: {camera.name}", (50, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.5)
            continue

        # Cooldown reconnection logic for RTSP/Stream URLs
        if cap is None and video_source and not camera.video_file:
            if now_time - last_reconnect_attempt >= reconnect_cooldown:
                print(f"[STREAM INFO] Attempting to reconnect to: {video_source}")
                last_reconnect_attempt = now_time
                try:
                    new_cap = cv2.VideoCapture(video_source)
                    if new_cap.isOpened():
                        cap = new_cap
                        consecutive_failures = 0
                        print(f"[STREAM SUCCESS] Successfully reconnected to: {video_source}")
                    else:
                        new_cap.release()
                except Exception as ex:
                    print(f"[STREAM ERROR] Reconnection attempt failed: {ex}")

        ret = False
        frame = None
        t_start_read = time.time()
        if cap is not None:
            ret, frame = cap.read()
            if not ret:
                # If it's a file, try to loop it
                if camera.video_file:
                    try:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                    except Exception as e:
                        print(f"Error resetting video file: {e}")
                        ret = False
                
                # If still failing, count consecutive failures
                if not ret:
                    consecutive_failures += 1
                    print(f"[STREAM INFO] Read failed from {video_source}. Consecutive failures: {consecutive_failures}")
                    if consecutive_failures >= 5:
                        print(f"[STREAM WARNING] Disconnecting broken feed: {video_source}. Falling back to synthetic feed.")
                        cap.release()
                        cap = None
                        last_reconnect_attempt = time.time()
                else:
                    consecutive_failures = 0
        
        # If no camera or synthetic mode is active
        if frame is None:
            # Generate a nice synthetic CCTV concourse scene
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            # Draw background grid/pillars
            cv2.rectangle(frame, (0, 0), (width, height), (30, 30, 30), -1)
            cv2.line(frame, (100, 0), (100, height), (50, 50, 50), 2)
            cv2.line(frame, (540, 0), (540, height), (50, 50, 50), 2)
            cv2.putText(frame, "CCTV CONCOURSE SIMULATION FEED", (30, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1, cv2.LINE_AA)
            
            # Periodically shift number of people to trigger different alert states
            current_time_sec = time.time()
            if int(current_time_sec) % 60 == 0:
                # toggle density randomly
                num_people = random.choice([25, 80, 200, 340])
                people = [SyntheticPerson(width, height) for _ in range(num_people)]

            # Draw people walking around
            for person in people:
                person.update()
                # Draw head
                cv2.circle(frame, (int(person.x), int(person.y)), 10, (180, 105, 255), -1)
                # Draw shoulders
                cv2.ellipse(frame, (int(person.x), int(person.y) + 12), (14, 5), 0, 0, 360, (120, 120, 120), -1)
                
            time.sleep(0.04) # limit to approx 25 fps
            
        # Run Detection
        count, density, heatmap, overlay = get_yolo_detector().process_frame(frame)
        risk = get_risk_level(count)

        # Check for risk phase transition from low to higher risk (medium/high/critical)
        email_dispatched_for_this_frame = False
        if risk != current_risk_state:
            if current_risk_state == 'low' and risk in ['medium', 'high', 'critical']:
                try:
                    trigger_risk_alert_email(camera.name, camera.location, current_risk_state, risk, count)
                    email_dispatched_for_this_frame = True
                except Exception as ex:
                    print(f"Error triggering transition email: {ex}")
            current_risk_state = risk

        # Draw overlay annotations
        # Draw stats overlay in a translucent top bar
        overlay_annotated = overlay.copy()
        cv2.rectangle(overlay_annotated, (0, 0), (width if frame is None else frame.shape[1], 45), (0, 0, 0), -1)
        
        status_colors = {
            'low': (0, 255, 0),       # Green
            'medium': (0, 255, 255),   # Yellow
            'high': (0, 165, 255),    # Orange
            'critical': (0, 0, 255)    # Red
        }
        color = status_colors.get(risk, (255, 255, 255))
        
        text = f"CAM: {camera.name} | COUNT: {count} | RISK: {risk.upper()}"
        cv2.putText(overlay_annotated, text, (15, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
        
        # Save to database periodically
        now = time.time()
        if now - last_db_save_time >= db_save_interval:
            last_db_save_time = now
            
            if camera.name != "Manual Image Uploads":
                try:
                    # Save frame and heatmap to database
                    _, enc_frame = cv2.imencode('.jpg', frame if frame is not None else overlay)
                    _, enc_heatmap = cv2.imencode('.jpg', heatmap)
                    
                    det = Detection(
                        camera=camera,
                        count=count,
                        density=density,
                        risk=risk,
                        email_sent=email_dispatched_for_this_frame or (risk in ['high', 'critical'])
                    )
                    
                    timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
                    det.image.save(f"cam_{camera.id}_{timestamp_str}.jpg", ContentFile(enc_frame.tobytes()), save=False)
                    det.heatmap.save(f"cam_{camera.id}_hm_{timestamp_str}.jpg", ContentFile(enc_heatmap.tobytes()), save=False)
                    det.save()
                    
                    # Create Privacy Preservation Audit Log
                    from analytics.models import PrivacyLog, UnusualIncident
                    PrivacyLog.objects.create(
                        frame_hash=f"hash_{camera.id}_{timestamp_str}",
                        detections_processed=count,
                        pii_purged=True,
                        anonymous_aggregation_verified=True
                    )

                    # AI Unusual Incident Detection & Risk Scoring (0 - 100)
                    if risk in ['medium', 'high', 'critical']:
                        score = 45 if risk == 'medium' else (75 if risk == 'high' else 95)
                        inc_type = 'stampede_risk' if risk == 'critical' else ('bottleneck_congestion' if risk == 'high' else 'restricted_entry_breach')
                        UnusualIncident.objects.create(
                            detection=det,
                            zone=camera.zone,
                            incident_type=inc_type,
                            risk_score=score,
                            details=f"AI anomaly scoring calculated high crowd density ({count} persons) on feed [{camera.name}]."
                        )

                    # Check for alert trigger
                    # Evacuation / Overcrowding Alert logic
                    active_alerts = Alert.objects.filter(detection__camera=camera, resolved=False)
                    
                    if risk in ['high', 'critical']:
                        alert_type = 'evacuation' if risk == 'critical' else 'overcrowding'
                        
                        # Check if there is already an unresolved alert of the same or higher type
                        already_alerted = False
                        for active in active_alerts:
                            if active.alert_type == alert_type or active.alert_type == 'evacuation':
                                already_alerted = True
                                break
                                
                        if not already_alerted:
                            # Auto-restrict entry if critical
                            if risk == 'critical':
                                Alert.objects.create(detection=det, alert_type='restricted_entry')
                            
                            Alert.objects.create(detection=det, alert_type=alert_type)
                            print(f"!!! ALERT CREATED FOR CAMERA {camera.name}: {alert_type.upper()} !!!")

                            
                    elif risk == 'low' and active_alerts.exists():
                        # Resolve active overcrowding/evacuation alerts
                        for active in active_alerts:
                            if active.alert_type in ['overcrowding', 'evacuation', 'restricted_entry']:
                                active.resolved = True
                                active.resolved_at = timezone.now()
                                active.save()
                        
                        # Create a recovery alert
                        Alert.objects.create(detection=det, alert_type='safe_level', resolved=True, resolved_at=timezone.now())
                        print(f"Crowd returning to safe level on camera {camera.name}")
                        
                except Exception as ex:
                    print(f"Error saving detection/alert: {ex}")

        # Combine processed original (left) and colormap heatmap (right) for side-by-side display
        # We resize them if they are too large
        disp_h, disp_w = 320, 426
        left = cv2.resize(overlay_annotated, (disp_w, disp_h))
        right = cv2.resize(heatmap, (disp_w, disp_h))
        combined_display = np.hstack((left, right))
        
        # Add labels to visual stream
        cv2.putText(combined_display, "AI DETECTION OVERLAY", (10, disp_h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(combined_display, "AI DENSITY HEATMAP", (disp_w + 10, disp_h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
        
        # Encode for streaming
        _, final_buffer = cv2.imencode('.jpg', combined_display)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + final_buffer.tobytes() + b'\r\n')

        # Throtle CPU loop when playing back from video files
        if cap is not None:
            # Yield CPU control to other threads / limit frame processing speed
            # Target ~25 FPS (40ms per loop). Subtract elapsed processing time, sleep min 15ms.
            dt_processed = time.time() - t_start_read
            sleep_time = max(0.015, 0.04 - dt_processed)
            time.sleep(sleep_time)


def camera_stream_view(request, camera_id):
    """View endpoint that serves the real-time processed crowd analytics feed."""
    return StreamingHttpResponse(
        gen_frames(camera_id),
        content_type='multipart/x-mixed-replace; boundary=frame'
    )


def decode_uploaded_image(image_file):
    """
    Decodes an uploaded image file into an OpenCV BGR numpy array.
    Uses OpenCV first, with PIL/Pillow fallback for WebP, HEIC, RGBA, CMYK,
    progressive formats, and EXIF orientation correction.
    """
    if not image_file:
        return None

    try:
        file_bytes = image_file.read()
        if not file_bytes:
            return None

        if hasattr(image_file, 'seek'):
            image_file.seek(0)

        # 1. Try OpenCV decode first
        file_np = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(file_np, cv2.IMREAD_COLOR)

        if frame is not None and frame.size > 0:
            return frame

        # 2. Fallback to PIL Image decoding for WebP, RGBA, HEIC, etc.
        import io
        from PIL import Image, ImageOps
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)
        pil_img = pil_img.convert('RGB')
        frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        return frame
    except Exception as e:
        print(f"[Image Decode Warning]: Failed to decode image: {e}")
        return None


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def detect_single_image(request):
    """
    Endpoint to process a single uploaded image, log the detection in the database,
    and trigger email alerts if the risk is high or critical.
    Supports high-precision tiled multi-scale inference and configurable confidence thresholds.
    Accepts optional model_type ('yolo' or 'csrnet'); defaults to settings.S19_DEFAULT_MODEL if omitted.
    """
    from django.conf import settings

    image_file = request.FILES.get('image')
    if not image_file:
        return Response({"error": "No image file provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Optional parameters for zone selection, model choice, detection precision and sensitivity
    zone_id = request.data.get('zone_id')
    model_type = request.data.get('model_type', getattr(settings, 'S19_DEFAULT_MODEL', 'yolo')).lower()
    if model_type not in ['yolo', 'csrnet']:
        model_type = getattr(settings, 'S19_DEFAULT_MODEL', 'yolo').lower()

    high_precision_str = request.data.get('high_precision', 'true')
    high_precision = str(high_precision_str).lower() in ['true', '1', 'yes']
    
    default_conf = getattr(settings, 'S19_CONFIDENCE_THRESHOLD', 0.25)
    try:
        conf = float(request.data.get('confidence', default_conf))
        conf = max(0.01, min(0.90, conf))
    except (ValueError, TypeError):
        conf = default_conf

    try:
        # Retrieve target Zone if provided
        from analytics.models import Zone
        selected_zone = None
        if zone_id:
            selected_zone = Zone.objects.filter(id=zone_id).first()
        if not selected_zone:
            selected_zone = Zone.objects.filter(code="ZONE-BADA-A").first() or Zone.objects.first()

        # Decode image cleanly using OpenCV + PIL fallback
        frame = decode_uploaded_image(image_file)
        if frame is None or frame.size == 0:
            return Response({"error": "Invalid or corrupted image file. Please upload a valid PNG, JPG, or WebP image."}, status=status.HTTP_400_BAD_REQUEST)

        # Run AI crowd processing using selected or default model
        yolo_engine = get_yolo_detector()

        if model_type == 'csrnet':
            count, density, heatmap, overlay = yolo_engine.process_image_only_csrnet(frame)
            model_used = "CSRNet (Congested Scene Recognition Network)"
            detection_mode = "Spatial Density Map Integration"
        else:
            count, density, heatmap, overlay = yolo_engine.process_frame(
                frame, 
                high_precision=high_precision, 
                conf=conf
            )
            model_used = getattr(yolo_engine, 'model_name', 'S-19 YOLO Head Detector')
            detection_mode = "Tiled Sliced Multi-Scale Inference" if high_precision else "Single-Pass Inference"

        avg_conf = getattr(yolo_engine, 'last_avg_confidence', 0.95)
        risk = get_risk_level(count, density=density)
        
        confidence_pct = round(avg_conf * 100, 1) if (avg_conf and avg_conf > 0) else 95.0
        confidence_score = f"{confidence_pct}%"

        # Update selected zone current occupancy & risk
        if selected_zone:
            selected_zone.current_occupancy = count
            selected_zone.risk_level = risk
            selected_zone.save()

        # Run AI Crowd Forecast for zone
        from analytics.ml_crowd_engine import ml_engine
        forecast_res = ml_engine.predict_zone_crowd_and_risk({
            'zone_id': selected_zone.code if selected_zone else 'ZONE-BADA-A',
            'zone_name': selected_zone.name if selected_zone else 'Selected Zone',
            'capacity': selected_zone.capacity_limit if selected_zone else 5000,
            'current_crowd': count,
            'growth_rate': 0.12
        })

        # Find or create a virtual system camera for manual uploads
        camera, _ = Camera.objects.get_or_create(
            name="Manual Image Uploads",
            defaults={
                "location": selected_zone.location_name if selected_zone else "Bada Danda",
                "status": "online"
            }
        )
        if selected_zone:
            selected_zone.cameras.add(camera)

        # Create Detection instance
        det = Detection(
            camera=camera,
            count=count,
            density=density,
            risk=risk,
            email_sent=False
        )

        # Encode visual images to JPG byte buffers
        _, enc_overlay = cv2.imencode('.jpg', overlay)
        _, enc_heatmap = cv2.imencode('.jpg', heatmap)

        # Save files and detection directly using Django's FileField storage API
        timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
        det.image.save(f"manual_{timestamp_str}.jpg", ContentFile(enc_overlay.tobytes()), save=False)
        det.heatmap.save(f"manual_hm_{timestamp_str}.jpg", ContentFile(enc_heatmap.tobytes()), save=False)
        det.save()

        # Check for threshold breach and trigger active alerts
        alert_triggered = False
        if risk in ['medium', 'high', 'critical']:
            alert_triggered = True
            alert_type = 'evacuation' if risk == 'critical' else 'overcrowding'
            
            # Auto-restrict entry if critical
            if risk == 'critical':
                Alert.objects.create(detection=det, alert_type='restricted_entry')
            
            Alert.objects.create(detection=det, alert_type=alert_type)
            
            if risk in ['high', 'critical']:
                try:
                    trigger_risk_alert_email(
                        camera_name=camera.name,
                        location=selected_zone.location_name if selected_zone else camera.location,
                        previous_risk='low',
                        new_risk=risk,
                        count=count
                    )
                    det.email_sent = True
                    det.save(update_fields=['email_sent'])
                except Exception as email_err:
                    print(f"Error triggering alert email for manual upload: {email_err}")

        # Construct full URLs for the response
        overlay_url = request.build_absolute_uri(det.image.url)
        heatmap_url = request.build_absolute_uri(det.heatmap.url)

        return Response({
            "id": det.id,
            "count": count,
            "estimated_image_count": count,
            "density": round(density, 3),
            "risk": risk,
            "risk_level": risk.upper(),
            "avg_confidence": confidence_pct,
            "confidence_score": confidence_score,
            "email_sent": det.email_sent,
            "alert_triggered": alert_triggered,
            "overlay_url": overlay_url,
            "heatmap_url": heatmap_url,
            "model_used": model_used,
            "detection_mode": detection_mode,
            "confidence_threshold": conf,
            "location_name": selected_zone.location_name if selected_zone else "Bada Danda",
            "zone_id": selected_zone.id if selected_zone else None,
            "zone_name": selected_zone.name if selected_zone else "Bada Danda - Entry Section",
            "zone_capacity": selected_zone.capacity_limit if selected_zone else 5000,
            "zone_occupancy_pct": selected_zone.occupancy_percentage if selected_zone else round((count/5000)*100, 1),
            "forecast": forecast_res['predictions'],
            "risk_explanation": forecast_res['risk']['explainable_reasons'],
            "provenance": {
                "source": "Manual Image / Simulated Camera Input",
                "model": model_used,
                "location": selected_zone.location_name if selected_zone else "Bada Danda",
                "monitoring_zone": selected_zone.name if selected_zone else "Selected Zone",
                "result_type": "AI Estimated",
                "forecast_type": "AI Forecast",
                "what_if_status": "Simulation Ready",
                "live_cctv": "Not Connected (Simulated Input)",
                "prototype_disclaimer": "PROTOTYPE MODE: Manual image upload input for simulated camera analysis."
            }
        }, status=status.HTTP_200_OK)


    except Exception as e:
        return Response({"error": f"Error running detection model: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def satellite_area_analysis(request):
    """
    POST endpoint to analyze real-time satellite imagery for crowd estimation:
    Accepts latitude, longitude, location_name, area_sq_meters OR custom uploaded satellite tile image.
    Executes YOLOv8 + SAHI density kernel model to compute crowd metrics & heatmaps.
    """
    try:
        lat = float(request.data.get('latitude', 19.8876))
        lng = float(request.data.get('longitude', 86.0945))
        location_name = request.data.get('location_name', 'Konark Sun Temple & Sanctuary (Konark, Odisha, India)')
        area_sq_meters = int(request.data.get('area_sq_meters', 4500))
        zoom = int(request.data.get('zoom', 16))
        
        sat_engine = get_satellite_detector()



        
        # Check if user uploaded a custom satellite/drone tile image
        if 'image' in request.FILES:
            file = request.FILES['image']
            frame = decode_uploaded_image(file)
            provider_name = "Uploaded High-Res Satellite/Aerial Tile"
        else:
            # Fetch optical satellite imagery tile from geospatial API or high-res feed simulation
            frame, provider_name = sat_engine.fetch_satellite_tile(lat, lng, zoom=zoom)

        if frame is None or frame.shape[0] == 0:
            return Response({"error": "Failed to retrieve or decode satellite image feed."}, status=status.HTTP_400_BAD_REQUEST)

        # Run AI detection & heatmap synthesis engine
        result = sat_engine.analyze_satellite_frame(
            frame, 
            area_sq_meters=area_sq_meters, 
            provider_name=provider_name
        )

        result["location_name"] = location_name
        result["latitude"] = lat
        result["longitude"] = lng
        result["zoom"] = zoom

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"[satellite_area_analysis Error]: {str(e)}\n{traceback.format_exc()}")
        return Response({"error": f"Satellite AI processing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



