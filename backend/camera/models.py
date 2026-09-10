from django.db import models

class Camera(models.Model):
    STATUS_CHOICES = (
        ('online', 'Online'),
        ('offline', 'Offline'),
    )
    
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    zone = models.ForeignKey('analytics.Zone', on_delete=models.SET_NULL, null=True, blank=True, related_name='cameras')
    latitude = models.FloatField(default=20.5937, null=True, blank=True)
    longitude = models.FloatField(default=78.9629, null=True, blank=True)
    # For demo purposes, this can store an RTSP url or an uploaded sample video file path.
    stream_url = models.CharField(max_length=500, blank=True, null=True)
    video_file = models.FileField(upload_to='camera_videos/', blank=True, null=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='online'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.location} ({self.status})"

