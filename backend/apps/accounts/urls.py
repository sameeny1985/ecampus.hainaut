from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .debug_views import SetPasswordDebugView

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('profile/', views.ProfileUpdateView.as_view(), name='profile-update'),
    path('privacy/', views.PrivacySettingsView.as_view(), name='privacy'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('search/', views.SearchUsersView.as_view(), name='search-users'),
    path('first-year-requests/', views.FirstYearRegistrationRequestView.as_view(), name='first-year-requests'),
    path('registration-requests/', views.ModeratorRegistrationRequestListView.as_view(), name='registration-requests'),
    path('upper-year-register/', views.UpperYearRegistrationView.as_view(), name='upper-year-register'),
    path('registration-requests/<uuid:req_id>/decision/', views.ModeratorRegistrationRequestDecisionView.as_view(), name='registration-request-decision'),
    path('users/', views.StaffUserListView.as_view(), name='staff-user-list'),
    path('delete-account/', views.DeleteAccountView.as_view(), name='delete-account'),
    path('cookies/', views.CookieConsentView.as_view(), name='cookies'),
    path('block/<uuid:user_id>/', views.BlockUserView.as_view(), name='block-user'),
    path('unblock/<uuid:user_id>/', views.UnblockUserView.as_view(), name='unblock-user'),
    path('blocked/', views.BlockedListView.as_view(), name='blocked-list'),
    # TEMPORARY DEBUG - remove later
    path('debug/set-password/', SetPasswordDebugView.as_view(), name='debug-set-password'),
]
