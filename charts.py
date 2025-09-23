import base64
from datetime import datetime
import matplotlib
from pydantic import BaseModel
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import matplotlib.dates as mdates
from zoneinfo import ZoneInfo
import asyncio
from PIL import Image, ImageDraw, ImageFont

class GenerateChartsRequest(BaseModel):
    collection_ids: list[str]
    earliest_timestamp: int
    latest_timestamp: int
    colors: dict[str, str] = {}

class ChartGenerationParameters:
    def __init__(self, db, GCR: GenerateChartsRequest, token: str, collections: list[dict]):
        self.db = db
        self.GCR = GCR
        self.token = token
        self.collections = collections

class ChartGenerationResponse:
    def __init__(self, chart_data: str, chart_title: str):
        self.chart_data = chart_data
        self.chart_title = chart_title

def handle_colors_dict(colors: dict[str, str], fig, ax) -> None:
    if "background" in colors:
        fig.patch.set_facecolor(colors["background"])
        
    if "accent" in colors:
        ax.set_facecolor(colors["accent"])
        
    if "text" in colors:
        text_color = colors["text"]
        ax.tick_params(colors=text_color)
        ax.xaxis.label.set_color(text_color)
        ax.yaxis.label.set_color(text_color)
        ax.title.set_color(text_color)

async def collections_by_source_pie_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    
    counts = {}
    
    pie_label_color = CGP.GCR.colors.get("text", "black")
    
    for collection in CGP.collections:
        if collection['status'] not in counts:
            counts[collection['status']] = 1
        else:
            counts[collection['status']] += 1
            
    fig, ax = plt.subplots()
    handle_colors_dict(CGP.GCR.colors, fig, ax)
    
    wedges, texts, autotexts = ax.pie(counts.values(), labels=counts.keys(), autopct='%1.1f%%')
    
    for t in texts + autotexts:
        t.set_color(pie_label_color)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)

    return ChartGenerationResponse(base64.b64encode(buf.getvalue()).decode("utf-8"), "Status Distribution")

def _plot_chart_from_data(data: dict[int, str], CGP: ChartGenerationParameters):
    
    if (CGP.GCR.earliest_timestamp + (365 * 24 * 60 * 60 * 1000) <= CGP.GCR.latest_timestamp):
        year_format = " %Y"
    else:
        year_format = ""
        
    dates = [datetime.fromtimestamp(ts / 1000.0, tz=ZoneInfo("America/Los_Angeles")) for ts in data.keys()]

    fig, ax = plt.subplots()
    handle_colors_dict(CGP.GCR.colors, fig, ax)
    
    dot_color = CGP.GCR.colors.get("text", "blue")
    ax.scatter(dates, data.values(), color=dot_color)

    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d' + year_format))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())

    plt.xticks(rotation=45)
    plt.tight_layout()

    buf = BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    
    return base64.b64encode(buf.getvalue()).decode("utf-8")

async def collections_by_time_plot_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    
    counts = {}
    
    for collection in CGP.collections:
        timestamp = collection['time']
        if timestamp not in counts:
            counts[timestamp] = 1
        else:
            counts[timestamp] += 1
    
    return ChartGenerationResponse(_plot_chart_from_data(counts, CGP), "Collections by Time")

async def quantity_by_time_plot_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:

    quantities = {}
    
    for collection in CGP.collections:
        timestamp = collection['time']
        quantity = collection.get('quantity', 0)
        if quantity < 0:
            continue
        if timestamp not in quantities:
            quantities[timestamp] = quantity
        else:
            quantities[timestamp] += quantity

    return ChartGenerationResponse(_plot_chart_from_data(quantities, CGP), "Quantity by Time")

async def collections_by_branch_pie_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    
    counts = {}
    
    pie_label_color = CGP.GCR.colors.get("text", "black")
    
    for collection in CGP.collections:
        branch = CGP.db.get(["branches", collection['branch'], "acronym"])
        quantity = collection.get('quantity', 0)
        if branch not in counts:
            counts[branch] = quantity
        else:
            counts[branch] += quantity
            
    fig, ax = plt.subplots()
    handle_colors_dict(CGP.GCR.colors, fig, ax)
    
    wedges, texts, autotexts = ax.pie(counts.values(), labels=counts.keys(), autopct='%1.1f%%')
    
    for t in texts + autotexts:
        t.set_color(pie_label_color)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)

    return ChartGenerationResponse(base64.b64encode(buf.getvalue()).decode("utf-8"), "Branch Collection Distribution")

def _metrics_image(CGP: ChartGenerationParameters) -> BytesIO:
    
    data = {
        "Total Collections": 0,
        "Total Quantity": 0,
        "Most Collected Source": "N/A",
        "Planned Collections": 0,
        "Collected Collections": 0,
        "Donated Collections": 0,
    }
    
    sources = {}
    
    text_color = CGP.GCR.colors.get("text", "white")
    
    for collection in CGP.collections:
        data["Total Collections"] += 1
        data["Total Quantity"] += max(0, collection.get("quantity", 0))
        
        if collection['status'] == "planned":
            data["Planned Collections"] += 1
        elif collection['status'] == "collected":
            data["Collected Collections"] += 1
        elif collection['status'] == "donated":
            data["Donated Collections"] += 1
        
        source = collection.get("source", "Unknown").lower().strip()
        if source not in sources:
            sources[source] = 0
        sources[source] += 1
        if data["Most Collected Source"] == "N/A" or sources[source] > sources[data["Most Collected Source"]]:
            data["Most Collected Source"] = source
    
    if data["Total Collections"] != 0:
        data["Most Collected Source"] = " ".join([item.capitalize() for item in data["Most Collected Source"].split()])
    
    img = Image.new("RGB", (400, 400), CGP.GCR.colors.get("background", "black"))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype("static/fonts/Roboto-Medium.ttf", 20)
    for i, (key, value) in enumerate(data.items()):
        text = f"{key}: {value}"
        draw.text((10, 10 + i * 30), text, fill=text_color, font=font)

    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

async def metrics_image(CGP: ChartGenerationParameters) -> ChartGenerationResponse:

    buf = await asyncio.to_thread(_metrics_image, CGP)

    return ChartGenerationResponse(base64.b64encode(buf.getvalue()).decode("utf-8"), "Metrics")