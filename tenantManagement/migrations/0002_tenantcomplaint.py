#
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenantManagement", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TenantComplaint",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(choices=[("room", "Room"), ("food", "Food"), ("electricity", "Electricity"), ("water", "Water"), ("other", "Other")], default="other", max_length=20)),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("open", "Open"), ("in_progress", "In Progress"), ("resolved", "Resolved")], default="open", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="complaints", to="tenantManagement.tenant")),
            ],
        ),
    ]
