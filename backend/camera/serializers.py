from rest_framework import serializers
from .models import Camera

class CameraSerializer(serializers.ModelSerializer):
    zone_name = serializers.ReadOnlyField(source='zone.name')

    class Meta:
        model = Camera
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

