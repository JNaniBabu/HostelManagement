from django.db.models import F, Count
from django.db.models.functions import Lower
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login

from .serializer import SerializerHostelData, SerializerRoomData
from .models import CustomUser, UpiDetails, Room, Hostel
from tenantManagement.models import Tenant
import re

@api_view(['POST'])
@permission_classes([AllowAny])
def Registration(request):
    try:
        data = request.data

        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        number = data.get("Number")

        if not username or not email or not password or not number:
            return Response(
                {"message": "All fields are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if CustomUser.objects.filter(email=email).exists():
            return Response(
                {"message": "Email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if CustomUser.objects.filter(Number=number).exists():
            return Response(
                {"message": "Mobile number already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = CustomUser.objects.create_user(
            Number=number,
            password=password,
            username=username,
            email=email
        )

        return Response(
            {"message": "Registration Successful"},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        
        return Response(
            {"message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['POST'])
@permission_classes([AllowAny])
def Login(request):

    Number = request.data.get("Number")
    Password = request.data.get("password")

    user = authenticate(request, Number=Number, password=Password)

    if user is None:
        return Response(
            {"message": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)

    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    response = Response(
        {"message": "Login Successful"},
        status=status.HTTP_200_OK
    )

    def set_access_cookie(resp, token):
        resp.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="None",
            max_age=60*60,
            path="/"
        )

    set_access_cookie(response, access_token)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60*60*24,
        path="/"
    )

    return response




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ProfileData(request):
    user = request.user
    serializer = SerializerHostelData(user.hostel)
    return Response(serializer.data)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ProfileUpdate(request):

    user = request.user
    data = request.data.copy()
    for key, value in list(data.items()):
        if value == "":
            data.pop(key)

    serializer = SerializerHostelData(user, data=data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Profile Updated Successfully"})

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def is_valid_upi(upi_id: str) -> bool:
   
    if not upi_id:
        return False
    pattern = r"^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$"
    return re.match(pattern, upi_id) is not None



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def HostelDataUpdate(request):

    try:
        hostel = Hostel.objects.get(user=request.user)

    except Hostel.DoesNotExist:
        return Response({"error": "Hostel not found"}, status=404)


    hostel_name = request.data.get("hostel_name")
    city = request.data.get("city")
    state = request.data.get("state")
    pincode = request.data.get("pincode")

    image1 = request.FILES.get("image1")


    if hostel_name:
        hostel.hostel_name = hostel_name

    if city:
        hostel.city = city

    if state:
        hostel.state = state

    if pincode:
        hostel.pincode = pincode

    if image1:
        hostel.image1 = image1


    hostel.save()

    return Response({
        "message": "Hostel updated successfully"
    })
    



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def HostelData(request):
   
    hostel = request.user.hostel

    return Response({
        "hostel_name": hostel.hostel_name,
        "city": hostel.city,
        "state": hostel.state,
        "pincode": hostel.pincode,
        "image1": hostel.image1.url if hostel.image1 else None
    })





@api_view(["GET"])
@permission_classes([IsAuthenticated])
def UserData(request):
    
    user = request.user  
    return Response({
        "username": user.username,
        "email": user.email,
        "Number": user.Number,
        "Address": user.Address,
        "ProfileImage": user.ProfileImage.url if user.ProfileImage else None
    })



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def UpiData(request):

    user = request.user

    try:
        upi = UpiDetails.objects.get(user=user)

        data = {
            "account_holder": upi.account_holder,
            "upi_id": upi.upi_id,
            "mobile": upi.mobile
        }

        return Response(data)

    except UpiDetails.DoesNotExist:

        return Response({
            "error": "UPI details not found"
        }, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def UpdateUpi(request):

    user = request.user
    data = request.data

    try:

        upi = UpiDetails.objects.get(user=user)

        upi.account_holder = data.get("account_holder", upi.account_holder)
        new_upi = data.get("upi_id", upi.upi_id)
        new_mobile = data.get("mobile", upi.mobile)

        if new_upi and not is_valid_upi(new_upi.strip()):
            return Response(
                {"error": "Invalid UPI ID. Use format like name@bank with letters/numbers/._-"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_mobile and (not new_mobile.isdigit() or len(new_mobile) != 10):
            return Response(
                {"error": "Mobile must be a 10 digit number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        upi.upi_id = new_upi
        upi.mobile = new_mobile

        upi.save()

        return Response({
            "message": "UPI updated successfully"
        })

    except UpiDetails.DoesNotExist:

        return Response({
            "error": "UPI details not found"
        }, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_room(request):
    capability={
        "Single Share":1,
        "Two Share":2,
        "Three Share":3,
        "Four Share":4,
    }
    try:
        user = request.user

        room_number = str(request.data.get("room_number", "")).strip().lower()
        room_type = str(request.data.get("room_type", ""))
        rent = request.data.get("rent")

    
        if Room.objects.filter(user=user, room_number=room_number).exists():
            return Response(
                {"message": "Room already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        Room.objects.create(
            user=user,
            room_number=room_number,
            room_type=room_type,
            total_capacity=capability[room_type],
            occupied=0,
            rent=int(rent)
        )

        return Response(
            {"message": "Room added successfully"},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        print(e)
        return Response(
            {"message": "An error occurred while adding the room"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    

def annotate_live_occupancy(user, room_qs):
    room_numbers = list(room_qs.values_list("room_number", flat=True))
    if not room_numbers:
        return []

    occupancy_map = {
        row["room_number_lower"]: row["count"]
        for row in Tenant.objects.filter(
            hostel=user.hostel,
            status__in=["pending", "verified"],
            room_number__in=room_numbers,
        )
        .annotate(room_number_lower=Lower("room_number"))
        .values("room_number_lower")
        .annotate(count=Count("id"))
    }

    synced_rooms = []
    for room in room_qs:
        live_count = occupancy_map.get(room.room_number.lower(), 0)
        if room.occupied != live_count:
            Room.objects.filter(id=room.id).update(occupied=live_count)
        room.occupied = live_count
        synced_rooms.append(room)
    return synced_rooms


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetVacancyRooms(request):
    user = request.user
    rooms = Room.objects.filter(user=user)
    rooms = annotate_live_occupancy(user, rooms)

    available_rooms = [room for room in rooms if room.occupied < room.total_capacity]
    serializer = SerializerRoomData(available_rooms, many=True)
   
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def CheckAvailability(request):
    user = request.user
    room_type = request.data.get("room_type")

    rooms = Room.objects.filter(user=user, room_type=room_type)
    rooms = annotate_live_occupancy(user, rooms)

    available = [room for room in rooms if room.occupied < room.total_capacity]
    serializer = SerializerRoomData(available, many=True)
   
    return Response({"message": serializer.data})


@api_view(['POST'])
@permission_classes([AllowAny])
def RefreshAccessToken(request):
    refresh_token = request.COOKIES.get("refresh_token")
    if not refresh_token:
        return Response({"error": "Refresh token missing"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        refresh = RefreshToken(refresh_token)
        new_access = str(refresh.access_token)
    except Exception:
        return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

    response = Response({"message": "Access token refreshed"}, status=status.HTTP_200_OK)
    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60*60,
        path="/"
    )
    return response

    
