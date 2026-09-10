from rest_framework import serializers
from .models import Detection
from camera.serializers import CameraSerializer

class DetectionSerializer(serializers.ModelSerializer):
    camera_details = CameraSerializer(source='camera', read_only=True)
    
    class Meta:
        model = Detection
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')
  