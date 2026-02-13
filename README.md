# Classic Skee Ball (PWA)

A classic, carnival-style skee ball game built as a fast, installable Progressive Web App and hosted on GitHub Pages.

- Forgiving flick controls (mobile) and mouse push + release (desktop)
- Standard and Deluxe modes (Deluxe adds 100 pockets)
- Classic lane rails, jump point, and a real target board with holes
- Ball can score by dropping into a hole, or miss and roll back down
- Mechanical flip-style scoreboard feel (with cascade counting)

## Play
Once you enable GitHub Pages, your game will be available at your repo’s Pages URL.

## How to Run Locally
Because this is a PWA, use a local server (not `file://`).

### Option A - Python
```bash
python3 -m http.server 8000

Open:
	•	http://localhost:8000

Option B - Node

npx serve

Install as an App (PWA)
	•	iOS (Safari): Share -> Add to Home Screen
	•	Android (Chrome): Install App / Add to Home Screen
	•	Desktop (Chrome/Edge): Install icon in the address bar

Project Structure

/
  index.html
  main.js
  manifest.json
  service-worker.js
  icon-192.png
  icon-512.png

GitHub Pages Deploy
	1.	Push files to main
	2.	Repo Settings -> Pages
	3.	Source: Deploy from branch
	4.	Branch: main and folder / (root)
	5.	Save, then open the Pages URL

Modes
	•	Standard: 10 / 20 / 30 / 40 / 50
	•	Deluxe: Standard + two 100 pockets

Roadmap
	•	True split-flap flip digit animation for the scoreboard
	•	Sound pack (clacks, dings, carnival ambience) + mute toggle
	•	Better ball return animations and backboard “clank”
	•	Realistic ring deflections and a little chaos (still fair)
	•	Local high scores (daily + all-time)
	•	Cabinet skins (including an air hockey themed version later)

License

MIT License

Copyright (c) 2026 Pete Lippincott

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


Credits

Built by Pete + friends, with a lot of arcade nostalgia.

