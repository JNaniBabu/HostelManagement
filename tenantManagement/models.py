import uuid
from datetime import timedelta

from cloudinary.models import CloudinaryField
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import models
from django.utils import timezone


def default_tenant_password():
    return make_password("1234567")

class Tenant(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('expired', 'Expired'),
    ]
      
    hostel = models.ForeignKey(
        'HostelManagementData.Hostel',
        on_delete=models.CASCADE,
        related_name='tenants'
    )

    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15, unique=True)
    aadhaar_number = models.CharField(max_length=12, blank=True)
    aadhaar_image = CloudinaryField('image', blank=True, null=True)

    profile_image = CloudinaryField('image', blank=True, null=True)
  
    room_type = models.CharField(max_length=50, default="")
    room_number = models.CharField(max_length=10)
  
    join_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    password = models.CharField(max_length=128, default=default_tenant_password)
    password_updated = models.BooleanField(default=False)
    verified_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - Room {self.room_number}"

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_verified(self):
        return self.status == "verified"


class VerificationToken(models.Model):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="verification_tokens",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(blank=True, null=True)
    revoked_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "expires_at"]),
        ]

    def __str__(self):
        return f"{self.tenant.name} - {self.token}"

    def is_valid(self):
        now = timezone.now()
        return (
            self.used_at is None
            and self.revoked_at is None
            and self.expires_at > now
        )

    @classmethod
    def create_token(cls, tenant, expiry_minutes=None):
        expiry_minutes = expiry_minutes or getattr(
            settings,
            "TENANT_VERIFICATION_TOKEN_EXPIRY_MINUTES",
            10,
        )
        now = timezone.now()

        # Keep only one active verification token per tenant.
        cls.objects.filter(
            tenant=tenant,
            used_at__isnull=True,
            revoked_at__isnull=True,
        ).update(revoked_at=now)

        return cls.objects.create(
            tenant=tenant,
            expires_at=now + timedelta(minutes=expiry_minutes),
        )


class Fee(models.Model):
    
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name="fees"
    )
    
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    
    due_date = models.DateField()
    paid_date = models.DateField(blank=True, null=True)
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('paid', 'Paid'),
            ('late', 'Late')
        ],
        default='pending'
    )
    
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Cash'),
            ('upi', 'UPI'),
            ("online", "Online")
        ],
        blank=True,
        null=True
    )
    
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tenant.name} - {self.amount} - {self.status}"


class TenantComplaint(models.Model):
    CATEGORY_CHOICES = [
        ("room", "Room"),
        ("food", "Food"),
        ("electricity", "Electricity"),
        ("water", "Water"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
    ]

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="complaints",
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.tenant.name} - {self.title} ({self.status})"

