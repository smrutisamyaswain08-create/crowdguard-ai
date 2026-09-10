from rest_framework import serializers
from .models import Alert, EmergencySOS, EmergencyResponseUnit, DispatchRecord
from detection.serializers import DetectionSerializer
from accounts.serializers import UserSerializer

class AlertSerializer(serializers.ModelSerializer):
    detection_details = DetectionSerializer(source='detection', read_only=True)
    resolved_by_details = UserSerializer(source='resolved_by', read_only=True)
    
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ('id', 'timestamp', 'resolved_at', 'resolved_by')


class EmergencySOSSerializer(serializers.ModelSerializer):
    category_display = serializers.ReadOnlyField(source='get_category_display')
    urgency_display = serializers.ReadOnlyField(source='get_urgency_display')
    status_display = serializers.ReadOnlyField(source='get_status_display')
    zone_name = serializers.ReadOnlyField(source='zone.name')
    verified_by_name = serializers.ReadOnlyField(source='verified_by.username')

    class Meta:
        model = EmergencySOS
        fields = '__all__'


class EmergencyResponseUnitSerializer(serializers.ModelSerializer):
    unit_type_display = serializers.ReadOnlyField(source='get_unit_type_display')
    assigned_zone_name = serializers.ReadOnlyField(source='assigned_zone.name')

    class Meta:
        model = EmergencyResponseUnit
        fields = '__all__'


class DispatchRecordSerializer(serializers.ModelSerializer):
    sos_details = EmergencySOSSerializer(source='sos', read_only=True)
    unit_details = EmergencyResponseUnitSerializer(source='unit', read_only=True)

    class Meta:
        model = DispatchRecord
        fields = '__all__'

