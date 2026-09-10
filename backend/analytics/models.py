from django.db import models
from django.conf import settings
from camera.models import Camera
from detection.models import Detection

class Zone(models.Model):
    SITE_TYPES = (
        ('pilgrimage', 'Pilgrimage Shrine / Temple'),
        ('eco_tourism', 'Eco-Tourism Trail / Sanctuary'),
        ('transit', 'Transit / Concourse Hub'),
        ('event_gate', 'Event Plaza / Gate'),
    )
    
    RISK_LEVELS = (
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
        ('critical', 'Critical Risk'),
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True)
    location_name = models.CharField(max_length=150, default="Bada Danda")
    description = models.TextField(blank=True, default="")
    site_type = models.CharField(max_length=30, choices=SITE_TYPES, default='pilgrimage')
    capacity_limit = models.IntegerField(default=500)
    current_occupancy = models.IntegerField(default=0)
    risk_level = models.CharField(max_length=15, choices=RISK_LEVELS, default='low')
    warning_threshold = models.IntegerField(default=350)
    
    # Zone topology & configuration
    connected_zones = models.ManyToManyField('self', symmetrical=True, blank=True)
    entry_points = models.JSONField(default=list, blank=True, help_text="List of entry point names or coordinates")
    exit_points = models.JSONField(default=list, blank=True, help_text="List of exit point names or coordinates")
    emergency_route_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    # GeoJSON or list of lat/lng pairs stored as text for rendering polygon geofence on maps
    coordinates_json = models.TextField(blank=True, null=True, help_text="GeoJSON polygon or array of [lat, lng] points")
    center_lat = models.FloatField(default=20.5937)
    center_lng = models.FloatField(default=78.9629)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code}) - Cap: {self.capacity_limit}"

    @property
    def occupancy_percentage(self):
        if self.capacity_limit > 0:
            return round((self.current_occupancy / self.capacity_limit) * 100, 1)
        return 0.0


class CrowdForecast(models.Model):
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='forecasts', null=True, blank=True)
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='forecasts', null=True, blank=True)
    forecast_time = models.DateTimeField()
    predicted_count = models.IntegerField()
    predicted_risk = models.CharField(max_length=15, default='low')
    confidence_score = models.FloatField(default=0.92) # 0.0 to 1.0
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['forecast_time']

    def __str__(self):
        return f"Forecast for {self.forecast_time.strftime('%Y-%m-%d %H:%M')}: {self.predicted_count} people"


class UnusualIncident(models.Model):
    INCIDENT_TYPES = (
        ('stampede_risk', 'Stampede & Surge Hazard'),
        ('rapid_dispersion', 'Panic / Rapid Dispersion'),
        ('bottleneck_congestion', 'Bottleneck Stagnation'),
        ('restricted_entry_breach', 'Geofence / Restricted Zone Breach'),
        ('medical_hazard', 'Thermal / Medical Hazard'),
    )

    detection = models.ForeignKey(Detection, on_delete=models.CASCADE, related_name='unusual_incidents', null=True, blank=True)
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='unusual_incidents', null=True, blank=True)
    incident_type = models.CharField(max_length=40, choices=INCIDENT_TYPES)
    risk_score = models.IntegerField(default=50) # 0 to 100
    details = models.TextField(blank=True, default='')
    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"Incident [{self.get_incident_type_display()}] Score: {self.risk_score}"


class SiteEnvironment(models.Model):
    location = models.CharField(max_length=150, default="Central Pilgrim Plaza")
    temperature_c = models.FloatField(default=28.5)
    weather_condition = models.CharField(max_length=50, default="Clear")
    humidity = models.IntegerField(default=60)
    precipitation_risk = models.IntegerField(default=10) # 0 to 100 %
    shuttle_availability_pct = models.IntegerField(default=85)
    parking_occupancy_pct = models.IntegerField(default=62)
    traffic_congestion_level = models.CharField(max_length=30, default="Moderate")
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Environment at {self.location}: {self.temperature_c}°C, {self.weather_condition}"


class VisitorGuidance(models.Model):
    LANGUAGES = (
        ('en', 'English'),
        ('hi', 'Hindi'),
        ('or', 'Odia'),
        ('es', 'Spanish'),
        ('fr', 'French'),
        ('ta', 'Tamil'),
        ('te', 'Telugu'),
        ('bn', 'Bengali'),
    )

    CATEGORIES = (
        ('safety_notice', 'Safety Notice'),
        ('pilgrimage_route', 'Pilgrimage Route Advice'),
        ('eco_trail_rules', 'Eco-Trail Rule'),
        ('emergency_info', 'Emergency Helpline'),
    )

    title = models.CharField(max_length=200)
    language = models.CharField(max_length=10, choices=LANGUAGES, default='en')
    category = models.CharField(max_length=30, choices=CATEGORIES, default='safety_notice')
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.language.upper()}] {self.title}"


class PrivacyLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    frame_hash = models.CharField(max_length=64)
    detections_processed = models.IntegerField(default=0)
    pii_purged = models.BooleanField(default=True)
    anonymous_aggregation_verified = models.BooleanField(default=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Privacy Audit {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - PII Discarded: {self.pii_purged}"


class SimulationScenario(models.Model):
    SCENARIO_TYPES = (
        ('entry_restriction', 'Gate / Entry Restriction'),
        ('sudden_surge', 'Sudden Crowd Increase'),
        ('route_blockage', 'Route Blockage'),
        ('emergency_incident', 'Emergency Incident'),
        ('visitor_diversion', 'Temporary Visitor Diversion'),
    )

    name = models.CharField(max_length=100)
    scenario_type = models.CharField(max_length=50, choices=SCENARIO_TYPES, default='entry_restriction')
    description = models.TextField(blank=True, default="")
    default_intensity = models.CharField(max_length=20, default='medium')

    def __str__(self):
        return f"Scenario: {self.name} ({self.scenario_type})"


class SimulationRun(models.Model):
    scenario_name = models.CharField(max_length=100)
    scenario_type = models.CharField(max_length=50)
    primary_zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='simulation_runs')
    duration_minutes = models.IntegerField(default=15)
    intensity = models.CharField(max_length=20, default='medium')
    
    input_state_json = models.TextField(blank=True, null=True)
    simulated_results_json = models.TextField(blank=True, null=True)
    affected_zones_json = models.TextField(blank=True, null=True)
    ripple_effect_json = models.TextField(blank=True, null=True)
    recommendation = models.TextField(blank=True, default="")
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SimulationRun [{self.scenario_type}] Zone: {self.primary_zone.name} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"

