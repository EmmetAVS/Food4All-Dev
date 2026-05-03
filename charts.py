import base64
from datetime import datetime
import matplotlib
from pydantic import BaseModel
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.dates as mdates
from io import BytesIO
from zoneinfo import ZoneInfo
import asyncio

# ── Palette (matches globals.css) ─────────────────────────────────────────────
BG        = '#0d0f14'
BG_CARD   = '#191c27'
BG_BORDER = '#1e2232'
TEXT      = '#eef0f6'
TEXT_2    = '#8b90a8'
TEXT_3    = '#545870'
GREEN     = '#42a870'
YELLOW    = '#c9a830'
BLUE      = '#6070d0'
RED       = '#d95040'
PURPLE    = '#9b6fe0'
PALETTE   = [GREEN, BLUE, YELLOW, RED, PURPLE, '#e07060', '#60a0e0']

plt.rcParams.update({
    'font.family':       'sans-serif',
    'font.size':         10,
    'text.color':        TEXT,
    'axes.labelcolor':   TEXT_2,
    'xtick.color':       TEXT_3,
    'ytick.color':       TEXT_3,
    'axes.edgecolor':    BG_BORDER,
    'figure.facecolor':  BG,
    'axes.facecolor':    BG_CARD,
    'grid.color':        BG_BORDER,
    'grid.linewidth':    0.6,
})


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


def _encode_fig(fig) -> str:
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=130)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


# ── 1. Metrics stat-card grid ──────────────────────────────────────────────────
def _build_metrics(CGP: ChartGenerationParameters) -> str:
    totals   = dict(total=0, quantity=0, donated=0, collected=0, planned=0)
    sources: dict[str, int] = {}
    top_src  = None

    for c in CGP.collections:
        totals['total'] += 1
        totals['quantity'] += max(0, c.get('quantity', 0))
        status = c.get('status', '')
        if status in totals:
            totals[status] += 1
        src = c.get('source', 'Unknown').lower().strip()
        sources[src] = sources.get(src, 0) + 1
        if top_src is None or sources[src] > sources[top_src]:
            top_src = src

    top_src_display = ' '.join(w.capitalize() for w in top_src.split()) if top_src else 'N/A'

    cards = [
        ('Collections',    str(totals['total']),    TEXT),
        ('Quantity (lbs)', str(totals['quantity']),  TEXT),
        ('Top Source',     top_src_display,          TEXT),
        ('Donated',        str(totals['donated']),   GREEN),
        ('Collected',      str(totals['collected']), BLUE),
        ('Planned',        str(totals['planned']),   YELLOW),
    ]

    fig = plt.figure(figsize=(8, 3.0), facecolor=BG)
    gs  = gridspec.GridSpec(2, 3, figure=fig,
                            hspace=0.3, wspace=0.18,
                            left=0.02, right=0.98, top=0.96, bottom=0.04)

    for i, (label, value, color) in enumerate(cards):
        ax = fig.add_subplot(gs[i // 3, i % 3])
        ax.set_facecolor(BG_CARD)
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_edgecolor(BG_BORDER)
            spine.set_linewidth(0.8)

        display = value if len(value) <= 14 else value[:13] + '…'
        fontsize = 20 if len(display) <= 5 else 14 if len(display) <= 10 else 10
        ax.text(0.5, 0.60, display,
                transform=ax.transAxes, ha='center', va='center',
                fontsize=fontsize, fontweight='bold', color=color,
                family='monospace')
        ax.text(0.5, 0.22, label,
                transform=ax.transAxes, ha='center', va='center',
                fontsize=8.5, color=TEXT_2)

    return _encode_fig(fig)

async def metrics_image(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    data = await asyncio.to_thread(_build_metrics, CGP)
    return ChartGenerationResponse(data, 'Metrics')


# ── 2. Line chart (quantity or count over time) ────────────────────────────────
def _build_line_chart(data: dict[int, int], CGP: ChartGenerationParameters,
                      ylabel: str, accent: str) -> str:
    fig, ax = plt.subplots(figsize=(7, 3.4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG_CARD)

    if not data:
        ax.text(0.5, 0.5, 'No data', transform=ax.transAxes,
                ha='center', va='center', color=TEXT_2, fontsize=11)
        ax.set_xticks([])
        ax.set_yticks([])
        return _encode_fig(fig)

    span_ms = CGP.GCR.latest_timestamp - CGP.GCR.earliest_timestamp
    date_fmt = '%b %d %Y' if span_ms >= 365 * 24 * 3_600_000 else '%b %d'

    dates  = [datetime.fromtimestamp(ts / 1000.0, tz=ZoneInfo('America/Los_Angeles'))
              for ts in data]
    values = list(data.values())

    ax.fill_between(dates, values, alpha=0.13, color=accent, zorder=1)
    ax.plot(dates, values, color=accent, linewidth=1.8, zorder=3)
    ax.scatter(dates, values, color=accent, s=34, zorder=4,
               edgecolors=BG_CARD, linewidths=1.2)

    ax.set_ylabel(ylabel, color=TEXT_2, fontsize=8.5, labelpad=5)
    ax.tick_params(axis='both', labelsize=7.5, colors=TEXT_3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter(date_fmt))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=30, ha='right')
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True, nbins=5))

    ax.grid(axis='y', color=BG_BORDER, linewidth=0.6, zorder=0)
    ax.set_axisbelow(True)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_edgecolor(BG_BORDER)
    ax.spines['left'].set_edgecolor(BG_BORDER)

    fig.tight_layout(pad=1.1)
    return _encode_fig(fig)

async def quantity_by_time_plot_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    quantities: dict[int, int] = {}
    for c in CGP.collections:
        q = c.get('quantity', 0)
        if q < 0:
            continue
        ts = c['time']
        quantities[ts] = quantities.get(ts, 0) + q
    data = _build_line_chart(quantities, CGP, 'Quantity (lbs)', GREEN)
    return ChartGenerationResponse(data, 'Quantity by Time')

async def collections_by_time_plot_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    counts: dict[int, int] = {}
    for c in CGP.collections:
        ts = c['time']
        counts[ts] = counts.get(ts, 0) + 1
    data = _build_line_chart(counts, CGP, 'Collections', BLUE)
    return ChartGenerationResponse(data, 'Collections by Time')


# ── 3. Branch donut chart ──────────────────────────────────────────────────────
async def collections_by_branch_pie_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    counts: dict[str, int] = {}
    for c in CGP.collections:
        branch = CGP.db.get(['branches', c['branch'], 'acronym']) or c['branch']
        q = max(0, c.get('quantity', 0))
        counts[branch] = counts.get(branch, 0) + q

    fig, ax = plt.subplots(figsize=(5, 4), facecolor=BG)
    ax.set_facecolor(BG)

    if not counts:
        ax.text(0.5, 0.5, 'No data', transform=ax.transAxes,
                ha='center', va='center', color=TEXT_2, fontsize=11)
        ax.set_xticks([])
        ax.set_yticks([])
        return ChartGenerationResponse(_encode_fig(fig), 'Branch Distribution')

    labels = list(counts.keys())
    values = list(counts.values())
    colors = PALETTE[:len(labels)]

    wedges, _, autotexts = ax.pie(
        values,
        labels=None,
        colors=colors,
        autopct='%1.0f%%',
        pctdistance=0.78,
        startangle=90,
        wedgeprops={'width': 0.52, 'edgecolor': BG, 'linewidth': 2.5},
    )
    for at in autotexts:
        at.set_color(TEXT)
        at.set_fontsize(8.5)
        at.set_fontweight('bold')

    ax.legend(
        wedges, labels,
        loc='lower center',
        ncol=min(len(labels), 4),
        bbox_to_anchor=(0.5, -0.08),
        frameon=False,
        fontsize=8.5,
        labelcolor=TEXT_2,
    )

    fig.tight_layout(pad=0.8)
    return ChartGenerationResponse(_encode_fig(fig), 'Branch Distribution')


# ── Status pie (kept for compat) ───────────────────────────────────────────────
async def collections_by_source_pie_chart(CGP: ChartGenerationParameters) -> ChartGenerationResponse:
    counts: dict[str, int] = {}
    for c in CGP.collections:
        s = c.get('status', 'unknown')
        counts[s] = counts.get(s, 0) + 1

    color_map = {'donated': GREEN, 'collected': BLUE, 'planned': YELLOW}
    colors = [color_map.get(k, TEXT_3) for k in counts]

    fig, ax = plt.subplots(figsize=(5, 4), facecolor=BG)
    ax.set_facecolor(BG)
    wedges, _, autotexts = ax.pie(
        counts.values(),
        labels=None,
        colors=colors,
        autopct='%1.0f%%',
        pctdistance=0.78,
        startangle=90,
        wedgeprops={'width': 0.52, 'edgecolor': BG, 'linewidth': 2.5},
    )
    for at in autotexts:
        at.set_color(TEXT)
        at.set_fontsize(8.5)
        at.set_fontweight('bold')

    ax.legend(wedges, counts.keys(),
              loc='lower center', ncol=3, bbox_to_anchor=(0.5, -0.08),
              frameon=False, fontsize=8.5, labelcolor=TEXT_2)

    fig.tight_layout(pad=0.8)
    return ChartGenerationResponse(_encode_fig(fig), 'Status Distribution')
