
from cloudinary.models import CloudinaryField
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.conf import settings


class CustomUserManager(BaseUserManager):
    def create_user(self, Number, password=None, **extra_fields):
        if not Number:
            raise ValueError("Mobile number is required")

        user = self.model(Number=Number, **extra_fields)
        user.set_password(password)  
        user.save(using=self._db)
        return user

    def create_superuser(self, Number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(Number, password, **extra_fields)

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from cloudinary.models import CloudinaryField


class CustomUserManager(BaseUserManager):
    def create_user(self, Number, password=None, **extra_fields):
        if not Number:
            raise ValueError("Mobile number is required")

        user = self.model(Number=Number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, Number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        return self.create_user(Number, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    
    username = models.CharField(max_length=200, blank=False)
    email = models.EmailField(unique=True, blank=False)
    Number = models.CharField(max_length=15, unique=True) 
    Address = models.CharField(max_length=500, blank=True)
    ProfileImage = CloudinaryField("image", blank=True, null=True)


    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = "Number"
    REQUIRED_FIELDS = ['email']
    def __str__(self):
        return f"{self.username} ({self.Number})"


class Hostel(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hostel"
    )

    hostel_name = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    image1 = CloudinaryField('image', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.hostel_name



class UpiDetails(models.Model):

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name="upi_detaills")

    account_holder = models.CharField(max_length=100, blank=True)

    upi_id = models.CharField(max_length=100, blank=True)

    mobile = models.CharField(max_length=10, blank=True)

    def __str__(self):
        return self.user.username
    


class Room(models.Model):

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)

    room_number = models.CharField(max_length=10)

    room_type = models.CharField(max_length=50)

    total_capacity = models.PositiveIntegerField()
    
    occupied = models.PositiveIntegerField(default=0)

    rent = rent = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
         return self.room_number
    