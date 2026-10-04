# Eruda Mobile Console

[한국어 가이드](README.ko.md)

A SillyTavern extension that adds a toggle for [Eruda](https://github.com/liriliri/eruda), an in-page developer console for mobile browsers.

Open **Extensions → Eruda Mobile Console** and check **Enable debug console**. A gear button appears on the screen (middle right by default; pick another spot under **Button position**); tap it to open Console, Elements, Network and Resources. The setting is remembered, so the console comes back after a reload until you turn it off.

Eruda is loaded from jsDelivr (`cdn.jsdelivr.net/npm/eruda@3`) the first time it is enabled.

## Tips

### Logs are kept while the panel is closed

Once enabled, Eruda records console output, uncaught errors and network requests in the background. Use SillyTavern as usual; when something goes wrong, tap the gear and everything since then is there.

- **Reloading clears the record.** Open the console before you refresh.
- The extension loads first so most startup logs are caught, but a few of SillyTavern's very first lines may be missing.
- Tap **Error** at the top of the Console tab to see only errors.

### Exporting errors

Eruda's console copies one log at a time, so this extension adds an **Export** tab.

1. Open Eruda and tap **Export** in the tab bar.
2. Under **What to export?** pick one (remembered for next time):
   - **Errors & warnings** (default): only the lines that matter. Usually enough.
   - **Everything**: every log line.
   - **What the console shows**: follows the Console tab's level (All/Info/Warning/Error) and search text; search ignores case. The current console filter is shown under this choice; with no filter it is the same as Everything.
3. **N lines to export** shows how many lines will go out.
4. Tap a button; both follow your choice:
   - **Copy**: copies to the clipboard.
   - **Save as file (.txt)**: downloads `st-console-errors-…`, `st-console-…` or `st-console-filtered-…` + `<date>-<time>.txt`. Handy when the log is too long to paste.

Each line has a timestamp, a level and the message; errors include their stack trace. The top lists the browser, screen size, and what was exported (with the console filter, if used).

To make the export safer to share, these are masked automatically:

- The address you reach SillyTavern at: `http://192.168.0.5:8000/scripts/a.js` → `<ST>/scripts/a.js` (the host alone → `<host>`).
- Other IP addresses: `http://192.168.0.10:5000` → `http://<ip>:5000`, IPv6 `[fe80::1]` → `[<ip>]`. `127.0.0.1`, `0.0.0.0` and version numbers like `Chrome/154.0.0.0` are left alone.
- API keys and tokens: `sk-…`, `AIza…`, `ghp_…`, `hf_…`, JWTs → `<secret>`; `Bearer xxx` → `Bearer <secret>`; `?key=xxx` → `?key=<secret>`; `"api_key": "xxx"`, `password=xxx` → the name is kept, the value becomes `<secret>`.

Chat text can't be masked. If "Log prompts to console" is on in SillyTavern's settings and you pick **Everything** or **What the console shows**, a warning appears because chat text may be included. **Errors & warnings** is the safest choice for sharing. Masking only catches common shapes, so skim the export before sharing.

- Only what was recorded since the extension was enabled; reloading clears it. The last 2000 lines are kept.
- If the browser blocks clipboard access, use **Save as file**.

To keep the tab bar short enough for a phone, Sources, Info and Snippets are left out.

### Running JavaScript

1. Open the **Console** tab.
2. Tap the input line at the bottom (marked `>`).
3. Type or paste your code and tap **Execute**. The Enter key may insert a new line instead of running.
4. The result appears in the log above. Tap `▶` to expand objects.

Code runs in the SillyTavern page, just like the PC developer tools console. For example:

```js
SillyTavern.getContext().extensionSettings.st_eruda
```

### Typing code on a phone

- Phone keyboards often turn `"` into curly quotes (`“ ”`), which breaks code. Turn off **smart punctuation / smart quotes** in your keyboard settings.
- For longer code, copy it from somewhere else and paste it.

## Credits

[Eruda](https://github.com/liriliri/eruda) by liriliri, MIT License. It is not bundled here; the browser loads it from jsDelivr when the console is enabled.
