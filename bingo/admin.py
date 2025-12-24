# Register your models here.

from django.contrib import admin
from .models import BingoBoard

@admin.register(BingoBoard)
class BingoBoardAdmin(admin.ModelAdmin):
    list_display = ("user", "email", "updated_at")
    search_fields = ("user__username", "email")
