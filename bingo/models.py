# Create your models here.



from django.conf import settings
from django.db import models

class BingoBoard(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bingo_board")
    email = models.EmailField(blank=True, default="")
    grid = models.JSONField(default=dict)  # przechowuje cały payload JSON
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"BingoBoard({self.user.username})"
