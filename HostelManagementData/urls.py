from .views import (
    ProfileData,
    Registration,
    Login,
    ProfileUpdate,
    HostelDataUpdate,
    HostelData,
    UpdateUpi,
    UserData,
    UpiData,
    add_room,
    GetVacancyRooms,
    CheckAvailability,
    RefreshAccessToken
)

from django.urls import path


urlpatterns = [
    path('register/', Registration),
    path('login/', Login),
    path('profile/', ProfileData),
    path('profile/update/', ProfileUpdate),
    path("hostel/update/", HostelDataUpdate),
    path("hostel/data/", HostelData),
    path("user/data/", UserData),
    path("upi/data/", UpiData),
    path("upi/update/", UpdateUpi),
    path("add/room/", add_room),
    path("vacancyrooms/", GetVacancyRooms),
    path("checkavailability/", CheckAvailability),
    path("token/refresh/", RefreshAccessToken)
]
