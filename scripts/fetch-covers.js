#!/usr/bin/env node

/**
 * Game Cover Fetcher Script
 * Automatically fetches cover images for games in data/games.json
 * 
 * Usage:
 *   node scripts/fetch-covers.js
 * 
 * Features:
 * - Fetches Steam covers automatically using Steam Store API
 * - Supports multiple Steam image formats (library, header)
 * - Validates image URLs before adding them
 * - Preserves existing covers
 * - Provides detailed logging
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const STEAM_SEARCH_API = 'https://store.steampowered.com/api/storesearch/';
const STEAM_CDN_BASE = 'https://cdn.akamai.steamstatic.com/steam/apps/';
const COVERS_DIR = path.join(process.cwd(), 'assets', 'covers');

// Steam image formats (in order of preference)
const STEAM_IMAGE_FORMATS = [
    'library_600x900_2x.jpg',  // Best quality vertical
    'library_600x900.jpg',     // Standard vertical
    'header.jpg'               // Fallback horizontal
];

class CoverFetcher {
    constructor() {
        this.gamesData = [];
        this.updated = false;
        this.ensureCoversDirectory();
    }

    ensureCoversDirectory() {
        if (!fs.existsSync(COVERS_DIR)) {
            fs.mkdirSync(COVERS_DIR, { recursive: true });
            console.log(`📁 Created covers directory: ${COVERS_DIR}\n`);
        }
    }

    async run() {
        try {
            console.log('🎮 Game Cover Fetcher v1.0');
            console.log('================================\n');

            this.loadGamesData();
            await this.fetchAllCovers();
            this.saveGamesData();
            this.printSummary();

        } catch (error) {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        }
    }

    loadGamesData() {
        try {
            const dataPath = path.join(process.cwd(), 'data', 'games.json');
            this.gamesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            console.log(`📋 Loaded ${this.gamesData.length} games from data/games.json\n`);
        } catch (error) {
            throw new Error(`Failed to load games data: ${error.message}`);
        }
    }

    async fetchAllCovers() {
        console.log('🔍 Starting cover image fetch...\n');

        for (let i = 0; i < this.gamesData.length; i++) {
            const game = this.gamesData[i];
            console.log(`[${i + 1}/${this.gamesData.length}] ${game.name}`);

            if (game.coverImage) {
                console.log(`  ✅ Already has cover\n`);
                continue;
            }

            const success = await this.fetchGameCover(game);
            if (success) {
                this.updated = true;
                console.log(`  ✅ Cover added!\n`);
            } else {
                console.log(`  ❌ No cover found\n`);
            }

            // Be respectful to APIs
            await this.delay(300);
        }
    }

    async fetchGameCover(game) {
        switch (game.platform) {
            case 'steam':
                return await this.fetchSteamCover(game);
            case 'gog':
                console.log(`  📝 GOG - manual cover needed`);
                return false;
            case 'retroachievements':
                console.log(`  📝 RetroAchievements - manual cover needed`);
                return false;
            default:
                console.log(`  ❓ Unknown platform: ${game.platform}`);
                return false;
        }
    }

    async fetchSteamCover(game) {
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

            // Try different image formats
            for (const format of STEAM_IMAGE_FORMATS) {
                const imageUrl = `${STEAM_CDN_BASE}${appId}/${format}`;
                console.log(`  🖼️  Testing: ${format}`);

                if (await this.checkImageExists(imageUrl)) {
                    // Download the image locally
                    const localPath = await this.downloadImage(imageUrl, game.id, format);
                    if (localPath) {
                        game.coverImage = localPath;
                        console.log(`  💾 Downloaded to: ${localPath}`);
                        return true;
                    }
                }
            }

            console.log(`  ❌ No valid images found for App ID: ${appId}`);
            return false;

        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            return false;
        }
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

    async checkImageExists(url) {
        return new Promise((resolve) => {
            https.get(url, { method: 'HEAD' }, (res) => {
                resolve(res.statusCode === 200);
            }).on('error', () => resolve(false));
        });
    }

    async downloadImage(url, gameId, format) {
        return new Promise((resolve) => {
            const ext = path.extname(format);
            const filename = `${gameId}${ext}`;
            const localPath = path.join(COVERS_DIR, filename);
            const relativePath = `assets/covers/${filename}`;

            // Skip if already exists
            if (fs.existsSync(localPath)) {
                console.log(`  ♻️  Already downloaded`);
                resolve(relativePath);
                return;
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
        if (this.updated) {
            const dataPath = path.join(process.cwd(), 'data', 'games.json');
            fs.writeFileSync(dataPath, JSON.stringify(this.gamesData, null, 2));
            console.log('💾 Saved updated games.json\n');
        }
    }

    printSummary() {
        console.log('📊 Summary');
        console.log('==========');
        
        const total = this.gamesData.length;
        const withCovers = this.gamesData.filter(g => g.coverImage).length;
        const withoutCovers = total - withCovers;

        console.log(`Total games: ${total}`);
        console.log(`With covers: ${withCovers}`);
        console.log(`Without covers: ${withoutCovers}`);
        
        if (this.updated) {
            console.log('\n✅ Cover images updated successfully!');
        } else {
            console.log('\n📋 No new covers added');
        }

        if (withoutCovers > 0) {
            console.log('\n📝 Manual covers needed for:');
            this.gamesData
                .filter(g => !g.coverImage)
                .forEach(g => console.log(`  - ${g.name} (${g.platform})`));
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