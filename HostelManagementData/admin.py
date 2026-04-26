from django.contrib import admin
from .models import CustomUser, Hostel,UpiDetails,Room


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "hostel_name", "city", "state", "pincode")


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("id", "Number", "is_staff", "is_active")



@admin.register(UpiDetails)
class UpiDetailsAdmin(admin.ModelAdmin):
    list_display = ("id", "account_holder", "upi_id", "mobile")

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("id","user", "room_number", "room_type", "total_capacity", "occupied", "rent")
