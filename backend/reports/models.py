from django.db import models

class Report(models.Model):
    REPORT_TYPES = (
        ('daily', 'Daily Report'),
        ('weekly', 'Weekly Report'),
        ('monthly', 'Monthly Report'),
    )

    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    generated_on = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='generated_reports/', blank=True, null=True)

    class Meta:
        ordering = ['-generated_on']

    def __str__(self):
        return f"{self.get_report_type_display()} generated on {self.generated_on}"
