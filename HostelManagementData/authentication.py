from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        is_tenant_path = request.path.startswith("/tenant/")
        header = self.get_header(request)
        token_candidates = []

        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token:
                token_candidates.append(raw_token)

        if not token_candidates:
            cookie_order = ["tenant_access_token"] if is_tenant_path else ["access_token"]

            for cookie_name in cookie_order:
                token_value = request.COOKIES.get(cookie_name)
                if token_value:
                    token_candidates.append(token_value)

        if not token_candidates:
            return None

        last_error = None
        for token_value in token_candidates:
            try:
                validated_token = self.get_validated_token(token_value)
            except (InvalidToken, TokenError) as token_error:
                last_error = token_error
                continue

            user_type = validated_token.get("user_type")
            if is_tenant_path and user_type != "tenant":
                continue
            if (not is_tenant_path) and user_type == "tenant":
                continue

            if user_type == "tenant":
                from tenantManagement.models import Tenant

                tenant_id = validated_token.get("tenant_id")
                tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
                if not tenant:
                    raise AuthenticationFailed("Tenant not found")
                return (tenant, validated_token)

            return (self.get_user(validated_token), validated_token)

        if last_error:
            raise AuthenticationFailed("Invalid token")

        return None
