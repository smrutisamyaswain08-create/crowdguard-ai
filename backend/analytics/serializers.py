from rest_framework import serializers
from .models import Zone, CrowdForecast, UnusualIncident, SiteEnvironment, VisitorGuidance, PrivacyLog, SimulationScenario, SimulationRun

class ZoneSerializer(serializers.ModelSerializer):
    occupancy_percentage = serializers.ReadOnlyField()
    connected_zone_ids = serializers.PrimaryKeyRelatedField(source='connected_zones', many=True, read_only=True)
    connected_zone_names = serializers.SerializerMethodField()

    class Meta:
        model = Zone
        fields = [
            'id', 'name', 'code', 'location_name', 'description', 'site_type', 'capacity_limit',
            'current_occupancy', 'risk_level', 'warning_threshold',
            'connected_zones', 'connected_zone_ids', 'connected_zone_names',
            'entry_points', 'exit_points', 'emergency_route_available', 'is_active',
            'coordinates_json', 'center_lat', 'center_lng',
            'occupancy_percentage', 'created_at'
        ]
        extra_kwargs = {
            'connected_zones': {'required': False}
        }

    def get_connected_zone_names(self, obj):
        return [z.name for z in obj.connected_zones.all()]

class CrowdForecastSerializer(serializers.ModelSerializer):
    zone_name = serializers.ReadOnlyField(source='zone.name')
    camera_name = serializers.ReadOnlyField(source='camera.name')

    class Meta:
        model = CrowdForecast
        fields = [
            'id', 'zone', 'zone_name', 'camera', 'camera_name',
            'forecast_time', 'predicted_count', 'predicted_risk',
            'confidence_score', 'created_at'
        ]

class UnusualIncidentSerializer(serializers.ModelSerializer):
    zone_name = serializers.ReadOnlyField(source='zone.name')
    incident_type_display = serializers.ReadOnlyField(source='get_incident_type_display')

    class Meta:
        model = UnusualIncident
        fields = [
            'id', 'detection', 'zone', 'zone_name', 'incident_type',
            'incident_type_display', 'risk_score', 'details', 'detected_at'
        ]

class SiteEnvironmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteEnvironment
        fields = '__all__'

class VisitorGuidanceSerializer(serializers.ModelSerializer):
    language_display = serializers.ReadOnlyField(source='get_language_display')
    category_display = serializers.ReadOnlyField(source='get_category_display')

    class Meta:
        model = VisitorGuidance
        fields = [
            'id', 'title', 'language', 'language_display',
            'category', 'category_display', 'content', 'is_active', 'created_at'
        ]

class PrivacyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyLog
        fields = '__all__'

class SimulationScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationScenario
        fields = '__all__'

class SimulationRunSerializer(serializers.ModelSerializer):
    primary_zone_name = serializers.ReadOnlyField(source='primary_zone.name')
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = SimulationRun
        fields = '__all__'

