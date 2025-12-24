from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views

from bingo.views import LandingLoginView
from bingo.views import game # tu import nazwy z patha z appki (komentarz do pierwszego żebyśmy wiedzieli jak uzywać potem usunąć)
from bingo.views import FirstPasswordChangeView


urlpatterns = [
    # path("", home,name='home'),
    path("", LandingLoginView.as_view(), name="landing_login"),
    path("accounts/login/", LandingLoginView.as_view(), name="login"),
    path('admin/', admin.site.urls),
    path("game/", game, name="game"), 
    path("accounts/", include("django.contrib.auth.urls")), # dodane game page które ma nazwę game (komentarz do pierwszego żebyśmy wiedzieli jak uzywać potem usunąć)
     path("accounts/password_change/", FirstPasswordChangeView.as_view(), name="password_change"),
    path("accounts/password_change/done/", auth_views.PasswordChangeDoneView.as_view(), name="password_change_done"),


]

