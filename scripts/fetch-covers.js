#!/usr/bin/env node

/**
 * Game Cover & Name Fetcher Script
 * Automatically fetches game names and cover images for games in platform-specific data files
 * 
 * Usage:
 *   node scripts/fetch-covers.js          # Fetch missing only
 *   node scripts/fetch-covers.js --force  # Re-download all covers
 * 
 * Features:
 * - Fetches missing game names from Steam and RetroAchievements APIs
 * - Fetches Steam covers automatically using Steam Store API
 * - Supports multiple Steam image formats (library, header)
 * - Validates image URLs before adding them
 * - Preserves existing names and covers
 * - Works with separate platform files (steam.json, gog.json, retroachievements.json)
 * - Provides detailed logging
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Parse command line arguments
const FORCE_REFRESH = process.argv.includes('--force') || process.argv.includes('-f');

// Configuration
const STEAM_SEARCH_API = 'https://store.steampowered.com/api/storesearch/';
const STEAM_CDN_BASE = 'https://cdn.akamai.steamstatic.com/steam/apps/';
const COVERS_DIR = path.join(process.cwd(), 'assets', 'covers');

// RetroAchievements API configuration
// API key can be set via environment variable or will prompt for manual entry
const RA_API_KEY = process.env.RA_KEY || '';
const RA_API_BASE = 'https://retroachievements.org/API/API_GetGame.php';
const RA_CONSOLES_API = 'https://retroachievements.org/API/API_GetConsoleIDs.php';
const RA_IMAGE_BASE = 'https://media.retroachievements.org';

// Steam image formats (in order of preference)
const STEAM_IMAGE_FORMATS = [
    'header.jpg',                   // Standard header (460x215) - preferred
];

class CoverFetcher {
    constructor() {
        this.platformData = {
            steam: [],
            gog: [],
            retroachievements: []
        };
        this.updated = {
            steam: false,
            gog: false,
            retroachievements: false
        };
        this.raConsoles = null; // Cache for RetroAchievements console list
        this.ensureCoversDirectory();
    }

    ensureCoversDirectory() {
        // Create main covers directory
        if (!fs.existsSync(COVERS_DIR)) {
            fs.mkdirSync(COVERS_DIR, { recursive: true });
            console.log(`📁 Created covers directory: ${COVERS_DIR}\n`);
        }
        
        // Create platform-specific directories
        const platforms = ['steam', 'gog', 'retroachievements'];
        platforms.forEach(platform => {
            const platformDir = path.join(COVERS_DIR, platform);
            if (!fs.existsSync(platformDir)) {
                fs.mkdirSync(platformDir, { recursive: true });
                console.log(`📁 Created platform directory: ${platformDir}`);
            }
        });
        console.log();
    }

    async run() {
        try {
            console.log('🎮 Game Cover & Name Fetcher v1.1');
            console.log('====================================\n');

            this.loadGamesData();
            await this.fetchRAConsoles(); // Pre-fetch console list
            await this.fetchAllMissingData();
            this.saveGamesData();
            this.printSummary();

        } catch (error) {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        }
    }

    loadGamesData() {
        try {
            const platforms = ['steam', 'gog', 'retroachievements'];
            let totalGames = 0;
            
            platforms.forEach(platform => {
                const dataPath = path.join(process.cwd(), 'data', `${platform}.json`);
                if (fs.existsSync(dataPath)) {
                    this.platformData[platform] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                    totalGames += this.platformData[platform].length;
                    console.log(`📋 Loaded ${this.platformData[platform].length} ${platform} games`);
                } else {
                    console.log(`⚠️  No ${platform}.json found, creating empty file`);
                    this.platformData[platform] = [];
                }
            });
            
            console.log(`📋 Total: ${totalGames} games across all platforms\n`);
        } catch (error) {
            throw new Error(`Failed to load games data: ${error.message}`);
        }
    }

    async fetchAllMissingData() {
        console.log('🔍 Starting data fetch (names and covers)...\n');

        for (const platform of Object.keys(this.platformData)) {
            const games = this.platformData[platform];
            if (games.length === 0) continue;
            
            console.log(`\n=== Processing ${platform.toUpperCase()} (${games.length} games) ===\n`);
            
            for (let i = 0; i < games.length; i++) {
                const game = games[i];
                
                // Handle RetroAchievements games with subsets
                if (platform === 'retroachievements' && game.subsets && typeof game.subsets === 'object') {
                    console.log(`[${i + 1}/${games.length}] Game ${game.platformId} with ${Object.keys(game.subsets).length} subsets`);
                    
                    // Fetch parent game data once for all subsets
                    const parentGameData = await this.fetchRetroAchievementsGameData(game.platformId);
                    if (!parentGameData) {
                        console.log(`  ⚠️  Could not fetch parent game data for ${game.platformId}`);
                    }
                    
                    const subsetEntries = Object.entries(game.subsets);
                    for (let j = 0; j < subsetEntries.length; j++) {
                        const [key, subset] = subsetEntries[j];
                        const isBase = key === 'Base';
                        const setDisplayName = subset.name || `${key} (${isBase ? game.platformId : key})`;
                        console.log(`  [Subset ${j + 1}/${subsetEntries.length}] ${setDisplayName}`);
                        
                        let needsUpdate = false;
                        
                        // Fetch missing name
                        if (isBase) {
                            // Base name is stored at parent level
                            if (!game.name) {
                                console.log(`    📝 Fetching parent name...`);
                                if (parentGameData && parentGameData.Title) {
                                    // Get clean parent title (strip content inside ~ like ~Hack~ or ~Subset~)
                                    let parentTitle = parentGameData.Title;
                                    parentTitle = parentTitle.replace(/~[^~]*~/g, '').trim();
                                    game.name = parentTitle;
                                    this.updated[platform] = true;
                                    needsUpdate = true;
                                    console.log(`    ✅ Name added: ${game.name}`);
                                } else {
                                    console.log(`    ❌ Could not fetch name`);
                                }
                            }
                            
                            // Fetch console (stored at parent level)
                            if (!game.console) {
                                if (parentGameData && parentGameData.ConsoleID) {
                                    const consoleName = this.getConsoleName(parentGameData.ConsoleID);
                                    if (consoleName) {
                                        game.console = consoleName;
                                        this.updated[platform] = true;
                                        needsUpdate = true;
                                        console.log(`    🎮 Console: ${game.console}`);
                                    }
                                }
                            }
                        } else {
                            // Non-base subsets store just the subset name
                            if (!subset.name) {
                                console.log(`    📝 Fetching subset name...`);
                                // Fetch subset data to get its name
                                const subsetGameData = await this.fetchRetroAchievementsGameData(key);
                                if (subsetGameData && subsetGameData.Title) {
                                    // Extract subset name from title (e.g., "Game ~Subset - Bonus~" -> "Bonus")
                                    let subsetTitle = subsetGameData.Title;
                                    const subsetMatch = subsetTitle.match(/~Subset\s*[-–]\s*([^~]+)~/i);
                                    if (subsetMatch) {
                                        subset.name = subsetMatch[1].trim();
                                    } else {
                                        // Fallback: clean the title and use it
                                        subset.name = subsetTitle.replace(/~[^~]*~/g, '').trim();
                                    }
                                    this.updated[platform] = true;
                                    needsUpdate = true;
                                    console.log(`    ✅ Name added: ${subset.name}`);
                                } else {
                                    console.log(`    ❌ Could not fetch name`);
                                }
                            }
                        }
                        
                        // Fetch missing cover for subset
                        if (!subset.coverImage || FORCE_REFRESH) {
                            if (FORCE_REFRESH && subset.coverImage) {
                                console.log(`    🔄 Force refreshing cover...`);
                            } else {
                                console.log(`    🖼️  Fetching cover image...`);
                            }
                            
                            let coverUrl;
                            if (!isBase && subset.coverId) {
                                // Non-base subsets use coverId from JSON
                                coverUrl = `${RA_IMAGE_BASE}/Images/${subset.coverId}.png`;
                                console.log(`    🖼️  Using subset coverId: ${coverUrl}`);
                            } else if (parentGameData && parentGameData.ImageIcon) {
                                // Base subsets use parent game's icon
                                coverUrl = `${RA_IMAGE_BASE}${parentGameData.ImageIcon}`;
                                console.log(`    🖼️  Found icon: ${coverUrl}`);
                            }
                            
                            if (coverUrl) {
                                const ext = coverUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i)?.[1] || 'png';
                                // Use different filename for base vs subset
                                const fileId = isBase ? game.platformId : key;
                                const localPath = await this.downloadImage(coverUrl, platform, fileId, `cover.${ext}`);
                                if (localPath) {
                                    subset.coverImage = localPath;
                                    this.updated[platform] = true;
                                    needsUpdate = true;
                                    console.log(`    ✅ Cover added!`);
                                } else {
                                    console.log(`    ❌ Could not download cover`);
                                }
                            } else {
                                console.log(`    ❌ No icon found`);
                            }
                        } else if (!needsUpdate) {
                            console.log(`    ✅ Already complete`);
                        }
                        
                        // Be respectful to APIs
                        await this.delay(300);
                    }
                    console.log();
                    continue;
                }
                
                const displayName = game.name || `${platform} game ${game.platformId}`;
                console.log(`[${i + 1}/${games.length}] ${displayName}`);

                let needsUpdate = false;

                // Fetch missing name
                if (!game.name) {
                    console.log(`  📝 Fetching game name...`);
                    const name = await this.fetchGameName(game, platform);
                    if (name) {
                        game.name = name;
                        this.updated[platform] = true;
                        needsUpdate = true;
                        console.log(`  ✅ Name added: ${name}`);
                    } else {
                        console.log(`  ❌ Could not fetch name`);
                    }
                }

                // Fetch missing cover (or all covers if --force)
                if (!game.coverImage || FORCE_REFRESH) {
                    if (FORCE_REFRESH && game.coverImage) {
                        console.log(`  🔄 Force refreshing cover...`);
                    } else {
                        console.log(`  🖼️  Fetching cover image...`);
                    }
                    const success = await this.fetchGameCover(game, platform);
                    if (success) {
                        this.updated[platform] = true;
                        needsUpdate = true;
                        console.log(`  ✅ Cover added!`);
                    } else {
                        console.log(`  ❌ No cover found`);
                    }
                } else if (!needsUpdate) {
                    console.log(`  ✅ Already complete`);
                }

                console.log();

                // Be respectful to APIs
                await this.delay(300);
            }
        }
    }

    async fetchGameName(game, platform) {
        switch (platform) {
            case 'steam':
                return await this.fetchSteamGameName(game.platformId);
            case 'gog':
                console.log(`    ⚠️  GOG - manual name needed`);
                return null;
            case 'retroachievements':
                return await this.fetchRetroAchievementsGameName(game.platformId);
            default:
                console.log(`    ⚠️  Unknown platform: ${platform}`);
                return null;
        }
    }

    async fetchSteamGameName(appId) {
        return new Promise((resolve) => {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result[appId] && result[appId].success && result[appId].data) {
                            resolve(result[appId].data.name);
                        } else {
                            console.log(`    ⚠️  Steam API returned no data for ${appId}`);
                            resolve(null);
                        }
                    } catch (e) {
                        console.log(`    ⚠️  Parse error: ${e.message}`);
                        resolve(null);
                    }
                });
            }).on('error', (e) => {
                console.log(`    ⚠️  Request error: ${e.message}`);
                resolve(null);
            });
        });
    }

    async fetchRetroAchievementsGameName(gameId) {
        const gameData = await this.fetchRetroAchievementsGameData(gameId);
        if (gameData && gameData.Title) {
            // Strip content inside ~ (like ~Hack~ or ~Subset~)
            let title = gameData.Title;
            title = title.replace(/~[^~]*~/g, '').trim();
            return title;
        }
        return null;
    }

    async fetchRetroAchievementsGameData(gameId) {
        if (!RA_API_KEY) {
            console.log(`    ⚠️  No RA_KEY set. Set the RA_KEY environment variable.`);
            return null;
        }

        return new Promise((resolve) => {
            const url = `${RA_API_BASE}?i=${gameId}&y=${RA_API_KEY}`;

            const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (e) {
                        console.log(`    ⚠️  Parse error: ${e.message}`);
                        resolve(null);
                    }
                });
            });
            
            req.on('error', (e) => {
                console.log(`    ⚠️  Request error: ${e.message}`);
                resolve(null);
            });
            
            req.setTimeout(15000, () => {
                console.log(`    ⚠️  Request timeout for ${gameId}`);
                req.destroy();
                resolve(null);
            });
        });
    }

    async fetchRAConsoles() {
        if (!RA_API_KEY) {
            console.log('⚠️  No RA_KEY set, skipping console fetch\n');
            return;
        }

        console.log('🎮 Fetching RetroAchievements console list...');
        
        return new Promise((resolve) => {
            const url = `${RA_CONSOLES_API}?y=${RA_API_KEY}`;

            const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (Array.isArray(result)) {
                            this.raConsoles = result;
                            console.log(`✅ Loaded ${result.length} consoles\n`);
                        }
                        resolve();
                    } catch (e) {
                        console.log(`⚠️  Parse error: ${e.message}\n`);
                        resolve();
                    }
                });
            });
            
            req.on('error', (e) => {
                console.log(`⚠️  Request error: ${e.message}\n`);
                resolve();
            });
            
            req.setTimeout(15000, () => {
                console.log('⚠️  Console fetch timeout\n');
                req.destroy();
                resolve();
            });
        });
    }

    getConsoleName(consoleId) {
        if (!this.raConsoles || !consoleId) return null;
        const console = this.raConsoles.find(c => c.ID === consoleId);
        return console ? console.Name : null;
    }

    async fetchGameCover(game, platform) {
        switch (platform) {
            case 'steam':
                return await this.fetchSteamCover(game, platform);
            case 'gog':
                console.log(`    📝 GOG - manual cover needed`);
                return false;
            case 'retroachievements':
                return await this.fetchRetroAchievementsCover(game, platform);
            default:
                console.log(`    ❓ Unknown platform: ${platform}`);
                return false;
        }
    }

    async fetchRetroAchievementsCover(game, platform) {
        try {
            const gameId = game.platformId;
            console.log(`  🔍 Fetching icon from RetroAchievements API...`);
            
            const gameData = await this.fetchRetroAchievementsGameData(gameId);
            
            if (gameData && gameData.ImageIcon) {
                // Build the full image URL using ImageIcon (set/subset icon)
                const coverUrl = `${RA_IMAGE_BASE}${gameData.ImageIcon}`;
                console.log(`  🖼️  Found icon: ${coverUrl}`);
                
                // Determine file extension from URL
                const ext = coverUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i)?.[1] || 'png';
                const localPath = await this.downloadImage(coverUrl, platform, game.platformId, `cover.${ext}`);
                if (localPath) {
                    game.coverImage = localPath;
                    console.log(`  💾 Downloaded to: ${localPath}`);
                    return true;
                }
            }
            
            console.log(`  ❌ No icon found for game ${gameId}`);
            return false;
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            return false;
        }
    }

    async fetchSteamCover(game, platform) {
        try {
            // Try to get App ID from platformId first, then link, then search
            let appId = game.platformId || this.extractSteamAppId(game.link);
            
            if (appId) {
                console.log(`  📋 App ID: ${appId}`);
            } else {
                console.log(`  🔍 Searching Steam store...`);
                appId = await this.searchSteamStore(game.name);
                
                if (appId) {
                    console.log(`  📋 App ID from search: ${appId}`);
                } else {
                    console.log(`  ❌ Steam App ID not found`);
                    return false;
                }
            }

            // Try standard CDN endpoints first
            const cdnEndpoints = [
                'https://cdn.akamai.steamstatic.com/steam/apps/',
                'https://cdn.cloudflare.steamstatic.com/steam/apps/',
                'https://steamcdn-a.akamaihd.net/steam/apps/'
            ];

            for (const format of STEAM_IMAGE_FORMATS) {
                for (const cdnBase of cdnEndpoints) {
                    const imageUrl = `${cdnBase}${appId}/${format}`;
                    const cdnName = cdnBase.includes('akamai') ? 'akamai' : 
                                    cdnBase.includes('cloudflare') ? 'cloudflare' : 'legacy';
                    console.log(`  🖼️  Testing: ${format} (${cdnName})`);

                    if (await this.checkImageExists(imageUrl)) {
                        const localPath = await this.downloadImage(imageUrl, platform, game.platformId, format);
                        if (localPath) {
                            game.coverImage = localPath;
                            console.log(`  💾 Downloaded to: ${localPath}`);
                            return true;
                        }
                    }
                }
            }

            // Try Fastly CDN with hash discovery (new Steam CDN format)
            console.log(`  🔄 Trying Fastly CDN...`);
            const fastlyUrl = await this.discoverFastlyUrl(appId);
            if (fastlyUrl) {
                console.log(`  🖼️  Testing: header.jpg (fastly)`);
                const localPath = await this.downloadImage(fastlyUrl, platform, game.platformId, 'header.jpg');
                if (localPath) {
                    game.coverImage = localPath;
                    console.log(`  💾 Downloaded to: ${localPath}`);
                    return true;
                }
            }

            // Last resort: try to get any screenshot from the game
            console.log(`  🔄 Trying screenshots as last resort...`);
            const screenshotPath = await this.tryScreenshotFallback(appId, game, platform);
            if (screenshotPath) {
                game.coverImage = screenshotPath;
                return true;
            }

            console.log(`  ❌ No valid images found for App ID: ${appId}`);
            return false;

        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            return false;
        }
    }

    async discoverFastlyUrl(appId) {
        // Fetch the Steam store page to find the Fastly CDN hash
        return new Promise((resolve) => {
            const url = `https://store.steampowered.com/app/${appId}/`;
            
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // Look for Fastly CDN URLs in the page
                        const fastlyPattern = /https:\/\/shared\.fastly\.steamstatic\.com\/store_item_assets\/steam\/apps\/\d+\/([a-f0-9]+)\/header\.jpg/;
                        const match = data.match(fastlyPattern);
                        if (match) {
                            resolve(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/${match[1]}/header.jpg`);
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }

    extractSteamAppId(link) {
        if (!link) return null;
        
        // Try different Steam URL patterns
        const patterns = [
            /\/stats\/(\d+)\//,           // steamcommunity.com/stats/APPID/
            /\/app\/(\d+)\//,             // store.steampowered.com/app/APPID/
            /\/achievements\/(\d+)/       // steamcommunity.com/achievements/APPID
        ];

        for (const pattern of patterns) {
            const match = link.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    async searchSteamStore(gameName) {
        return new Promise((resolve) => {
            const searchUrl = `${STEAM_SEARCH_API}?term=${encodeURIComponent(gameName)}&l=english&cc=US`;

            https.get(searchUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.items && result.items.length > 0) {
                            // Find exact match or use first result
                            const exactMatch = result.items.find(item => 
                                item.name && item.name.toLowerCase() === gameName.toLowerCase()
                            );
                            resolve(exactMatch ? exactMatch.id : result.items[0].id);
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        console.log(`    ⚠️  Parse error: ${e.message}`);
                        resolve(null);
                    }
                });
            }).on('error', (e) => {
                console.log(`    ⚠️  Request error: ${e.message}`);
                resolve(null);
            });
        });
    }

    async fetchGameInfo(appId) {
        return new Promise((resolve) => {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result[appId] && result[appId].success) {
                            resolve({
                                name: result[appId].data.name,
                                type: result[appId].data.type
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        console.log(`    ⚠️  Parse error: ${e.message}`);
                        resolve(null);
                    }
                });
            }).on('error', (e) => {
                console.log(`    ⚠️  Request error: ${e.message}`);
                resolve(null);
            });
        });
    }

    generateGameId(gameName) {
        return gameName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    async checkImageExists(url) {
        return new Promise((resolve) => {
            https.get(url, { method: 'HEAD' }, (res) => {
                resolve(res.statusCode === 200);
            }).on('error', () => resolve(false));
        });
    }

    async tryScreenshotFallback(appId, game, platform) {
        try {
            // Try to get screenshots from Steam API
            const screenshotUrls = [
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/0000000001.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/0000000000.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_1.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_0.1920x1080.jpg`
            ];

            for (const url of screenshotUrls) {
                console.log(`  📸 Trying screenshot...`);
                if (await this.checkImageExists(url)) {
                    const localPath = await this.downloadImage(url, platform, game.platformId, 'screenshot.jpg');
                    if (localPath) {
                        console.log(`  💾 Used screenshot as cover: ${localPath}`);
                        return localPath;
                    }
                }
            }

            return false;
        } catch (error) {
            console.log(`  ⚠️  Screenshot fallback failed: ${error.message}`);
            return false;
        }
    }

    async downloadImage(url, platform, platformId, format) {
        return new Promise((resolve) => {
            const ext = path.extname(format);
            const filename = `${platformId}${ext}`;
            const platformDir = path.join(COVERS_DIR, platform);
            const localPath = path.join(platformDir, filename);
            const relativePath = `assets/covers/${platform}/${filename}`;

            // Skip if already exists (unless force refresh)
            if (fs.existsSync(localPath) && !FORCE_REFRESH) {
                console.log(`  ♻️  Already downloaded`);
                resolve(relativePath);
                return;
            }
            
            // Delete existing file if force refresh
            if (fs.existsSync(localPath) && FORCE_REFRESH) {
                fs.unlinkSync(localPath);
            }

            const file = fs.createWriteStream(localPath);
            
            https.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve(relativePath);
                    });
                } else {
                    file.close();
                    fs.unlinkSync(localPath);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
                console.log(`    ⚠️  Download error: ${err.message}`);
                resolve(null);
            });
        });
    }

    saveGamesData() {
        let anyUpdated = false;
        
        for (const platform of Object.keys(this.platformData)) {
            if (this.updated[platform]) {
                const dataPath = path.join(process.cwd(), 'data', `${platform}.json`);
                fs.writeFileSync(dataPath, JSON.stringify(this.platformData[platform], null, 2));
                console.log(`💾 Saved updated ${platform}.json`);
                anyUpdated = true;
            }
        }
        
        if (anyUpdated) {
            console.log();
        }
    }

    printSummary() {
        console.log('📊 Summary');
        console.log('==========\n');
        
        let total = 0;
        let withNames = 0;
        let withCovers = 0;
        
        for (const platform of Object.keys(this.platformData)) {
            const games = this.platformData[platform];
            let platformTotal = 0;
            let platformWithNames = 0;
            let platformWithCovers = 0;
            
            games.forEach(g => {
                if (g.subsets) {
                    // Count each subset as a separate entry
                    Object.entries(g.subsets).forEach(([key, subset]) => {
                        platformTotal++;
                        const isBase = key === 'Base';
                        // Base uses parent name, non-base uses subset name
                        if (isBase ? g.name : subset.name) platformWithNames++;
                        if (subset.coverImage) platformWithCovers++;
                    });
                } else {
                    platformTotal++;
                    if (g.name) platformWithNames++;
                    if (g.coverImage) platformWithCovers++;
                }
            });
            
            total += platformTotal;
            withNames += platformWithNames;
            withCovers += platformWithCovers;
            
            if (platformTotal > 0) {
                console.log(`${platform}:`);
                console.log(`  Total: ${platformTotal}`);
                console.log(`  With names: ${platformWithNames}/${platformTotal}`);
                console.log(`  With covers: ${platformWithCovers}/${platformTotal}`);
            }
        }
        
        console.log(`\nTotal games: ${total}`);
        console.log(`With names: ${withNames}/${total}`);
        console.log(`With covers: ${withCovers}/${total}`);
        
        const anyUpdated = Object.values(this.updated).some(u => u);
        if (anyUpdated) {
            console.log('\n✅ Game data updated successfully!');
        } else {
            console.log('\n📋 No updates needed');
        }

        // List games without names
        for (const platform of Object.keys(this.platformData)) {
            const missingNames = this.platformData[platform].filter(g => {
                // For games with subsets, name is at parent level
                if (g.subsets) return !g.name;
                return !g.name;
            });
            if (missingNames.length > 0) {
                console.log(`\n📝 Manual names needed for ${platform}:`);
                missingNames.forEach(g => console.log(`  - ${g.platformId}`));
            }
        }

        // List games without covers
        for (const platform of Object.keys(this.platformData)) {
            const missingCovers = [];
            this.platformData[platform].forEach(g => {
                if (g.subsets) {
                    // Check each subset for missing covers
                    Object.entries(g.subsets).forEach(([key, subset]) => {
                        if (!subset.coverImage) {
                            const isBase = key === 'Base';
                            const displayName = isBase ? g.name : (g.name && subset.name ? `${g.name}: ${subset.name}` : subset.name);
                            missingCovers.push(displayName || `${g.platformId}/${key}`);
                        }
                    });
                } else if (!g.coverImage) {
                    missingCovers.push(g.name || g.platformId);
                }
            });
            if (missingCovers.length > 0) {
                console.log(`\n🖼️  Manual covers needed for ${platform}:`);
                missingCovers.forEach(name => console.log(`  - ${name}`));
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the script
if (require.main === module) {
    new CoverFetcher().run();
}

module.exports = CoverFetcher;