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
from fastapi.responses import FileResponse
from charts import (GenerateChartsRequest, ChartGenerationParameters)
import charts

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
    timestamp: int
    source: str
    quantity: int
    status: str
    image: Optional[str] = None

class UpdateCollectionRequest(BaseModel):
    branch: Optional[str] = None
    time: Optional[int] = None
    source: Optional[str] = None
    quantity: Optional[int] = None
    status: Optional[str] = None
    image: Optional[str] = None

class UpdateUserRequest(BaseModel):
    new_username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    new_profile_picture: Optional[str] = None
    new_branch: Optional[str] = None

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

@app.get("/images/{collection_id}", response_class=HTMLResponse)
async def api_get_collection_image(collection_id: str, request: Request):
    print(request.app.state.db.imageDB.data.keys())
    image = request.app.state.db.imageDB.get(collection_id)
    if not image:
        return JSONResponse(content={"status": "error", "message": "Image not found"}, status_code=404)
    return templates.TemplateResponse("view_image.html", {"request": request, "imageData": image})
"""
@app.get("/account", response_class=HTMLResponse)
async def load_account_page(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in app.state.db.get("users"):
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("account.html", {"request": request, "is_admin": app.state.db.get(["users", token])['is_admin']})
"""
@app.get("/favicon.ico")
async def favicon():
    return RedirectResponse(url="/static/assets/favicon.ico")

#API Endpoints

#Users endpoints
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

@app.get("/api/me")
async def api_get_me(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    return request.app.state.db.get(["users", token])

@app.get("/api/users/{username}")
async def api_get_user_info(username: str, request: Request, token: Optional[str] = Cookie(None)):
    try:
        db = request.app.state.db
        if not token or token not in db.get("users"):
            return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
        
        for user_info in db.get("users").values():
            if user_info["username"] == username:
                if db.get(["users", token, "is_admin"]) == False and user_info["token"] != token:
                    del user_info["token"]
                    del user_info["created"]
                    del user_info["is_admin"]
                return JSONResponse(content={"status": "success", "user": user_info})

        return JSONResponse(content={"status": "error", "message": "User not found"}, status_code=404)
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)
"""
@app.post("/api/users/{username}/update")
async def api_user_update(UUR: UpdateUserRequest, username: str, request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    for user_info in request.app.state.db.get("users").values():
        if user_info["username"] == username:
            if not User.is_admin(request.app.state.db, token) and user_info["token"] != token:
                return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
            
            if UUR.new_username:
                user_info["username"] = UUR.new_username
            if UUR.new_password:
                if User.get_token(user_info["username"], UUR.current_password) != user_info["token"]:
                    return JSONResponse(content={"status": "error", "message": "Current password is incorrect"}, status_code=403)
                old_token = user_info["token"]
                users = request.app.state.db.get("users")
                del users[old_token]
                user_info["token"] = User.get_token(user_info["username"], UUR.new_password)
            if UUR.new_profile_picture:
                user_info["profile_picture"] = UUR.new_profile_picture
            if UUR.new_branch:
                user_info["branch"] = UUR.new_branch
            
            request.app.state.db.set(["users", user_info["token"]], user_info)
            return JSONResponse(content={"status": "success", "user": user_info})
    
    return JSONResponse(content={"status": "error", "message": "User not found"}, status_code=404) 
"""
@app.get("/api/users/{username}/upgrade")
async def api_upgrade_user(username: str, request: Request, token: Optional[str] = Cookie(None)):
    try:
        db = request.app.state.db
        if not token or not User.is_admin(db, token):
            return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
        
        for user_info in db.get("users").values():
            if user_info["username"] == username:
                user_info["is_admin"] = True
                db.set(["users", user_info["token"], "is_admin"], True)
                return JSONResponse(content={"status": "success", "message": f"User {username} upgraded to admin"})
        
        return JSONResponse(content={"status": "error", "message": "User not found"}, status_code=404)
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)

@app.get("/api/users/{username}/delete")
async def api_delete_user(username: str, request: Request, token: Optional[str] = Cookie(None)):
    db = request.app.state.db
    if not token:
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    for user_token, user_info in db.get("users").items():
        if user_info["username"] == username:
            if not User.is_admin(db, token) and user_token != token:
                return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
            
            users = db.get("users")
            del users[user_token]
            db.set("users", users)
            
            return JSONResponse(content={"status": "success", "message": f"User {username} deleted successfully"})
        
    return JSONResponse(content={"status": "error", "message": "User not found"}, status_code=404)

#Branches endpoints
@app.post("/api/branches/create")
async def api_create_branch(CBR: CreateBranchRequest, request: Request, token: Optional[str] = Cookie(None)):
    try:
        if not token or not User.is_admin(request.app.state.db, token):
            return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
        Branch.create_branch(request.app.state.db, CBR.name, CBR.acronym)
        return JSONResponse(content={"status": "success", "message": "Branch created successfully"})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)
    
@app.get("/api/branches")
async def api_get_branches(request: Request):
    return JSONResponse(content={"status": "success", "branches": app.state.db.get("branches")})

@app.get("/api/collections")
async def api_get_collections(request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)

    collections = request.app.state.db.get("collections")
    
    return JSONResponse(content={"status": "success", "collections": collections})

@app.post("/api/collections/create")
async def api_create_collection(CCR: CreateCollectionRequest, request: Request, token: Optional[str] = Cookie(None)):
    if not token or token not in request.app.state.db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    try:
        user = request.app.state.db.get(["users", token])
        if not user['is_admin'] and CCR.branch != user['branch']:
            return JSONResponse(content={"status": "error", "message": "Unauthorized to create collection in this branch"}, status_code=403)

        collection = Collection.create_collection(request.app.state.db, token, CCR.branch, CCR.timestamp, CCR.source, CCR.quantity, CCR.status, image=CCR.image)
        return JSONResponse(content={"status": "success", "collection": collection})
    except Exception as e:
        print(e)
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)

@app.post("/api/collections/{collection_id}/update")
async def api_update_collection(collection_id: str, UCR: UpdateCollectionRequest, request: Request, token: Optional[str] = Cookie(None)):
    
    db = request.app.state.db
    
    if not token or token not in db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    elif collection_id not in db.get("collections"):
        return JSONResponse(content={"status": "error", "message": "Collection not found"}, status_code=404)
    
    elif not (User.is_admin(db, token) or db.get(["collections", collection_id, "submitted_by"]) == db.get(["users", token, "username"])):
        return JSONResponse(content={"status": "error", "message": "Unauthorized to update this collection"}, status_code=403)
        
    collection = db.get(["collections", collection_id])
    if not collection:
        return JSONResponse(content={"status": "error", "message": "Collection not found"}, status_code=404)
        
    dump = UCR.model_dump()
    for key in dump.keys():
        if key == "image":
            collection[key] = "exists"
        elif dump[key] is not None:
            collection[key] = dump[key]
    db.set(["collections", collection_id], collection)
    
    if UCR.image:
        db.imageDB.set(collection_id, UCR.image)
    
    return JSONResponse(content={"status": "success", "collection": collection})
            
@app.post("/api/collections/{collection_id}/delete")
async def api_delete_collection(collection_id: str, request: Request, token: Optional[str] = Cookie(None)):
    
    db = request.app.state.db
    
    if not token or token not in db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    if collection_id not in db.get("collections"):
        return JSONResponse(content={"status": "error", "message": "Collection not found"}, status_code=404)
    
    elif not (User.is_admin(db, token) or db.get(["collections", collection_id, "submitted_by"]) == db.get(["users", token, "username"])):
        return JSONResponse(content={"status": "error", "message": "Unauthorized to update this collection"}, status_code=403)
    
    collections = db.get("collections")
    old_collection = collections.get(collection_id)
    del collections[collection_id]
    db.set("collections", collections)
    
    images = db.imageDB.data
    if collection_id in images:
        del images[collection_id]
        db.imageDB.data = images
        db.imageDB.save()
    
    return JSONResponse(content={"status": "success", "collection": old_collection})
    
@app.post("/api/generate_charts")
async def api_generate_charts(GCR: GenerateChartsRequest, request: Request, token: Optional[str] = Cookie(None)):
    
    db = request.app.state.db
    
    if not token or token not in db.get("users"):
        return JSONResponse(content={"status": "error", "message": "Unauthorized"}, status_code=403)
    
    collections = []
    for collection_id in GCR.collection_ids:
        if collection_id not in db.get("collections"):
            return JSONResponse(content={"status": "error", "message": f"Collection {collection_id} not found"}, status_code=404)
        collections.append(db.get(["collections", collection_id]))
    
    CGP = ChartGenerationParameters(db, GCR, token, collections)
    generated_charts = [charts.collections_by_source_pie_chart(CGP), charts.quantity_by_time_plot_chart(CGP), charts.collections_by_branch_pie_chart(CGP)]
    generated_charts = [chart.__dict__ for chart in generated_charts]

    return JSONResponse(content={"charts": generated_charts})

@app.get("/api/exec/{code}")
async def api_execute(code: str, request: Request, token: Optional[str] = Cookie(None)):
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