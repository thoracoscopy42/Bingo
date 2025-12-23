import os #zczytywanie zmiennych srodowiskowych
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")#wskazanie na plik z ustawieniami django
django.setup()#polaczenia z baza danych django pod reszte kodu

from django.contrib.auth.models import User #<-- import modelu User uzytkownika z pustymi parametrami dalem narazie tylko te ktore sa potrzebne
from django.contrib.auth.hashers import make_password #<-- import funkcji do hashowania
users = {
    "test": "12345",#test userzy ich sie wywali pozniej
    "test2": "qwerty",
}
#dodawanie userow do bazy danych z zahashowanymi haslami
for username, password in users.items():
    user, created = User.objects.get_or_create(username=username) #sprawdza czy user juz istnieje, jak nie to tworzy
    user.password = make_password(password)#hashuje haslo
    user.save()#zapisuje usera w bazie z haslem
    if created:
        print(f"Dodano: {username}")

print("Użytkownicy dodani.")

#na sprawdzenie hasel ponizsze komendy w PS 
#from django.contrib.auth.models import User
#from django.contrib.auth.hashers import check_password
#user1 = User.objects.get(username="test")
#user2 = User.objects.get(username="test2")
#print("Hasło zahashowane dla 'test':", user1.password)
#print("Hasło zahashowane dla 'test2':", user2.password)

#ze wzgledu ze to dzialanie na PS django nie ma tego w bazie danych Pythonowej 
#plik musi byc w folderze Bingo inaczej wali glupa i trzeba migrowac dane/tabele itd

