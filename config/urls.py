"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from bingo.views import home # tu import nazwy z patha z appki (komentarz do pierwszego żebyśmy wiedzieli jak uzywać potem usunąć)
import bingo.views as views # import widoków z bingo.views żeby móc użyć login_page

urlpatterns = [
    path("", home,name='home'), # dodane Landing page które ma nazwę home (komentarz do pierwszego żebyśmy wiedzieli jak uzywać potem usunąć)
    path("login/", views.login_page, name="login"),
    path('admin/', admin.site.urls),
]

#dodalem nazwe do sciezki na home inaczej strona z logowaniem sie nie odpalala bo mam tam guzik na powrot na glowna - to do omowienia ale mozna wywalic