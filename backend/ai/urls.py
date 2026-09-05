from django.urls import path

from .views import GenerateChallengeView

app_name = 'ai'

urlpatterns = [
    path('challenges/generate/', GenerateChallengeView.as_view(), name='generate-challenge'),
]
