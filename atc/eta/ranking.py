import json
import os
from datetime import datetime

RANKING_FILE = os.path.join(os.path.dirname(__file__), '..', 'ranking.json')


def load_ranking():
    try:
        with open(RANKING_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def add_entry(name, score, landed):
    entries = load_ranking()
    entries.append({
        'name':    name.strip() or 'Anônimo',
        'score':   score,
        'landed':  landed,
        'time':    datetime.now().strftime('%H:%M'),
    })
    entries = sorted(entries, key=lambda e: e['score'], reverse=True)[:50]
    try:
        with open(RANKING_FILE, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return entries
