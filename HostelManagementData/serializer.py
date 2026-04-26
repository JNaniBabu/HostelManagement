from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from .models import CustomUser,Room


class SerializerHostelData(ModelSerializer):
    ProfileImage = serializers.ImageField(required=False)
    class Meta:
        model=CustomUser
        fields="__all__"
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


class SerializerRoomData(ModelSerializer):
    class Meta:
        model=Room
        fields="__all__"