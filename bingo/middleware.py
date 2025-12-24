from django.shortcuts import redirect
from django.urls import NoReverseMatch, reverse

class ForcePasswordChangeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            prof = getattr(request.user, "userprofile", None)

            if prof and prof.must_change_password:
                try:
                    allowed = {
                        reverse("password_change"),
                        reverse("password_change_done"),
                        reverse("logout"),
                    }
                except NoReverseMatch:
                    return self.get_response(request)

                if request.path not in allowed:
                    return redirect("password_change")

        return self.get_response(request)
