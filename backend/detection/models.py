from django.db import models
from camera.models import Camera

class Detection(models.Model):
    RISK_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )

    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='detections')
    image = models.ImageField(upload_to='detections/frames/')
    heatmap = models.ImageField(upload_to='detections/heatmaps/')
    count = models.IntegerField()
    density = models.FloatField() # average crowd density score
    risk = models.CharField(
        max_length=15,
        choices=RISK_CHOICES,
        default='low'
    )
    email_sent = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Detection on {self.camera.name} at {self.timestamp} - Count: {self.count} (Risk: {self.risk})"


class RiskThreshold(models.Model):
    low_limit = models.IntegerField(default=50)
    medium_limit = models.IntegerField(default=150)
    high_limit = models.IntegerField(default=300)

    def __str__(self):
        return f"Thresholds: Low={self.low_limit}, Med={self.medium_limit}, High={self.high_limit}"
