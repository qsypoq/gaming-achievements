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

[View the live demo](https://yourusername.github.io/achievements) (Replace with your actual GitHub Pages URL)

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

For non-Steam games or manual override:

#### Option 1: Steam Games
For Steam games, you can use the Steam Web API for vertical covers:
```
https://cdn.akamai.steamstatic.com/steam/apps/STEAM_APP_ID/library_600x900_2x.jpg
```

Alternative Steam image formats:
- **Vertical Cover (Recommended)**: `library_600x900_2x.jpg` - Perfect for game case style
- **Header Image**: `header.jpg` - Horizontal banner (460x215)
- **Capsule**: `capsule_231x87.jpg` - Small horizontal thumbnail

#### Option 2: RAWG.io API (Free)
1. Register at https://rawg.io/apidocs
2. Search for games: `https://api.rawg.io/api/games?key=YOUR_KEY&search=game-name`
3. Use the `background_image` from the response

#### Option 3: Manual Collection
- Right-click and save images from Steam store pages
- Use GOG.com game gallery images
- Download from official game websites

#### Option 4: Host Your Own
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

### 3. Deploy to GitHub Pages

1. Push to GitHub:
```bash
git add .
git commit -m "Initial achievement dashboard"
git push origin main
```

2. Enable GitHub Pages:
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch
   - Click "Save"

3. Your site will be available at: `https://yourusername.github.io/repositoryname`

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

### Rarity Categories

- **Common**: >50% of players have this achievement
- **Uncommon**: 20-50% of players
- **Rare**: 5-20% of players  
- **Very Rare**: 1-5% of players
- **Legendary**: <1% of players

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

## 🔧 Advanced Features

### API Integration
To automatically fetch achievements:

1. **Steam Web API**: Use Steam's Web API to fetch user achievements
2. **GOG Galaxy**: No public API, requires manual data entry
3. **RetroAchievements**: Use their Web API for automatic updates

Example Steam API integration:
```javascript
const STEAM_API_KEY = 'your-api-key';
const STEAM_ID = 'your-steam-id';

async function fetchSteamAchievements() {
  const response = await fetch(
    `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_API_KEY}&steamid=${STEAM_ID}`
  );
  return await response.json();
}
```

### Local Storage
Add this to save user preferences:

```javascript
// Save current filters
localStorage.setItem('achievementFilters', JSON.stringify({
  platform: currentPlatform,
  sort: currentSort,
  rarity: currentRarity
}));

// Load saved filters
const savedFilters = JSON.parse(localStorage.getItem('achievementFilters') || '{}');
```

## 📱 Mobile Optimization

The dashboard is fully responsive and includes:
- Touch-friendly navigation
- Optimized card layouts for mobile
- Swipe gestures for achievement browsing
- Compressed images for faster loading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b new-feature`
3. Commit changes: `git commit -m "Add new feature"`
4. Push to branch: `git push origin new-feature`
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎯 Roadmap

- [ ] Steam Web API integration
- [ ] RetroAchievements API integration
- [ ] Achievement comparison with friends
- [ ] Export achievements to PDF/image
- [ ] Dark/light theme toggle
- [ ] Achievement streaks and statistics
- [ ] Social sharing features

## 💡 Tips

- **Image Optimization**: Use services like Unsplash or compress images for faster loading
- **Regular Updates**: Update your achievement data regularly to keep the dashboard current
- **Backup Data**: Keep backups of your JSON files
- **Performance**: For large collections, consider implementing pagination

## 🆘 Troubleshooting

### Common Issues

1. **Images not loading**: Check image URLs and CORS policies
2. **GitHub Pages not updating**: Check the Actions tab for deployment status
3. **Mobile layout issues**: Test on different screen sizes
4. **Achievement data not showing**: Validate JSON format

### Support

- Create an issue on GitHub
- Check browser console for error messages
- Ensure all JSON files are properly formatted

---

**Happy Gaming!** 🎮 Showcase your achievements and celebrate your gaming journey!