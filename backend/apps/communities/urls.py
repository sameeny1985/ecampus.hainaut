from django.urls import path
from . import views

urlpatterns = [
    path('majors/', views.MajorListView.as_view(), name='major-list'),
    path('teachers/', views.TeachersListView.as_view(), name='teachers-list'),
    path('', views.CommunityListCreateView.as_view(), name='community-list-create'),
    path('<uuid:id>/', views.CommunityDetailView.as_view(), name='community-detail'),
    path('<uuid:community_id>/delete/', views.DeleteCommunityView.as_view(), name='community-delete'),
    path('<uuid:community_id>/join/', views.JoinCommunityView.as_view(), name='community-join'),
    path('<uuid:community_id>/leave/', views.LeaveCommunityView.as_view(), name='community-leave'),
    path('<uuid:community_id>/members/', views.CommunityMembersView.as_view(), name='community-members'),
    path('<uuid:community_id>/members/<uuid:user_id>/promote/', views.PromoteMemberView.as_view(), name='community-promote'),
    path('<uuid:community_id>/members/<uuid:user_id>/ban/', views.BanMemberView.as_view(), name='community-ban'),
    path('<uuid:community_id>/members/<uuid:user_id>/grade/', views.GradeMemberView.as_view(), name='community-grade'),
    path('<uuid:community_id>/resources/', views.CommunityResourcesView.as_view(), name='community-resources'),
    path('<uuid:community_id>/resources/upload/', views.UploadResourceView.as_view(), name='community-resource-upload'),
    path('enrollments/', views.StudentEnrollmentsView.as_view(), name='student-enrollments'),
]
