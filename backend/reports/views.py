import csv
import io
import random
from datetime import timedelta
from django.conf import settings
from django.core.files.base import ContentFile
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Avg, Max
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

# ReportLab imports for executive PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from detection.models import Detection
from alerts.models import Alert
from .models import Report
from .serializers import ReportSerializer

class ReportListView(generics.ListAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = (permissions.IsAuthenticated,)


def get_duration_datetime(report_type):
    now = timezone.now()
    if report_type == 'daily':
        return now - timedelta(days=1), "Daily Report (Past 24 Hours)"
    elif report_type == 'weekly':
        return now - timedelta(days=7), "Weekly Report (Past 7 Days)"
    elif report_type == 'monthly':
        return now - timedelta(days=30), "Monthly Report (Past 30 Days)"
    return now - timedelta(days=1), "Crowd Management Report"


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_report_api(request):
    """
    POST API to generate a daily, weekly, or monthly report.
    Body parameters:
    - report_type: 'daily', 'weekly', 'monthly'
    - format: 'pdf', 'csv'
    """
    report_type = request.data.get('report_type', 'daily')
    file_format = request.data.get('format', 'pdf')
    
    if report_type not in ['daily', 'weekly', 'monthly']:
        return Response({"error": "Invalid report_type. Choose 'daily', 'weekly', or 'monthly'."}, status=status.HTTP_400_BAD_REQUEST)
    if file_format not in ['pdf', 'csv']:
        return Response({"error": "Invalid format. Choose 'pdf' or 'csv'."}, status=status.HTTP_400_BAD_REQUEST)
        
    start_date, title = get_duration_datetime(report_type)
    
    # Query data
    detections = Detection.objects.filter(timestamp__gte=start_date).order_by('timestamp')
    alerts = Alert.objects.filter(timestamp__gte=start_date).order_by('-timestamp')
    
    # Aggregations using strictly real database values
    total_detections = detections.count()
    avg_count = int(detections.aggregate(Avg('count'))['count__avg'] or 0)
    max_count = int(detections.aggregate(Max('count'))['count__max'] or 0)
    avg_density = round(float(detections.aggregate(Avg('density'))['density__avg'] or 0.0), 4)
    
    total_alerts = alerts.count()
    resolved_alerts = alerts.filter(resolved=True).count()
    unresolved_alerts = total_alerts - resolved_alerts
    
    # Format CSV
    if file_format == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="crowd_report_{report_type}_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'Camera Name', 'Location', 'Crowd Count', 'Crowd Density', 'Risk Level', 'Alerts Status'])
        
        for det in detections:
            det_alerts = ", ".join([a.get_alert_type_display() for a in det.alerts.all()]) or "None"
            writer.writerow([
                det.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                det.camera.name,
                det.camera.location,
                det.count,
                det.density,
                det.risk.upper(),
                det_alerts
            ])
                
        # Save Report metadata in the database
        report_record = Report.objects.create(report_type=report_type)
        # For CSV, we stream directly, so we just save DB record without a persistent file field
        # (or write CSV to file). For simplicity, let's write to file too.
        csv_buffer = io.StringIO()
        csv_writer = csv.writer(csv_buffer)
        csv_writer.writerow(['Timestamp', 'Camera Name', 'Location', 'Crowd Count', 'Crowd Density', 'Risk Level', 'Alerts Status'])
        # repeat same data
        for det in detections:
            det_alerts = ", ".join([a.get_alert_type_display() for a in det.alerts.all()]) or "None"
            csv_writer.writerow([
                det.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                det.camera.name,
                det.camera.location,
                det.count,
                det.density,
                det.risk.upper(),
                det_alerts
            ])
        report_record.file.save(f"report_{report_record.id}.csv", ContentFile(csv_buffer.getvalue().encode('utf-8')))
        report_record.save()
        
        return response
        
    # Format PDF using ReportLab
    elif file_format == 'pdf':
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        
        styles = getSampleStyleSheet()
        
        # Define customized Paragraph styles for executive layout
        title_style = ParagraphStyle(
            name='TitleStyle',
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor('#0F172A'), # Slate 900
            spaceAfter=15
        )
        
        subtitle_style = ParagraphStyle(
            name='SubTitleStyle',
            fontName='Helvetica',
            fontSize=11,
            textColor=colors.HexColor('#64748B'), # Slate 500
            spaceAfter=25
        )
        
        h2_style = ParagraphStyle(
            name='H2Style',
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.HexColor('#1E293B'), # Slate 800
            spaceBefore=15,
            spaceAfter=10
        )
        
        body_style = ParagraphStyle(
            name='BodyStyle',
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor('#334155'), # Slate 700
            leading=14
        )
        
        cell_style = ParagraphStyle(
            name='CellStyle',
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#334155'),
            leading=11
        )
        
        cell_header_style = ParagraphStyle(
            name='CellHeaderStyle',
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.white,
            leading=11
        )

        elements = []
        
        # Header Banner
        elements.append(Paragraph(title, title_style))
        elements.append(Paragraph(f"Generated on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} UTC | System Administrator", subtitle_style))
        elements.append(Spacer(1, 10))
        
        # Executive Summary Section
        elements.append(Paragraph("1. Executive Summary", h2_style))
        summary_text = (
            f"This crowd analytics report compiles monitoring statistics for active cameras. "
            f"Over this reporting cycle, a total of {total_detections} periodic crowd samples were processed. "
            f"The average crowd count recorded across the facility was {avg_count} people, with a absolute maximum "
            f"peak of {max_count} people. The average density score was calculated at {avg_density}. "
            f"During the period, {total_alerts} security alerts were generated. A total of {resolved_alerts} "
            f"alerts have been resolved by security staff, with {unresolved_alerts} active alerts remaining in "
            f"unresolved status."
        )
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 15))
        
        # Key Metrics Table
        elements.append(Paragraph("Key System Metrics Table", ParagraphStyle('TableTitle', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#475569'), spaceAfter=5)))
        metrics_data = [
            [
                Paragraph("Metric Description", cell_header_style), 
                Paragraph("Value", cell_header_style)
            ],
            [Paragraph("Average Crowd Count", cell_style), Paragraph(str(avg_count), cell_style)],
            [Paragraph("Peak Crowd Count", cell_style), Paragraph(str(max_count), cell_style)],
            [Paragraph("Average Density Metric", cell_style), Paragraph(str(avg_density), cell_style)],
            [Paragraph("Total Crowd Alerts Triggered", cell_style), Paragraph(str(total_alerts), cell_style)],
            [Paragraph("Total Alerts Resolved", cell_style), Paragraph(str(resolved_alerts), cell_style)],
            [Paragraph("Unresolved/Active Alerts", cell_style), Paragraph(str(unresolved_alerts), cell_style)],
        ]
        
        t_metrics = Table(metrics_data, colWidths=[250, 150])
        t_metrics.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')), # Dark Slate
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
            ('TOPPADDING', (0,1), (-1,-1), 5),
        ]))
        elements.append(t_metrics)
        elements.append(Spacer(1, 15))
        
        # Detailed Crowd Detection Logs
        elements.append(Paragraph("2. Detailed Crowd Detection Logs", h2_style))
        
        detection_table_data = [
            [
                Paragraph("Timestamp", cell_header_style),
                Paragraph("Camera Feed", cell_header_style),
                Paragraph("Location", cell_header_style),
                Paragraph("Count", cell_header_style),
                Paragraph("Density", cell_header_style),
                Paragraph("Risk Level", cell_header_style)
            ]
        ]
        
        if detections.exists():
            for det in detections[:30]:
                detection_table_data.append([
                    Paragraph(det.timestamp.strftime('%Y-%m-%d %H:%M'), cell_style),
                    Paragraph(det.camera.name, cell_style),
                    Paragraph(det.camera.location, cell_style),
                    Paragraph(str(det.count), cell_style),
                    Paragraph(f"{det.density:.4f}", cell_style),
                    Paragraph(det.risk.upper(), ParagraphStyle('RiskStatus', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#DC2626') if det.risk in ['high', 'critical'] else colors.HexColor('#1E293B')))
                ])
        else:
            detection_table_data.append([
                Paragraph("No crowd detection logs found for this period.", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style)
            ])
            
        t_detections = Table(detection_table_data, colWidths=[110, 110, 110, 50, 70, 60])
        t_detections.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
            ('TOPPADDING', (0,1), (-1,-1), 5),
        ]))
        elements.append(t_detections)
        elements.append(Spacer(1, 20))
        
        # Alerts and Risk Summary
        elements.append(Paragraph("3. Recent Alerts & Safety Logs", h2_style))
        
        # Create alerts log table
        alerts_data = [
            [
                Paragraph("Timestamp", cell_header_style),
                Paragraph("Camera Feed", cell_header_style),
                Paragraph("Alert Event Type", cell_header_style),
                Paragraph("Status", cell_header_style)
            ]
        ]
        
        if alerts.exists():
            # Add up to 10 recent alerts
            for a in alerts[:10]:
                alerts_data.append([
                    Paragraph(a.timestamp.strftime('%Y-%m-%d %H:%M'), cell_style),
                    Paragraph(a.detection.camera.name, cell_style),
                    Paragraph(a.get_alert_type_display(), cell_style),
                    Paragraph("RESOLVED" if a.resolved else "ACTIVE / CRITICAL", ParagraphStyle('AlertStatus', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#16A34A') if a.resolved else colors.HexColor('#DC2626')))
                ])
        else:
            alerts_data.append([
                Paragraph("No alert logs found for this period.", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style)
            ])
                
        t_alerts = Table(alerts_data, colWidths=[110, 150, 150, 100])
        t_alerts.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')), # Slate 800
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
            ('TOPPADDING', (0,1), (-1,-1), 5),
        ]))
        elements.append(t_alerts)
        elements.append(Spacer(1, 30))
        
        # Signatures
        elements.append(Paragraph("Report verified by: ________________________", ParagraphStyle('Signature', fontName='Helvetica-Oblique', fontSize=10, textColor=colors.HexColor('#475569'))))
        
        # Build Document
        doc.build(elements)
        
        pdf_bytes = pdf_buffer.getvalue()
        pdf_buffer.close()
        
        # Save Report metadata in DB
        report_record = Report.objects.create(report_type=report_type)
        report_record.file.save(f"report_{report_record.id}.pdf", ContentFile(pdf_bytes))
        report_record.save()
        
        # Serve PDF directly to user as download
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="crowd_report_{report_type}_{timezone.now().strftime("%Y%m%d")}.pdf"'
        return response


from django.core.mail import EmailMessage
from django.shortcuts import get_object_or_404
import os

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def share_report_api(request, report_id):
    """
    POST API to email a report to a specified email address.
    Only accessible by users with the 'admin' role.
    Body parameters:
    - email: receiver's email address
    """
    # Enforce admin permission check
    if getattr(request.user, 'role', '') != 'admin':
        return Response({"error": "Unauthorized. Only admins can share reports."}, status=status.HTTP_403_FORBIDDEN)
        
    email_recipient = request.data.get('email')
    if not email_recipient:
        return Response({"error": "Email recipient address is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    report = get_object_or_404(Report, id=report_id)
    if not report.file:
        return Response({"error": "This report does not have a saved file to attach."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Create EmailMessage
        subject = f"Crowd Management Report - {report.get_report_type_display()} Summary"
        body = (
            f"Hello,\n\n"
            f"Please find attached the crowd management report (Type: {report.get_report_type_display()}) "
            f"generated on {report.generated_on.strftime('%Y-%m-%d %H:%M:%S')} UTC.\n\n"
            f"Best regards,\n"
            f"Crowd Guard Security System"
        )
        
        email_msg = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email_recipient]
        )
        
        # Attach the report file
        report_file = report.file
        report_file.open('rb')
        filename = os.path.basename(report_file.name)
        mime_type = 'application/pdf' if filename.endswith('.pdf') else 'text/csv'
        email_msg.attach(filename, report_file.read(), mime_type)
        report_file.close()
        
        email_msg.send()
        
        return Response({"message": f"Report successfully shared to {email_recipient}."})
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
