from django.conf import settings

try:
    from twilio.rest import Client
except ImportError:  
    Client = None


FAILED_MESSAGE_STATUSES = {"failed", "undelivered", "canceled"}


def normalize_whatsapp_number(number):
    value = str(number or "").strip()

    if value.startswith("whatsapp:"):
        return value

    if not value.startswith("+"):
        value = f"+{value}"

    return f"whatsapp:{value}"


def _is_whatsapp_send_success(status, error_code):
    if error_code:
        return False

    normalized_status = str(status or "").strip().lower()
    if normalized_status in FAILED_MESSAGE_STATUSES:
        return False

    return True


def send_whatsapp_message(to_number, message):

    account_sid = str(getattr(settings, "TWILIO_ACCOUNT_SID", "") or "").strip()
    auth_token = str(getattr(settings, "TWILIO_AUTH_TOKEN", "") or "").strip()
    whatsapp_from_raw = str(getattr(settings, "TWILIO_WHATSAPP_NUMBER", "") or "").strip()

    if not account_sid or not auth_token or not whatsapp_from_raw:
        return {
            "sent": False,
            "sid": None,
            "status": None,
            "error_code": None,
            "error_message": "WhatsApp is not configured on server",
            "to": normalize_whatsapp_number(to_number),
            "from": whatsapp_from_raw or "",
            "error": "Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER",
        }

    if Client is None:
        return {
            "sent": False,
            "sid": None,
            "status": None,
            "error_code": None,
            "error_message": "Twilio SDK is not installed",
            "to": normalize_whatsapp_number(to_number),
            "from": whatsapp_from_raw or "",
            "error": "Missing twilio package",
        }

    whatsapp_from = whatsapp_from_raw
    if not str(whatsapp_from).startswith("whatsapp:"):
        if not str(whatsapp_from).startswith("+"):
            whatsapp_from = f"+{whatsapp_from}"
        whatsapp_from = f"whatsapp:{whatsapp_from}"

    try:

        client = Client(account_sid, auth_token)

        msg = client.messages.create(
            body=message,
            from_=whatsapp_from,
            to=normalize_whatsapp_number(to_number),
        )

        status = getattr(msg, "status", None)
        error_code = getattr(msg, "error_code", None)
        error_message = getattr(msg, "error_message", None)
        to_value = getattr(msg, "to", normalize_whatsapp_number(to_number))
        from_value = getattr(msg, "from_", settings.TWILIO_WHATSAPP_NUMBER)

        
        try:
            fetched = client.messages(msg.sid).fetch()
            status = getattr(fetched, "status", status)
            error_code = getattr(fetched, "error_code", error_code)
            error_message = getattr(fetched, "error_message", error_message)
            to_value = getattr(fetched, "to", to_value)
            from_value = getattr(fetched, "from_", from_value)
        except Exception:
            pass

        sent = _is_whatsapp_send_success(status, error_code)

        provider_status = str(status or "").lower() if status else None
        provider_error = (
            error_message
            or (f"provider status={provider_status}" if provider_status else None)
            or (f"provider error_code={error_code}" if error_code else None)
        )

        return {
            "sent": sent,
            "sid": msg.sid,
            "status": status,
            "error_code": error_code,
            "error_message": error_message,
            "provider_status": provider_status,
            "to": to_value,
            "from": from_value,
            "error": None if sent else (provider_error or "Message not accepted by provider"),
        }

    except Exception as exc:
        return {
            "sent": False,
            "sid": None,
            "status": None,
            "error_code": None,
            "error_message": None,
            "provider_status": None,
            "to": normalize_whatsapp_number(to_number),
            "from": whatsapp_from if 'whatsapp_from' in locals() else whatsapp_from_raw,
            "error": str(exc),
        }
