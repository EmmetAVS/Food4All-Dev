from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import RedirectResponse
from database import User
import subprocess

_templates = Jinja2Templates(directory="templates")
_version = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()


def is_legacy(request: Request) -> bool:
    host = request.headers.get("host", "").split(":")[0].lower()
    return host.startswith("old.")


def home(request: Request, token, db):
    if not token or token not in db.get("users"):
        return RedirectResponse(url="/login")
    return _templates.TemplateResponse("view_collections.html", {
        "version": _version, "request": request,
        "is_admin": db.get(["users", token])["is_admin"],
    })


def view():
    return RedirectResponse(url="/")


def login(request: Request):
    return _templates.TemplateResponse("login.html", {"version": _version, "request": request})


def signup(request: Request):
    return _templates.TemplateResponse("signup.html", {"version": _version, "request": request})


def admin(request: Request, token, db):
    if not token or token not in db.get("users") or not User.is_admin(db, token):
        return RedirectResponse(url="/view")
    return _templates.TemplateResponse("admin.html", {
        "version": _version, "request": request, "is_admin": True,
    })

