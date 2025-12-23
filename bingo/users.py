import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

users = {
    "test": "12345",
    "test2": "qwerty",
}

for username, password in users.items():
    user, created = User.objects.get_or_create(username=username)
    user.password = make_password(password)
    user.save()
    if created:
        print(f"Dodano: {username}")

print("Użytkownicy dodani.")
