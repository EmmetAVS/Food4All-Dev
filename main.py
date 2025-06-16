from typing import Optional
from fastapi import FastAPI
from fastapi import Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from pydantic import BaseModel
from database import Database
from database import User
from database import Branch
from database import Collection
from fastapi.responses import RedirectResponse

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    branch: str

class CreateBranchRequest(BaseModel):
    name: str
    acronym: str

class CreateCollectionRequest(BaseModel):
    branch: str
    timestamp: str
    source: str
    quantity: int
    status: str

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.on_event("startup")
async def startup_event():
    app.state.db = Database("database.json")

@app.get("/", response_class=HTMLResponse)
async def load_home_page(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in app.state.db.get("users"):
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("view_collections.html", {"request": request, "is_admin": app.state.db.get(["users", token])['is_admin']})

@app.get("/view", response_class=HTMLResponse)
async def load_view_page(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in app.state.db.get("users"):
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("view_collections.html", {"request": request, "is_admin": app.state.db.get(["users", token])['is_admin']})

@app.get("/login", response_class=HTMLResponse)
async def load_login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/signup", response_class=HTMLResponse)
async def load_signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse)
async def load_admin_page(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in app.state.db.get("users") or not User.is_admin(app.state.db, token):
        return RedirectResponse(url="/view")
    return templates.TemplateResponse("admin.html", {"request": request, "is_admin": True})

@app.get("/favicon.ico")
async def favicon():
    return RedirectResponse(url="/static/assets/favicon.ico")

#API Endpoints
@app.post("/api/login")
async def api_login(lr: LoginRequest, request: Request):
    try:
        user = User.login(request.app.state.db, lr.username, lr.password)
        return JSONResponse(content={"status": "success", "user": user})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)
    
@app.post("/api/signup")
async def api_signup(sr: SignupRequest, request: Request):
    try:
        user = User.create_user(request.app.state.db, sr.username, sr.password, sr.email, sr.branch)
        return JSONResponse(content={"status": "success", "user": user})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)
    
@app.get("/api/users/{username}")
async def api_get_user_info(username: str, request: Request, token: Optional[str] = Cookie(None)):
    try:
        db = request.app.state.db
        if not token or token not in db.get("users"):
            return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
        
        for user_info in db.get("users").values():
            if user_info["username"] == username:
                del user_info["token"]
                del user_info["created"]
                del user_info["is_admin"]
                return JSONResponse(content={"status": "success", "user": user_info})

        return JSONResponse(content={"status": "error", "message": "User not found"}, status_code=404)
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)

@app.post("/api/create_branch")
async def api_create_branch(cbr: CreateBranchRequest, request: Request, token: Optional[str] = Cookie(None)):
    try:
        if not token or not User.is_admin(request.app.state.db, token):
            return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
        Branch.create_branch(request.app.state.db, cbr.name, cbr.acronym)
        return JSONResponse(content={"status": "success", "message": "Branch created successfully"})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)
    
@app.get("/api/branches")
async def get_branches(request: Request):
    return JSONResponse(content={"status": "success", "branches": app.state.db.get("branches")})

@app.get("/api/collections")
async def get_collections(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)

    collections = request.app.state.db.get("collections")
    
    return JSONResponse(content={"status": "success", "collections": collections})

@app.post("/api/create_collection")
async def create_collection(CCR: CreateCollectionRequest, request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    try:
        user = request.app.state.db.get(["users", token])
        if not user['is_admin'] and CCR.branch != user['branch']:
            return JSONResponse(content={"status": "error", "message": "Unauthorized to create collection in this branch"}, status_code=403)

        collection = Collection.create_collection(request.app.state.db, token, CCR.branch, CCR.timestamp, CCR.source, CCR.quantity, CCR.status)
        return JSONResponse(content={"status": "success", "collection": collection})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)

@app.get("/api/exec/{code}")
async def execute(code: str, request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users") or not User.is_admin(request.app.state.db, token):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    try:
        space = {
            "db": request.app.state.db,
            "User": User,
            "Branch": Branch,
            "Collection": Collection,
            "token": token
        }
        exec("a = " + code, {}, space)
        return JSONResponse(content={"status": "success", "response": space.get("a", "No output")})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)