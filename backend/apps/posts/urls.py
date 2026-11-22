from django.urls import path
from . import views

urlpatterns = [
    path('feed/', views.FeedView.as_view(), name='feed'),
    path('', views.PostCreateView.as_view(), name='post-create'),
    path('<uuid:id>/', views.PostDetailView.as_view(), name='post-detail'),
    path('<uuid:post_id>/comments/', views.CommentListView.as_view(), name='comment-list'),
    path('<uuid:post_id>/comments/create/', views.CommentCreateView.as_view(), name='comment-create'),
    path('<uuid:post_id>/react/', views.ReactionToggleView.as_view(), name='reaction-toggle'),
    path('<uuid:post_id>/pin/', views.PinPostView.as_view(), name='post-pin'),
]
