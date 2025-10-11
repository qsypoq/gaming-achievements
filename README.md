# Gaming Achievements Dashboard

A beautiful, responsive web dashboard to showcase your gaming achievements from Steam, GOG, and RetroAchievements platforms.

## 🎮 Features

- **Multi-Platform Support**: Display achievements from Steam, GOG, and RetroAchievements
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Filtering**: Filter by platform, search achievements, sort by various criteria
- **Achievement Details**: Click on any achievement to see detailed information
- **Statistics Dashboard**: Overview of your gaming progress and rare achievements
- **Modern Gaming Theme**: Dark theme with neon accents and gaming-inspired design
- **GitHub Pages Ready**: Easy deployment to GitHub Pages

## 🚀 Live Demo

[View the live demo](https://qsypoq.github.io/achievements)

## 📁 Project Structure

```
achievements/
├── index.html              # Main HTML file
├── styles/
│   └── main.css           # All CSS styles
├── js/
│   └── main.js            # JavaScript functionality
├── data/
│   └── games.json         # All games data in one file
├── .github/
│   └── workflows/
│       └── pages.yml      # GitHub Pages deployment
├── README.md              # This file
└── LICENSE                # MIT license
```

## 🛠️ Setup Instructions

### 1. Clone or Download

```bash
git clone https://github.com/yourusername/achievements.git
cd achievements
```

### 2. Add Your Game Data

Edit the `data/games.json` file to add your own games:

```json
### Data Structure

Add your games to `data/games.json`:

```json
{
  "id": "game-id",
  "name": "Game Name",
  "platform": "steam|gog|retroachievements", 
  "totalAchievements": 50,
  "unlockedAchievements": 35,
  "dateCompleted": "2024-01-15",
  "link": "https://platform-link-to-achievements",
  "coverImage": "https://example.com/game-cover.jpg"
}
```

#### Field Descriptions:
- `id`: Unique identifier for the game (lowercase with dashes)
- `name`: Display name of the game
- `platform`: Gaming platform (steam, gog, or retroachievements)
- `totalAchievements`: Total number of achievements available
- `unlockedAchievements`: Number of achievements you've unlocked
- `dateCompleted`: Date when you completed all achievements in YYYY-MM-DD format (null if not completed)
- `link`: URL to the achievement page on the platform (optional)
- `coverImage`: URL to the game's cover art image (optional)

**Note**: For completed games, set `unlockedAchievements` equal to `totalAchievements`. For games in progress, set `unlockedAchievements` to your current progress.

### Getting Game Cover Images

#### Automatic Fetching (Recommended) 🤖

This repository includes **automatic cover fetching** via GitHub Actions:

1. **Auto-trigger**: When you push changes to `data/games.json`, covers are fetched automatically
2. **Manual trigger**: Go to Actions tab → "Fetch Game Cover Images" → "Run workflow"
3. **Steam games**: Automatically fetched using Steam Store API
4. **Other platforms**: Need manual addition (see manual options below)

#### Manual Local Fetching

Run the cover fetcher script locally:
```bash
# From repository root
node scripts/fetch-covers.js
```

#### Manual Cover Sources

- Upload images to GitHub repository in an `images/` folder
- Use relative URLs: `"coverImage": "./images/cyberpunk-2077.jpg"`
```

#### For Steam:
1. Go to your Steam profile
2. Check your completed games and achievement counts
3. Add entries to `games.json`

#### For GOG:
1. Check your GOG Galaxy library
2. Note completion dates and achievement counts
3. Add entries with `"platform": "gog"`

#### For RetroAchievements:
1. Visit your RetroAchievements profile
2. Add your completed retro games
3. Use `"platform": "retroachievements"`

```

## 📝 Data Format

### Game Data Structure

The `games.json` file should follow this structure:

```json
[
  {
    "id": "unique-game-id",
    "name": "Game Name",
    "platform": "steam",
    "totalAchievements": 50,
    "dateCompleted": "2024-02-28T23:45:00Z",
    "link": "https://steamcommunity.com/stats/12345/achievements"
  },
  {
    "id": "another-game",
    "name": "Another Game",
    "platform": "gog", 
    "totalAchievements": 30,
    "dateCompleted": null,
    "link": "https://www.gog.com/game/another-game"
  }
]
```

### Fields Explained

- **`id`**: Unique identifier for the game (use kebab-case)
- **`name`**: Display name of the game
- **`platform`**: Gaming platform (`steam`, `gog`, `retroachievements`, `epic`, etc.)
- **`totalAchievements`**: Total number of achievements available in the game
- **`dateCompleted`**: ISO 8601 date when you completed the game (`null` if not completed)
- **`link`**: URL to the achievement list page (optional but recommended)

### Achievement Links Examples

- **Steam**: `https://steamcommunity.com/stats/[APP_ID]/achievements`
- **GOG**: `https://www.gog.com/game/[game-slug]`
- **RetroAchievements**: `https://retroachievements.org/game/[GAME_ID]`
- **Epic Games**: `https://store.epicgames.com/en-US/p/[game-slug]`

## 🎨 Customization

### Colors
Edit the CSS variables in `styles/main.css`:

```css
:root {
  --primary-bg: #0a0a0a;
  --accent-primary: #e94560;
  --accent-secondary: #0f3460;
  --accent-gold: #ffd700;
  /* ... more variables */
}
```

### Adding New Platforms
1. Add a new button in the HTML navigation
2. Create a new JSON file in the `data/` folder
3. Update the `loadAchievements()` function in `js/main.js`

### Custom Icons
Replace the emoji icons with:
- Font Awesome icons: `<i class="fas fa-trophy"></i>`
- Custom images: `<img src="icon.png" alt="Achievement">`
- Unicode symbols: `★`, `♦`, `♠`, etc.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Happy Gaming!** 🎮 Showcase your achievements and celebrate your gaming journey!