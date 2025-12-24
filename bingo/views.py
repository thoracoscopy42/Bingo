# Create your views here.

import json
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.contrib.auth.views import LoginView
from django.views.decorators.http import require_POST
from .models import BingoBoard


class LandingLoginView(LoginView):
    template_name = "registration/login.html"
    redirect_authenticated_user = True

@login_required
def game(request):
    return render(request, "game.html", {"rows": range(4), "cols": range(4)})







@login_required
@require_POST
def save_board(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("Invalid JSON")

    grid = payload.get("grid")
    if not isinstance(grid, list):
        return HttpResponseBadRequest("Missing grid")

    # email: z payload albo z konta (jak chcesz)
    email = (payload.get("email") or request.user.email or "").strip()

    BingoBoard.objects.update_or_create(
        user=request.user,
        defaults={"email": email, "grid": payload},
    )

    return JsonResponse({"ok": True})
