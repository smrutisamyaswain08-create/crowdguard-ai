from django.db import models
from django.conf import settings
from detection.models import Detection

class Alert(models.Model):
    ALERT_TYPES = (
        ('overcrowding', 'Overcrowding Detected'),
        ('evacuation', 'Evacuation Recommended'),
        ('restricted_entry', 'Restricted Entry'),
        ('safe_level', 'Crowd Returning to Safe Level'),
    )

    detection = models.ForeignKey(Detection, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='resolved_alerts'
    )
    resolved_at = models.DateTimeField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Alert: {self.get_alert_type_display()} - Resolved: {self.resolved}"


class EmergencySOS(models.Model):
    CATEGORIES = (
        ('medical', 'Medical Emergency'),
        ('stampede', 'Stampede / Overcrowding Hazard'),
        ('fire', 'Fire / Smoke Hazard'),
        ('lost_person', 'Lost Person / Child'),
        ('landslide', 'Landslide / Environmental Barrier'),
        ('wildlife_hazard', 'Wildlife / Eco Encounter'),
    )

    URGENCY_LEVELS = (
        ('low', 'Low Urgency'),
        ('medium', 'Medium Urgency'),
        ('high', 'High Urgency'),
        ('critical', 'Critical Life-Threatening'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending Verification'),
        ('verified', 'Verified Incident'),
        ('dispatched', 'Responder Dispatched'),
        ('resolved', 'Resolved & Safe'),
        ('false_alarm', 'False Alarm'),
    )

    sos_code = models.CharField(max_length=20, unique=True)
    zone = models.ForeignKey('analytics.Zone', on_delete=models.SET_NULL, null=True, blank=True, related_name='sos_alerts')
    location_name = models.CharField(max_length=200, default="Pilgrimage Shrine Main Corridor")
    latitude = models.FloatField(default=20.5937)
    longitude = models.FloatField(default=78.9629)
    sender_name = models.CharField(max_length=100, default="Anonymous Visitor")
    contact_number = models.CharField(max_length=30, blank=True, null=True)
    category = models.CharField(max_length=30, choices=CATEGORIES, default='medical')
    urgency = models.CharField(max_length=15, choices=URGENCY_LEVELS, default='high')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='verified_sos'
    )
    verified_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SOS [{self.sos_code}] {self.get_category_display()} ({self.status.upper()})"


class EmergencyResponseUnit(models.Model):
    UNIT_TYPES = (
        ('police', 'Police & Security Patrol'),
        ('medical_team', 'Medical First Responders'),
        ('fire_rescue', 'Fire & Rescue Service'),
        ('park_ranger', 'Park Rangers / Forest Eco Guard'),
        ('disaster_response', 'Disaster Relief Team'),
    )

    STATUS_CHOICES = (
        ('available', 'Available on Patrol'),
        ('dispatched', 'Dispatched to Emergency'),
        ('on_scene', 'On Scene'),
        ('busy', 'Unavailable / Busy'),
    )

    unit_name = models.CharField(max_length=120)
    unit_type = models.CharField(max_length=30, choices=UNIT_TYPES, default='police')
    contact_phone = models.CharField(max_length=30, default="+1-800-SAFE-911")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    current_lat = models.FloatField(default=20.5937)
    current_lng = models.FloatField(default=78.9629)
    assigned_zone = models.ForeignKey('analytics.Zone', on_delete=models.SET_NULL, null=True, blank=True, related_name='response_units')

    def __str__(self):
        return f"{self.unit_name} ({self.get_unit_type_display()}) - Status: {self.status}"


class DispatchRecord(models.Model):
    sos = models.ForeignKey(EmergencySOS, on_delete=models.CASCADE, related_name='dispatches')
    unit = models.ForeignKey(EmergencyResponseUnit, on_delete=models.CASCADE, related_name='dispatches')
    dispatched_at = models.DateTimeField(auto_now_add=True)
    arrived_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    route_coordinates_json = models.TextField(blank=True, null=True, help_text="List of [lat, lng] waypoints for response route")
    eta_minutes = models.IntegerField(default=5)
    status = models.CharField(max_length=20, default='en_route')

    class Meta:
        ordering = ['-dispatched_at']

    def __str__(self):
        return f"Dispatch {self.unit.unit_name} to {self.sos.sos_code} (ETA: {self.eta_minutes}m)"

