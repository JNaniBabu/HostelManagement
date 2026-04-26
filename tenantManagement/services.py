from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone

from HostelManagementData.models import Room

from .models import Tenant, VerificationToken
from .utils import send_whatsapp_message


def build_verification_error(message, status_code=400, extra=None):
    payload = {
        "message": message,
        "status_code": status_code,
        "extra": extra or {},
    }
    return payload


def raise_verification_error(message, status_code=400, extra=None):
    raise ValueError(build_verification_error(message, status_code, extra))


def build_verification_link(token):
    frontend_url = str(
        getattr(settings, "FRONTEND_URL", "http://localhost:5173") or ""
    ).rstrip("/")
    verification_path = str(
        getattr(settings, "TENANT_VERIFICATION_FRONTEND_PATH", "/tenant/verify")
        or "/tenant/verify"
    ).strip()

    if not verification_path.startswith("/"):
        verification_path = f"/{verification_path}"

    return f"{frontend_url}{verification_path}?token={token}"


def send_verification_link_mock(tenant, verification_token):
    verification_link = build_verification_link(verification_token.token)
    return {
        "sent": True,
        "channel": "mock",
        "verification_link": verification_link,
        "message": f"Mock verification link for {tenant.name}: {verification_link}",
    }


def send_verification_link_whatsapp(tenant, verification_token):
    verification_link = build_verification_link(verification_token.token)
    result = send_whatsapp_message(
        tenant.phone_number,
        (
            f"Hi {tenant.name}, verify your hostel account using this link: "
            f"{verification_link}"
        ),
    )
    result["channel"] = "whatsapp"
    result["verification_link"] = verification_link
    return result


def get_notification_sender():
    account_sid = str(getattr(settings, "TWILIO_ACCOUNT_SID", "") or "").strip()
    auth_token = str(getattr(settings, "TWILIO_AUTH_TOKEN", "") or "").strip()
    whatsapp_number = str(
        getattr(settings, "TWILIO_WHATSAPP_NUMBER", "") or ""
    ).strip()

    if account_sid and auth_token and whatsapp_number:
        return send_verification_link_whatsapp
    return send_verification_link_mock


def send_verification_link(tenant, verification_token, notification_sender=None):
    sender = notification_sender or get_notification_sender()
    return sender(tenant, verification_token)


def owner_onboarding_missing(user):
    missing = []

    if not user.username or not user.Number or not user.Address:
        missing.append("personal details")

    hostel = getattr(user, "hostel", None)
    if not hostel or not all(
        [hostel.hostel_name, hostel.city, hostel.state, hostel.pincode]
    ):
        missing.append("hostel details")

    upi = getattr(user, "upi_detaills", None)
    if not upi or not upi.account_holder or not upi.upi_id or not upi.mobile:
        missing.append("UPI details")

    return missing


def room_occupancy(hostel, room_number, exclude_tenant_id=None):
    queryset = Tenant.objects.filter(
        hostel=hostel,
        room_number__iexact=str(room_number).strip().lower(),
        status__in=["pending", "verified"],
    )
    if exclude_tenant_id:
        queryset = queryset.exclude(id=exclude_tenant_id)
    return queryset.count()


def sync_room_occupied(room):
    count = Tenant.objects.filter(
        hostel=room.user.hostel,
        room_number__iexact=str(room.room_number).strip().lower(),
        status__in=["pending", "verified"],
    ).count()
    room.occupied = count
    room.save(update_fields=["occupied"])


def register_tenant(owner, validated_data, notification_sender=None):
    hostel = getattr(owner, "hostel", None)
    if not hostel:
        raise_verification_error("Hostel not found", status_code=400)

    missing = owner_onboarding_missing(owner)
    if missing:
        raise_verification_error(
            "Complete onboarding before adding tenants",
            status_code=400,
            extra={"missing": missing},
        )

    name = validated_data["name"]
    phone = validated_data["phone_number"]
    room_number = validated_data["room_number"]
    room_type = validated_data["room_type"]

    room = Room.objects.filter(
        user=owner,
        room_number__iexact=room_number.strip().lower(),
    ).first()
    if not room:
        raise_verification_error("Room not found for this hostel", status_code=404)

    if room.room_type != room_type:
        raise_verification_error(
            f"Room type mismatch. Room is {room.room_type}.",
            status_code=400,
        )

    current_occupancy = room_occupancy(hostel, room.room_number)
    if current_occupancy >= room.total_capacity:
        raise_verification_error(
            "Room is full",
            status_code=400,
            extra={"available_beds": 0},
        )

    tenant = Tenant.objects.filter(phone_number=phone).first()
    created = tenant is None

    with transaction.atomic():
        if tenant:
            previous_room_obj = None
            previous_hostel_user = getattr(getattr(tenant, "hostel", None), "user", None)
            if previous_hostel_user:
                previous_room_obj = Room.objects.filter(
                    user=previous_hostel_user,
                    room_number__iexact=str(tenant.room_number).strip().lower(),
                ).first()

            occupancy_excluding_self = room_occupancy(
                hostel,
                room.room_number,
                exclude_tenant_id=tenant.id,
            )
            if occupancy_excluding_self >= room.total_capacity:
                raise_verification_error(
                    "Room is full",
                    status_code=400,
                    extra={"available_beds": 0},
                )

            tenant.name = name
            tenant.hostel = hostel
            tenant.room_number = room_number
            tenant.room_type = room_type
            tenant.status = "pending"
            tenant.verified_at = None
            tenant.password = make_password("1234567")
            tenant.password_updated = False
            tenant.save(
                update_fields=[
                    "name",
                    "hostel",
                    "room_number",
                    "room_type",
                    "status",
                    "verified_at",
                    "password",
                    "password_updated",
                ]
            )

            sync_room_occupied(room)
            if previous_room_obj and previous_room_obj.id != room.id:
                sync_room_occupied(previous_room_obj)
        else:
            tenant = Tenant.objects.create(
                name=name,
                phone_number=phone,
                hostel=hostel,
                room_number=room_number,
                room_type=room_type,
                status="pending",
                password=make_password("1234567"),
                password_updated=False,
            )
            sync_room_occupied(room)

        verification_token = VerificationToken.create_token(tenant)

    notification_result = send_verification_link(
        tenant,
        verification_token,
        notification_sender=notification_sender,
    )

    return {
        "tenant": tenant,
        "verification_token": verification_token,
        "notification": notification_result,
        "created": created,
    }


def verify_token(token):
    now = timezone.now()

    with transaction.atomic():
        verification_token = (
            VerificationToken.objects.select_for_update()
            .select_related("tenant")
            .filter(token=token)
            .first()
        )

        if not verification_token:
            raise_verification_error("Invalid verification token", status_code=404)

        if verification_token.used_at is not None:
            raise_verification_error(
                "This verification token has already been used.",
                status_code=400,
            )

        if verification_token.revoked_at is not None:
            raise_verification_error(
                "This verification token has been replaced by a newer one.",
                status_code=400,
            )

        if verification_token.expires_at <= now:
            raise_verification_error(
                "This verification token has expired.",
                status_code=400,
            )

        tenant = verification_token.tenant
        tenant.status = "verified"
        tenant.verified_at = now
        tenant.save(update_fields=["status", "verified_at"])

        verification_token.used_at = now
        verification_token.save(update_fields=["used_at"])

    return tenant


def get_active_verification_token(token, lock_for_update=False):
    queryset = VerificationToken.objects.select_related("tenant", "tenant__hostel")
    if lock_for_update:
        queryset = queryset.select_for_update()

    verification_token = queryset.filter(token=token).first()

    if not verification_token:
        raise_verification_error("Invalid verification token", status_code=404)

    if verification_token.used_at is not None:
        raise_verification_error(
            "This verification token has already been used.",
            status_code=400,
        )

    if verification_token.revoked_at is not None:
        raise_verification_error(
            "This verification token has been replaced by a newer one.",
            status_code=400,
        )

    if verification_token.expires_at <= timezone.now():
        raise_verification_error(
            "This verification token has expired.",
            status_code=400,
        )

    return verification_token


def get_verification_details(token):
    verification_token = get_active_verification_token(token)
    tenant = verification_token.tenant

    return {
        "tenant_id": tenant.id,
        "name": tenant.name,
        "phone_number": tenant.phone_number,
        "room_number": tenant.room_number,
        "room_type": tenant.room_type,
        "hostel_name": tenant.hostel.hostel_name if tenant.hostel else "",
        "status": tenant.status,
        "aadhaar_number": tenant.aadhaar_number,
        "expires_at": verification_token.expires_at,
    }


def get_tenant_and_room_for_token(token):
    verification_token = get_active_verification_token(token)
    tenant = verification_token.tenant

    hostel = getattr(tenant, "hostel", None)
    hostel_user = getattr(hostel, "user", None) if hostel else None
    if not hostel_user:
        raise_verification_error("Invalid tenant link", status_code=404)

    room = Room.objects.filter(
        user=hostel_user,
        room_number__iexact=str(tenant.room_number).strip(),
    ).first()
    if not room:
        raise_verification_error("Room not found for tenant", status_code=404)

    return tenant, room


def submit_verification_by_token(
    token,
    *,
    name,
    aadhaar_number,
    aadhaar_image,
    profile_image,
):
    now = timezone.now()

    with transaction.atomic():
        verification_token = get_active_verification_token(
            token,
            lock_for_update=True,
        )
        tenant = verification_token.tenant

        tenant.name = name
        tenant.aadhaar_number = aadhaar_number
        tenant.aadhaar_image = aadhaar_image
        tenant.profile_image = profile_image
        tenant.status = "verified"
        tenant.verified_at = now
        tenant.save(
            update_fields=[
                "name",
                "aadhaar_number",
                "aadhaar_image",
                "profile_image",
                "status",
                "verified_at",
            ]
        )

        verification_token.used_at = now
        verification_token.save(update_fields=["used_at"])

        VerificationToken.objects.filter(
            tenant=tenant,
            used_at__isnull=True,
            revoked_at__isnull=True,
        ).exclude(id=verification_token.id).update(revoked_at=now)

    return tenant


def resend_verification(tenant, notification_sender=None):
    if tenant.status == "verified":
        raise_verification_error("Tenant is already verified.", status_code=400)

    verification_token = VerificationToken.create_token(tenant)
    notification_result = send_verification_link(
        tenant,
        verification_token,
        notification_sender=notification_sender,
    )

    return {
        "tenant": tenant,
        "verification_token": verification_token,
        "notification": notification_result,
    }
