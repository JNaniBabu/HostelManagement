import requests
from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from HostelManagementData.models import Room
from .models import Fee, Tenant, TenantComplaint
from .serializer import (
    ResendVerificationSerializer,
    TenantRegistrationSerializer,
    VerificationTokenSerializer,
)
from .services import (
    get_verification_details,
    get_tenant_and_room_for_token,
    register_tenant,
    resend_verification,
    submit_verification_by_token,
    verify_token,
)


HOSTEL_RULES = [
    {"label": "In Time", "value": "9:30 PM"},
    {"label": "Quiet Hours", "value": "10:00 PM - 6:00 AM"},
    {"label": "Visitors", "value": "Lobby only"},
]

WEEKLY_MENU = [
    {
        "day": "Monday",
        "meals": {
            "Breakfast": "Poha + Tea",
            "Lunch": "Rice, Dal Tadka, Mixed Veg",
            "Snacks": "Samosa + Chutney",
            "Dinner": "Roti, Paneer Butter Masala",
        },
    },
    {
        "day": "Tuesday",
        "meals": {
            "Breakfast": "Idli, Coconut Chutney",
            "Lunch": "Jeera Rice, Rajma, Salad",
            "Snacks": "Veg Puff",
            "Dinner": "Roti, Aloo Gobi, Curd",
        },
    },
    {
        "day": "Wednesday",
        "meals": {
            "Breakfast": "Upma, Coffee",
            "Lunch": "Veg Pulao, Raita",
            "Snacks": "Bhel",
            "Dinner": "Roti, Dal Fry, Bhindi",
        },
    },
    {
        "day": "Thursday",
        "meals": {
            "Breakfast": "Aloo Paratha, Curd",
            "Lunch": "Curd Rice, Fryums",
            "Snacks": "Sweet Corn",
            "Dinner": "Roti, Chole, Salad",
        },
    },
    {
        "day": "Friday",
        "meals": {
            "Breakfast": "Masala Dosa",
            "Lunch": "Sambar Rice, Papad",
            "Snacks": "Banana Chips",
            "Dinner": "Roti, Chicken/Paneer Curry",
        },
    },
    {
        "day": "Saturday",
        "meals": {
            "Breakfast": "Poori, Chana",
            "Lunch": "Veg Biryani, Mirchi Salan",
            "Snacks": "Cut Fruits",
            "Dinner": "Roti, Egg/Paneer Bhurji",
        },
    },
    {
        "day": "Sunday",
        "meals": {
            "Breakfast": "Pancakes, Honey",
            "Lunch": "Paneer/Chicken Fried Rice",
            "Snacks": "Milkshake",
            "Dinner": "Roti, Mixed Veg Curry",
        },
    },
]


def normalize_phone_number(phone):
    digits = "".join(ch for ch in str(phone).strip() if ch.isdigit())

    if len(digits) == 10:
        return f"91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return digits
    return None


def set_tenant_auth_cookies(response, tenant):
    refresh = RefreshToken()
    refresh["user_type"] = "tenant"
    refresh["tenant_id"] = tenant.id
    refresh["phone_number"] = tenant.phone_number
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    response.set_cookie(
        key="tenant_access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60 * 60,
        path="/",
    )
    response.set_cookie(
        key="tenant_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def get_authenticated_tenant_for_phone(request, phone):
    user = request.user
    if not isinstance(user, Tenant):
        return None, Response({"error": "Please Login"}, status=401)

    phone_norm = normalize_phone_number(phone)
    if not phone_norm:
        return None, Response({"error": "Invalid phone number"}, status=400)

    if user.phone_number != phone_norm:
        return None, Response({"error": "Unauthorized tenant access"}, status=403)

    return user, None


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
    qs = Tenant.objects.filter(
        hostel=hostel,
        room_number__iexact=str(room_number).strip().lower(),
        status__in=["pending", "verified"],
    )
    if exclude_tenant_id:
        qs = qs.exclude(id=exclude_tenant_id)
    return qs.count()


def sync_room_occupied(room):
    count = Tenant.objects.filter(
        hostel=room.user.hostel,
        room_number__iexact=str(room.room_number).strip().lower(),
        status__in=["pending", "verified"],
    ).count()
    room.occupied = count
    room.save(update_fields=["occupied"])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_tenant(request):
    serializer = TenantRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = register_tenant(
            owner=request.user,
            validated_data=serializer.validated_data,
        )
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    tenant = result["tenant"]
    verification_token = result["verification_token"]
    notification = result["notification"]

    payload = {
        "message": (
            "Tenant registered successfully"
            if result["created"]
            else "Tenant updated and verification token regenerated"
        ),
        "tenant_id": tenant.id,
        "tenant_status": tenant.status,
        "default_password": "1234567",
        "verification_token": str(verification_token.token),
        "verification_link": notification.get("verification_link"),
        "expires_at": verification_token.expires_at,
        "notification_channel": notification.get("channel"),
        "notification_sent": notification.get("sent", False),
    }

    if notification.get("error"):
        payload["notification_error"] = notification["error"]

    return Response(payload, status=201 if result["created"] else 200)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def verify_tenant_token(request, token=None):
    if request.method == "GET":
        serializer = VerificationTokenSerializer(data={"token": token})
    else:
        serializer = VerificationTokenSerializer(data=request.data)

    serializer.is_valid(raise_exception=True)

    try:
        tenant = verify_token(serializer.validated_data["token"])
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    return Response(
        {
            "message": "Tenant verified successfully",
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "tenant_status": tenant.status,
            "verified_at": tenant.verified_at,
        },
        status=200,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def tenant_verification_token_details(request):
    serializer = VerificationTokenSerializer(data={"token": request.query_params.get("token")})
    serializer.is_valid(raise_exception=True)

    try:
        payload = get_verification_details(serializer.validated_data["token"])
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    return Response(payload, status=200)


@api_view(["GET"])
@permission_classes([AllowAny])
def tenant_verification_rent_details(request):
    serializer = VerificationTokenSerializer(data={"token": request.query_params.get("token")})
    serializer.is_valid(raise_exception=True)

    try:
        tenant, room = get_tenant_and_room_for_token(serializer.validated_data["token"])
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    fee = get_or_create_fee(tenant, room.rent)
    hostel = tenant.hostel
    hostel_user = hostel.user if hostel and hasattr(hostel, "user") else None

    return Response({
        "due_amount": float(fee.amount),
        "due_date": fee.due_date,
        "status": fee.status,
        "room_number": tenant.room_number,
        "room_type": tenant.room_type,
        "hostel_name": hostel.hostel_name if hostel else "",
        "receiver_name": hostel_user.username if hostel_user else "Hostel Admin",
        "receiver_phone": getattr(hostel, "phone_number", "") if hostel else "",
        "receiver_upi": getattr(hostel, "upi_id", "") if hostel else "",
        "receiver_label": hostel.hostel_name if hostel else "Hostel Account",
    }, status=200)


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_verification_rent_order(request):
    serializer = VerificationTokenSerializer(data={"token": request.data.get("token")})
    serializer.is_valid(raise_exception=True)

    try:
        tenant, room = get_tenant_and_room_for_token(serializer.validated_data["token"])
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    payload, error_response = create_cashfree_order_for_tenant(tenant, room)
    if error_response:
        return error_response
    return Response(payload, status=200)


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_verification_rent_verify(request):
    serializer = VerificationTokenSerializer(data={"token": request.data.get("token")})
    serializer.is_valid(raise_exception=True)

    order_id = request.data.get("order_id")
    if not order_id:
        return Response({"error": "order_id is required"}, status=400)

    try:
        tenant, room = get_tenant_and_room_for_token(serializer.validated_data["token"])
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    payload, error_response = verify_cashfree_order_for_tenant(tenant, room, order_id)
    if error_response:
        return error_response
    return Response(payload, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resend_tenant_verification(request):
    hostel = getattr(request.user, "hostel", None)
    if not hostel:
        return Response({"error": "Hostel not found"}, status=400)

    serializer = ResendVerificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    tenant = serializer.get_tenant(hostel)
    if not tenant:
        return Response({"error": "Tenant not found"}, status=404)

    try:
        result = resend_verification(tenant)
    except ValueError as exc:
        error = exc.args[0]
        payload = {"error": error["message"]}
        payload.update(error["extra"])
        return Response(payload, status=error["status_code"])

    verification_token = result["verification_token"]
    notification = result["notification"]

    payload = {
        "message": "Verification token resent successfully",
        "tenant_id": tenant.id,
        "verification_token": str(verification_token.token),
        "verification_link": notification.get("verification_link"),
        "expires_at": verification_token.expires_at,
        "notification_channel": notification.get("channel"),
        "notification_sent": notification.get("sent", False),
    }

    if notification.get("error"):
        payload["notification_error"] = notification["error"]

    return Response(payload, status=200)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_verification_details(request, phone):
    tenant, error_response = get_authenticated_tenant_for_phone(request, phone)
    if error_response:
        return error_response

    tenant = Tenant.objects.select_related("hostel").filter(id=tenant.id).first()

    return Response({
        "name": tenant.name,
        "phone_number": tenant.phone_number,
        "room_number": tenant.room_number,
        "aadhaar_number":tenant.aadhaar_number,
        "room_type": tenant.room_type,
        "hostel_name": tenant.hostel.hostel_name if tenant.hostel else "",
        "status": tenant.status,
    })



@api_view(["POST"])
@permission_classes([AllowAny])
def submit_tenant_verification(request):
    token = request.data.get("token")
    aadhaar_number = request.data.get("aadhaar_number", "").strip()
    aadhaar_image = request.FILES.get("aadhaar_image")
    profile_image = request.FILES.get("profile_image")
    name = request.data.get("name", "").strip()

    if not name:
        return Response({"error": "Name is required"}, status=400)

    if not aadhaar_number or not aadhaar_number.isdigit() or len(aadhaar_number) != 12:
        return Response({"error": "Aadhaar number must be exactly 12 digits"}, status=400)

    if not aadhaar_image:
        return Response({"error": "Aadhaar image is required"}, status=400)

    if not profile_image:
        return Response({"error": "Profile image is required"}, status=400)

    if token:
        serializer = VerificationTokenSerializer(data={"token": token})
        serializer.is_valid(raise_exception=True)

        try:
            submit_verification_by_token(
                serializer.validated_data["token"],
                name=name,
                aadhaar_number=aadhaar_number,
                aadhaar_image=aadhaar_image,
                profile_image=profile_image,
            )
        except ValueError as exc:
            error = exc.args[0]
            payload = {"error": error["message"]}
            payload.update(error["extra"])
            return Response(payload, status=error["status_code"])
        return Response({"message": "Verification completed successfully"}, status=200)

    user = request.user
    if not isinstance(user, Tenant):
        return Response({"error": "Please Login"}, status=401)

    payload_phone = request.data.get("phone_number", "")
    if payload_phone:
        phone = normalize_phone_number(payload_phone)
        if not phone:
            return Response({"error": "Valid phone number is required"}, status=400)
        if phone != user.phone_number:
            return Response({"error": "Unauthorized tenant access"}, status=403)

    tenant = user

    tenant.name = name
    tenant.aadhaar_number = aadhaar_number
    tenant.aadhaar_image = aadhaar_image
    tenant.profile_image = profile_image
    tenant.status = "verified"
    tenant.verified_at = timezone.now()
    tenant.save()

    return Response({"message": "Verification completed successfully"}, status=200)



def get_tenant_and_room(phone):
    phone_norm = normalize_phone_number(phone)
    if not phone_norm:
        return None, None

    tenant = Tenant.objects.select_related("hostel", "hostel__user").filter(phone_number=phone_norm).first()
    if not tenant or not tenant.hostel or not tenant.hostel.user:
        return None, None

    room = Room.objects.filter(
        user=tenant.hostel.user,
        room_number__iexact=str(tenant.room_number).strip()
    ).first()

    return tenant, room


def get_authenticated_tenant_and_room(request, phone, require_verified=True):
    tenant, error_response = get_authenticated_tenant_for_phone(request, phone)
    if error_response:
        return None, None, error_response

    if require_verified and tenant.status != "verified":
        return None, None, Response(
            {
                "error": "Please complete verification first",
                "status": tenant.status,
            },
            status=403,
        )

    hostel = getattr(tenant, "hostel", None)
    hostel_user = getattr(hostel, "user", None) if hostel else None
    if not hostel_user:
        return None, None, Response({"error": "Invalid tenant link"}, status=404)

    room = Room.objects.filter(
        user=hostel_user,
        room_number__iexact=str(tenant.room_number).strip()
    ).first()

    return tenant, room, None


def get_or_create_fee(tenant, amount):
    fee = Fee.objects.filter(tenant=tenant).order_by("-created_at").first()
    if fee:
        return fee

    return Fee.objects.create(
        tenant=tenant,
        amount=Decimal(amount),
        due_date=timezone.now().date(),
        status="pending",
    )


def create_cashfree_order_for_tenant(tenant, room):
    if not settings.CASHFREE_APP_ID or not settings.CASHFREE_SECRET_KEY:
        return None, Response({"error": "Cashfree keys are not configured."}, status=500)

    amount_rupees = int(room.rent)
    order_id = f"rent_{tenant.id}_{int(timezone.now().timestamp())}"

    payload = {
        "order_id": order_id,
        "order_amount": float(amount_rupees),
        "order_currency": "INR",
        "order_note": f"Hostel room {tenant.room_number} rent",
        "customer_details": {
            "customer_id": str(tenant.id),
            "customer_phone": tenant.phone_number[-10:] if tenant.phone_number else "",
            "customer_email": f"{tenant.phone_number[-10:]}@tenant.hostel",
            "customer_name": tenant.name or "Tenant",
        },
        "order_meta": {
            "return_url": f"{getattr(settings, 'FRONTEND_URL', '').rstrip('/')}/payment-status?order_id={order_id}&status={{order_status}}",
        },
    }

    try:
        response = requests.post(
            f"{cashfree_base_url()}/orders",
            headers=cashfree_headers(),
            json=payload,
            timeout=15,
        )
    except requests.RequestException as exc:
        return None, Response({"error": f"Unable to reach Cashfree: {exc}"}, status=502)

    if not response.ok:
        try:
            err_payload = response.json()
        except Exception:
            err_payload = {"message": response.text}

        return None, Response(
            {"error": f"Cashfree order failed: {err_payload.get('message', 'Unknown error')}"},
            status=response.status_code,
        )

    order_payload = response.json()
    payment_session_id = order_payload.get("payment_session_id") or order_payload.get("paymentSessionId")

    if not payment_session_id:
        return None, Response({"error": "Payment session could not be created."}, status=500)

    fee = get_or_create_fee(tenant, amount_rupees)
    fee.transaction_id = order_id
    fee.payment_method = "online"
    fee.status = "pending"
    fee.save()

    return {
        "order_id": order_id,
        "amount": amount_rupees,
        "currency": "INR",
        "tenant_name": tenant.name,
        "tenant_phone": tenant.phone_number,
        "room_number": tenant.room_number,
        "room_type": tenant.room_type,
        "payment_session_id": payment_session_id,
        "cashfree_mode": cashfree_mode(),
    }, None


def verify_cashfree_order_for_tenant(tenant, room, order_id):
    fee = get_or_create_fee(tenant, room.rent)

    try:
        verify_response = requests.get(
            f"{cashfree_base_url()}/orders/{order_id}",
            headers=cashfree_headers(),
            timeout=15,
        )
    except requests.RequestException as exc:
        fee.status = "pending"
        fee.payment_method = "online"
        fee.transaction_id = order_id
        fee.paid_date = None
        fee.save(update_fields=["status", "payment_method", "transaction_id", "paid_date"])
        return None, Response({"error": f"Unable to reach Cashfree: {exc}"}, status=502)

    if not verify_response.ok:
        try:
            err_payload = verify_response.json()
        except Exception:
            err_payload = {"message": verify_response.text}

        fee.status = "pending"
        fee.payment_method = "online"
        fee.transaction_id = order_id
        fee.paid_date = None
        fee.save(update_fields=["status", "payment_method", "transaction_id", "paid_date"])

        return None, Response(
            {"error": f"Cashfree verification failed: {err_payload.get('message', 'Unknown error')}"},
            status=verify_response.status_code,
        )

    order_payload = verify_response.json()
    order_status = (order_payload.get("order_status") or "").upper()

    if order_status not in {"PAID", "SUCCESS", "COMPLETED"}:
        fee.status = "pending"
        fee.payment_method = "online"
        fee.transaction_id = order_id
        fee.paid_date = None
        fee.save(update_fields=["status", "payment_method", "transaction_id", "paid_date"])

        return None, Response({
            "error": f"Payment not completed yet (status: {order_status or 'PENDING'})",
            "status": "pending",
            "order_status": order_status or "PENDING",
        }, status=400)

    fee.status = "paid"
    fee.payment_method = "online"
    fee.transaction_id = order_id
    fee.paid_date = timezone.now().date()
    fee.save()

    return {
        "message": "Payment verified successfully",
        "status": "paid",
        "amount": float(fee.amount),
        "order_status": order_status,
        "payment_reference": order_id,
    }, None


def tenant_display_phone(phone_number):
    digits = "".join(ch for ch in str(phone_number or "") if ch.isdigit())
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def tenant_profile_payload(tenant, room):
    hostel = tenant.hostel
    display_phone = tenant_display_phone(tenant.phone_number)

    return {
        "id": tenant.id,
        "name": tenant.name,
        "student_id": f"TEN-{tenant.id:04d}",
        "phone_number": tenant.phone_number,
        "display_phone": display_phone,
        "status": tenant.status,
        "aadhaar_status": "Verified" if tenant.status == "verified" else "Pending",
        "hostel_name": hostel.hostel_name if hostel else "",
        "room_number": tenant.room_number,
        "room_type": tenant.room_type,
        "rent_plan": "Monthly",
        "city": hostel.city if hostel else "",
        "emergency_contact": "",
        "profile_image": tenant.profile_image.url if tenant.profile_image else None,
        "occupancy_label": (
            f"{room.occupied}/{room.total_capacity} Filled" if room else "N/A"
        ),
    }


def complaint_to_payload(complaint):
    return {
        "id": complaint.id,
        "category": complaint.category,
        "title": complaint.title,
        "description": complaint.description,
        "status": complaint.status,
        "created_at": complaint.created_at,
        "updated_at": complaint.updated_at,
    }


def cashfree_headers():
    return {
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": getattr(settings, "CASHFREE_API_VERSION", "2022-09-01"),
        "Content-Type": "application/json",
    }


def cashfree_base_url():
    return getattr(settings, "CASHFREE_BASE_URL", "https://sandbox.cashfree.com/pg").rstrip("/")


def cashfree_mode():
    return "sandbox" if "sandbox" in cashfree_base_url() else "production"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_rent_details(request, phone):
    tenant, room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response
    if not room:
        return Response({"error": "Room not found for tenant"}, status=404)

    fee = get_or_create_fee(tenant, room.rent)

    hostel = tenant.hostel
    hostel_user = hostel.user if hostel and hasattr(hostel, "user") else None

    return Response({
        "due_amount": float(fee.amount),
        "due_date": fee.due_date,
        "status": fee.status,
        "room_number": tenant.room_number,
        "room_type": tenant.room_type,
        "hostel_name": hostel.hostel_name if hostel else "",

        "receiver_name": hostel_user.username if hostel_user else "Hostel Admin",
        "receiver_phone": getattr(hostel, "phone_number", "") if hostel else "",
        "receiver_upi": getattr(hostel, "upi_id", "") if hostel else "",
        "receiver_label": hostel.hostel_name if hostel else "Hostel Account",
    })



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tenant_rent_order(request, phone):
    tenant, room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response
    if not room:
        return Response({"error": "Room not found for tenant"}, status=404)

    payload, error_response = create_cashfree_order_for_tenant(tenant, room)
    if error_response:
        return error_response
    return Response(payload, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tenant_rent_verify(request, phone):
    tenant, room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response
    if not room:
        return Response({"error": "Room not found for tenant"}, status=404)

    order_id = request.data.get("order_id")
    if not order_id:
        return Response({"error": "order_id is required"}, status=400)

    payload, error_response = verify_cashfree_order_for_tenant(tenant, room, order_id)
    if error_response:
        return error_response
    return Response(payload, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_profile(request, phone):
    tenant, room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response

    return Response(tenant_profile_payload(tenant, room), status=200)


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_login(request):
    phone = normalize_phone_number(request.data.get("phone_number", ""))
    if not phone:
        return Response({"error": "Valid phone number is required"}, status=400)

    tenant = Tenant.objects.filter(phone_number=phone, is_active=True).first()
    if not tenant:
        return Response({"error": "Invalid credentials"}, status=401)

    if not tenant.password:
        tenant.password = make_password("1234567")
        tenant.password_updated = False
        tenant.save(update_fields=["password", "password_updated"])

    password = str(request.data.get("password", "")).strip()
    old_password = str(request.data.get("old_password", "")).strip()
    new_password = str(request.data.get("new_password", "")).strip()

    if not tenant.password_updated:
        if old_password or new_password:
            if not check_password(old_password, tenant.password):
                return Response(
                    {
                        "error": "Old password is incorrect",
                        "requires_password_change": True,
                    },
                    status=400,
                )

            if len(new_password) < 6:
                return Response(
                    {
                        "error": "New password must be at least 6 characters",
                        "requires_password_change": True,
                    },
                    status=400,
                )

            tenant.password = make_password(new_password)
            tenant.password_updated = True
            tenant.save(update_fields=["password", "password_updated"])

            _tenant, room = get_tenant_and_room(phone)
            payload_tenant = _tenant or tenant
            tenant_payload = (
                tenant_profile_payload(payload_tenant, room)
                if payload_tenant.status == "verified"
                else None
            )
            response = Response(
                {
                    "message": (
                        "Password updated successfully"
                        if payload_tenant.status == "verified"
                        else "Password updated. Please complete verification to access dashboard data."
                    ),
                    "requires_password_change": False,
                    "requires_verification": payload_tenant.status != "verified",
                    "tenant": tenant_payload,
                },
                status=200,
            )
            set_tenant_auth_cookies(response, payload_tenant)
            return response

        if not password or not check_password(password, tenant.password):
            return Response({"error": "Invalid credentials"}, status=401)

        return Response(
            {
                "message": "First-time login detected. Please set a new password.",
                "requires_password_change": True,
                "default_old_password": "1234567",
            },
            status=200,
        )

    if not password or not check_password(password, tenant.password):
        return Response({"error": "Invalid credentials"}, status=401)

    _tenant, room = get_tenant_and_room(phone)
    payload_tenant = _tenant or tenant
    tenant_payload = (
        tenant_profile_payload(payload_tenant, room)
        if payload_tenant.status == "verified"
        else None
    )
    response = Response(
        {
            "message": (
                "Login successful"
                if payload_tenant.status == "verified"
                else "Login successful. Please complete verification to access dashboard data."
            ),
            "requires_password_change": False,
            "requires_verification": payload_tenant.status != "verified",
            "tenant": tenant_payload,
        },
        status=200,
    )
    set_tenant_auth_cookies(response, payload_tenant)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_refresh_access_token(request):
    refresh_token = request.COOKIES.get("tenant_refresh_token")
    if not refresh_token:
        return Response({"error": "Refresh token missing"}, status=401)

    try:
        refresh = RefreshToken(refresh_token)
    except Exception:
        return Response({"error": "Invalid refresh token"}, status=401)

    if refresh.get("user_type") != "tenant":
        return Response({"error": "Invalid refresh token"}, status=401)

    tenant_id = refresh.get("tenant_id")
    tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
    if not tenant:
        return Response({"error": "Tenant not found"}, status=404)

    response = Response({"message": "Access token refreshed"}, status=200)
    response.set_cookie(
        key="tenant_access_token",
        value=str(refresh.access_token),
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60 * 60,
        path="/",
    )
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_logout(request):
    response = Response({"message": "Logged out successfully"}, status=200)
    response.delete_cookie("tenant_access_token", path="/")
    response.delete_cookie("tenant_refresh_token", path="/")
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_room_details(request, phone):
    tenant, room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response

    if not room:
        return Response({"error": "Room not found for tenant"}, status=404)

    # Keep occupancy live for tenant dashboard cards.
    sync_room_occupied(room)
    room.refresh_from_db()

    return Response(
        {
            "room_number": room.room_number,
            "room_type": room.room_type,
            "occupancy": room.occupied,
            "total_capacity": room.total_capacity,
            "occupancy_label": f"{room.occupied}/{room.total_capacity} Filled",
            "rent": room.rent,
            "hostel_name": tenant.hostel.hostel_name if tenant.hostel else "",
            "tenant_status": tenant.status,
        },
        status=200,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_rules(request, phone):
    _tenant, _room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response

    return Response(
        {
            "title": "Hostel Rules",
            "hint": "Discipline and safety guidelines",
            "description": "Please follow these guidelines to keep the hostel safe and comfortable for everyone.",
            "rules": HOSTEL_RULES,
        },
        status=200,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_menu(request, phone):
    _tenant, _room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response

    return Response(
        {
            "title": "Mess Menu",
            "hint": "Weekly meal schedule",
            "description": "Meal plan shared by hostel management.",
            "weekly_menu": WEEKLY_MENU,
        },
        status=200,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tenant_complaints(request, phone):
    tenant, _room, error_response = get_authenticated_tenant_and_room(request, phone)
    if error_response:
        return error_response

    if request.method == "POST":
        category = str(request.data.get("category", "other")).strip().lower()
        title = str(request.data.get("title", "")).strip()
        description = str(request.data.get("description", "")).strip()

        valid_categories = {choice[0] for choice in TenantComplaint.CATEGORY_CHOICES}
        if category not in valid_categories:
            return Response({"error": "Invalid complaint category"}, status=400)

        if not title:
            return Response({"error": "Complaint title is required"}, status=400)

        complaint = TenantComplaint.objects.create(
            tenant=tenant,
            category=category,
            title=title,
            description=description,
        )

        return Response(
            {
                "message": "Complaint submitted successfully",
                "complaint": complaint_to_payload(complaint),
            },
            status=201,
        )

    complaints = tenant.complaints.order_by("-created_at")
    open_count = complaints.exclude(status="resolved").count()

    return Response(
        {
            "summary": {
                "open_tickets": open_count,
                "total_tickets": complaints.count(),
                "last_response": "Pending",
                "priority": "Normal",
            },
            "complaints": [complaint_to_payload(item) for item in complaints[:10]],
        },
        status=200,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pending_verifications(request):
    
    hostel = getattr(request.user, "hostel", None)
    if not hostel:
        return Response({"error": "Hostel not found"}, status=404)

    tenants = (
        Tenant.objects.filter(hostel=hostel, status="pending")
        .order_by("-created_at")
        .values(
            "id",
            "name",
            "phone_number",
            "room_number",
            "room_type",
            "status",
            "created_at",
        )
    )

    return Response({"pending": list(tenants)}, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def upcoming_fees(request):
    
    hostel = getattr(request.user, "hostel", None)
    if not hostel:
        return Response({"error": "Hostel not found"}, status=404)

    today = timezone.now().date()
    cutoff = today + timedelta(days=7)

    fees = (
        Fee.objects.select_related("tenant")
        .filter(
            tenant__hostel=hostel,
            due_date__gt=today,
            due_date__lte=cutoff,
        )
        .exclude(status="paid")
        .order_by("due_date")
        .values(
            "id",
            "amount",
            "due_date",
            "status",
            "tenant__name",
            "tenant__phone_number",
            "tenant__room_number",
            "tenant__room_type",
        )
    )

    return Response({"upcoming": list(fees)}, status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenants_list(request):
    hostel = getattr(request.user, "hostel", None)
    if not hostel:
        return Response({"error": "Hostel not found"}, status=404)

    tenants_qs = Tenant.objects.filter(
        hostel=hostel,
        status__in=["pending", "verified"]
    ).order_by("-created_at")

    tenants = []
    for tenant in tenants_qs:
        tenants.append({
            "id": tenant.id,
            "name": tenant.name,
            "phone_number": tenant.phone_number,
            "room_number": tenant.room_number,
            "room_type": tenant.room_type,
            "status": tenant.status,
            "profile_image": tenant.profile_image.url if tenant.profile_image else None,  # ✅ FIX
            "aadhaar_number": tenant.aadhaar_number,
        })

    return Response({"tenants": tenants}, status=200)



@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_tenant(request, tenant_id):
    hostel = getattr(request.user, "hostel", None)
    if not hostel:
        return Response({"error": "Hostel not found"}, status=404)

    try:
        tenant = Tenant.objects.get(id=tenant_id, hostel=hostel)
    except Tenant.DoesNotExist:
        return Response({"error": "Tenant not found"}, status=404)

    tenant.delete()
    return Response({"success": "Tenant deleted"}, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def complaints_list(request):
    hostel = getattr(request.user, "hostel", None)
    if not hostel:
        return Response({"error": "Hostel not found"}, status=404)

    complaints = (
        TenantComplaint.objects.select_related("tenant")
        .filter(tenant__hostel=hostel)
        .order_by("-created_at")
    )

    payload = [
        {
            "id": complaint.id,
            "tenant_name": complaint.tenant.name,
            "tenant_phone": complaint.tenant.phone_number,
            "room_number": complaint.tenant.room_number,
            "category": complaint.category,
            "title": complaint.title,
            "description": complaint.description,
            "status": complaint.status,
            "created_at": complaint.created_at,
        }
        for complaint in complaints
    ]

    return Response({"complaints": payload}, status=200)
