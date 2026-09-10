import threading
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

def send_alert_email_task(subject, message, recipient_list):
    """Worker function that runs inside a background thread to send SMTP/console email."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=recipient_list,
            fail_silently=False
        )
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send crowd safety notification: {e}")

def trigger_risk_alert_email(camera_name, location, previous_risk, new_risk, count):
    """
    Retrieves all security officers and admin email addresses,
    and dispatches a thread-safe email alert.
    """
    # 1. Fetch recipient email addresses (Admins and Security Officers)
    recipients = list(User.objects.filter(role__in=['admin', 'security_officer']).values_list('email', flat=True))
    
    # Exclude users without email addresses
    recipients = [email for email in recipients if email]
    
    if not recipients:
        print("[EMAIL WARNING] No registered security officers or administrators have email accounts assigned.")
        return
        
    # 2. Compile message body
    subject = f"[WARNING] Crowd Risk Threshold Crossed: {new_risk.upper()} at {camera_name}"
    
    message = (
        f"CROWDGUARD AI - INTELLECTUAL MONITORING SYSTEM WARNING\n"
        f"====================================================\n\n"
        f"A safety transition event occurred on Camera: {camera_name}\n"
        f"Deployment Location: {location}\n\n"
        f"Risk Level Transitioned: {previous_risk.upper()} ===> {new_risk.upper()}\n"
        f"Monitored Crowd Count: {count} people\n"
        f"Timestamp: {timezone_now_str()} UTC\n\n"
        f"Action Required:\n"
        f"- Please access the Operational Dashboard at http://localhost:5173\n"
        f"- Mobilize personnel to check on {location} if necessary.\n"
        f"- Mark this alert as resolved once the zone is confirmed secure.\n\n"
        f"System Log ID: auto-alert-{new_risk}-{count}\n"
    )
    
    # 3. Dispatch background thread
    thread = threading.Thread(
        target=send_alert_email_task,
        args=(subject, message, recipients)
    )
    thread.daemon = True # ensure thread doesn't hang main process on exit
    thread.start()
    print(f"[THREAD TRIGGER] Dispatched async email notification for risk: {new_risk} to {len(recipients)} users.")

def timezone_now_str():
    from django.utils import timezone
    return timezone.now().strftime("%Y-%m-%d %H:%M:%S")
