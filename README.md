# 🍬 Candy Crush Retro

A retro pixel-art match-3 browser game inspired by Candy Crush.

## Features
- 8×8 grid, 6 candy types
- Match 3+ candies horizontally or vertically
- Cascade/chain reactions with score multiplier
- Level progression with increasing difficulty
- High score persisted via localStorage
- Fully retro pixel-art aesthetic (Press Start 2P font, CRT scanlines)
- No external dependencies

## How to Play
1. Open `index.html` in any modern browser
2. Click a candy to select it (highlighted with glow)
3. Click an adjacent candy to swap
4. If the swap creates a match of 3+, candies are removed and new ones fall from above
5. Reach the target score before moves run out to advance levels

## Scoring
| Match | Points |
|-------|--------|
| 3 candies | 30 pts |
| 4 candies | 60 pts |
| 5+ candies | 100 pts |

Cascade chains multiply your score!

## Tech Stack
- HTML5 + CSS3 + Vanilla JavaScript
- Google Fonts: Press Start 2P
- No build step required
- Works in all modern browsers

## Deployment
```bash
# Docker
docker build -t candy-crush-retro .
docker run -p 8080:80 candy-crush-retro
```
