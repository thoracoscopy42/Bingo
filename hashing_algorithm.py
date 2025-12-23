from django.contrib.auth.hashers import make_password

plain_password = 'admin'
hashed_password = make_password(plain_password)
print("Hashed password:", hashed_password)
print("Plain password:", plain_password)