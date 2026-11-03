"""Local-only BridgeUX dev server and Ollama bridge. No remote services."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
MODEL = "hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M"

def local_fallback(task, text, language="English"):
    text = text.strip()
    if language == "हिन्दी":
        if not text:
            return "थोड़ा संदर्भ लिखें, फिर मैं मदद करने की कोशिश करूंगा।"
        if task == "steps":
            return "1. सवाल ध्यान से पढ़ें।\n2. मांगी गई जानकारी जुटाएं।\n3. अपने शब्दों में छोटा जवाब लिखें।\n4. आगे बढ़ने से पहले उसे जांचें। केवल सही जानकारी दें।"
        if task == "simplify":
            return "सरल शब्दों में: " + text + "\n\nयह सीमित ऑफ़लाइन सहायता है। मूल निर्देश से मिलाकर जांचें।"
        return "स्थानीय AI मॉडल अभी उपलब्ध नहीं है। निजी तथ्य न गढ़ें; अपनी जानकारी खुद जांचें।"
    if not text:
        return "Add a little context first, then I can help you work through it."
    if task == "steps":
        return "1. Read the question carefully.\n2. Gather the information it asks for.\n3. Write a short answer in your own words.\n4. Review it before continuing.\n\nUse only details you know are true; leave anything uncertain blank and ask the organization for help."
    if task == "simplify":
        return "In simpler words: " + text + "\n\nI’m using a basic offline fallback. Check this wording against the original before relying on it."
    if task == "explain":
        return "I can help explain this, but the local AI model is unavailable. Install Ollama with Qwen3.5 4B, or ask the organization that provided this form. Original text: " + text
    return "I can help you plan an answer, but I should not make up personal details. Think about: what is being asked, which facts you can confirm, and what you want the reader to understand. Write a draft in your own words, then review it for accuracy."

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/local-assist":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 2 or size > 12000:
                raise ValueError("Keep the request under 12 KB.")
            body = json.loads(self.rfile.read(size))
            task, text = body.get("task", "help"), body.get("text", "")
            language = body.get("language", "English")
            if task not in {"help", "simplify", "explain", "steps"} or not isinstance(text, str) or language not in {"English", "हिन्दी"}:
                raise ValueError("Invalid task or text.")
            text = text[:8000]
            prompt = ("You are BridgeUX, a careful local accessibility assistant. Reply in " + ("Hindi" if language == "हिन्दी" else "English") + ". Help the user understand a form or draft an answer. Never invent personal facts, eligibility rules, deadlines, or requirements. Keep the original meaning. Clearly say when you are unsure. The user must review and choose any answer.\nTask: " + task + "\nUser text: " + text)
            req = Request("http://127.0.0.1:11434/api/generate", data=json.dumps({"model": MODEL, "prompt": prompt, "stream": False, "think": False, "options": {"temperature": 0.2}}).encode(), headers={"Content-Type": "application/json"}, method="POST")
            with urlopen(req, timeout=70) as resp:
                result = json.loads(resp.read())
            answer = result.get("response", "").strip()
            if not answer:
                raise ValueError("The local model returned an empty answer.")
            self.reply({"answer": answer, "source": "local Ollama · " + MODEL})
        except (URLError, TimeoutError, HTTPError, json.JSONDecodeError, ValueError, OSError) as exc:
            why = "Qwen3.5 is not available from local Ollama yet. Showing a basic offline helper instead."
            self.reply({"answer": local_fallback(task if 'task' in locals() else "help", text if 'text' in locals() else "", language if 'language' in locals() else "English"), "source": why})

    def do_GET(self):
        if self.path == "/local-status":
            try:
                with urlopen("http://127.0.0.1:11434/api/tags", timeout=2) as resp:
                    tags = json.loads(resp.read()).get("models", [])
                names = [m.get("name", "") for m in tags]
                ready = any(n == MODEL or n.startswith(MODEL + ":") for n in names)
                self.reply({"available": True, "ready": ready, "model": MODEL, "installed": names})
            except Exception:
                self.reply({"available": False, "ready": False, "model": MODEL, "installed": []})
            return
        super().do_GET()

    def reply(self, data):
        encoded = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self):
        self.send_error(405)

    def log_message(self, fmt, *args):
        # Do not log request content or user text.
        if self.path != "/local-assist":
            super().log_message(fmt, *args)

if __name__ == "__main__":
    print("BridgeUX local server: http://127.0.0.1:8765 (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
