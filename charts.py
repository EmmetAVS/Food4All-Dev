import base64
from datetime import datetime
import matplotlib
from pydantic import BaseModel
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import matplotlib.dates as mdates
from zoneinfo import ZoneInfo

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

def collections_by_source_pie_chart(CGP: ChartGenerationParameters) -> str:
    
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

def collections_by_time_plot_chart(CGP: ChartGenerationParameters) -> str:
    
    counts = {}
    
    if (CGP.GCR.earliest_timestamp + (365 * 24 * 60 * 60 * 1000) <= CGP.GCR.latest_timestamp):
        year_format = " %Y"
    else:
        year_format = ""
    
    for collection in CGP.collections:
        timestamp = collection['time']
        if timestamp not in counts:
            counts[timestamp] = 1
        else:
            counts[timestamp] += 1
    
    dates = [datetime.fromtimestamp(ts / 1000.0, tz=ZoneInfo("America/Los_Angeles")) for ts in counts.keys()]

    fig, ax = plt.subplots()
    handle_colors_dict(CGP.GCR.colors, fig, ax)
    
    dot_color = CGP.GCR.colors.get("text", "blue")
    ax.scatter(dates, counts.values(), color=dot_color)

    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d' + year_format))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())

    plt.xticks(rotation=45)
    plt.tight_layout()

    buf = BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)

    return ChartGenerationResponse(base64.b64encode(buf.getvalue()).decode("utf-8"), "Collections by Time")

def collections_by_branch_pie_chart(CGP: ChartGenerationParameters) -> str:
    
    counts = {}
    
    pie_label_color = CGP.GCR.colors.get("text", "black")
    
    for collection in CGP.collections:
        branch = CGP.db.get(["branches", collection['branch'], "acronym"])
        if branch not in counts:
            counts[branch] = 1
        else:
            counts[branch] += 1
            
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