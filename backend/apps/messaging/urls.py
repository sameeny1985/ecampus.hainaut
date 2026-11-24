from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.UserListView.as_view(), name='messaging-users'),
    path('conversations/', views.ConversationListCreateView.as_view(), name='conversations'),
    path('conversations/<uuid:conversation_id>/messages/', views.MessageListCreateView.as_view(), name='messages'),
    path('conversations/<uuid:conversation_id>/trash/', views.ConversationTrashToggleView.as_view(), name='conversation-trash'),
    path('conversations/<uuid:conversation_id>/delete/', views.ConversationPermanentDeleteView.as_view(), name='conversation-permanent-delete'),
]
