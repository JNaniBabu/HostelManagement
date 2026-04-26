
from django.contrib import admin
from .models import Fee, Tenant, VerificationToken



class FeeInline(admin.TabularInline):
    model = Fee
    extra = 0
    fields = ('amount', 'status', 'due_date', 'paid_date')
    readonly_fields = ('created_at',)





@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'phone_number', 
        'room_number', 
        'is_active', 
        'created_at'
    )
    
    search_fields = ('name', 'phone_number', 'room_number')
    
    list_filter = ('is_active', 'room_number')
    
    ordering = ('-created_at',)
    
    inlines = [FeeInline]



@admin.register(Fee)
class FeeAdmin(admin.ModelAdmin):
    list_display = (
        'tenant', 
        'amount', 
        'status', 
        'due_date', 
        'paid_date'
    )
    
    list_filter = ('status', 'payment_method')
    
    search_fields = ('tenant__name', 'transaction_id')
    
    list_editable = ('status',)
    
    ordering = ('-due_date',)


@admin.register(VerificationToken)
class VerificationTokenAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "token",
        "expires_at",
        "used_at",
        "revoked_at",
        "created_at",
    )
    search_fields = ("tenant__name", "tenant__phone_number", "token")
    list_filter = ("used_at", "revoked_at", "created_at")
    ordering = ("-created_at",)

