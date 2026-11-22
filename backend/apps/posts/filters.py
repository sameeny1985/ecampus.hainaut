import django_filters
from .models import Post


class PostFilter(django_filters.FilterSet):
    community = django_filters.UUIDFilter(field_name='community_id')
    search = django_filters.CharFilter(field_name='content', lookup_expr='icontains')
    is_official = django_filters.BooleanFilter()
    author = django_filters.UUIDFilter(field_name='author_id')

    class Meta:
        model = Post
        fields = ['community', 'search', 'is_official', 'author']
