from rest_framework import serializers

from .models import Tenant


def normalize_phone_number(phone):
    digits = "".join(ch for ch in str(phone).strip() if ch.isdigit())

    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return None


class TenantRegistrationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=15)
    room_number = serializers.CharField(max_length=10)
    room_type = serializers.CharField(max_length=50)

    def validate_phone_number(self, value):
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("Invalid phone number")
        return normalized

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required")
        return value

    def validate_room_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Room number is required")
        return value

    def validate_room_type(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Room type is required")
        return value


class VerificationTokenSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class ResendVerificationSerializer(serializers.Serializer):
    tenant_id = serializers.IntegerField(required=False)
    phone_number = serializers.CharField(required=False)

    def validate(self, attrs):
        tenant_id = attrs.get("tenant_id")
        phone_number = attrs.get("phone_number")

        if not tenant_id and not phone_number:
            raise serializers.ValidationError(
                "Provide either tenant_id or phone_number."
            )

        if phone_number:
            normalized = normalize_phone_number(phone_number)
            if not normalized:
                raise serializers.ValidationError(
                    {"phone_number": "Invalid phone number"}
                )
            attrs["phone_number"] = normalized

        return attrs

    def get_tenant(self, hostel):
        tenant_id = self.validated_data.get("tenant_id")
        phone_number = self.validated_data.get("phone_number")

        queryset = Tenant.objects.filter(hostel=hostel)
        if tenant_id:
            return queryset.filter(id=tenant_id).first()
        return queryset.filter(phone_number=phone_number).first()
