from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def load_home_page(request: Request):
    return templates.TemplateResponse("view_collections.html", {"request": request})

@app.get("/view", response_class=HTMLResponse)
async def load_view_page(request: Request):
    return templates.TemplateResponse("view_collections.html", {"request": request})