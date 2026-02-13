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

MIT (add a LICENSE file if you want it explicit)

Credits

Built by Pete + friends, with a lot of arcade nostalgia.

