// Achievement Dashboard JavaScript
class AchievementDashboard {
    constructor() {
        this.achievements = [];
        this.filteredAchievements = [];
        this.currentPlatform = 'all';
        this.currentSort = 'recent';
        this.currentRarity = 'all';
        this.searchQuery = '';
        
        // Call init but don't await in constructor
        this.init().catch(error => {
            console.error('❌ Initialization error:', error);
            // Load sample data as fallback
            this.loadSampleData();
            this.setupEventListeners();
            this.updateStats();
            this.renderAchievements();
        });
    }

    async init() {
        await this.loadAchievements();
        this.setupEventListeners();
        this.updateStats();
        this.renderAchievements();
    }

    async loadAchievements() {
        try {
            const response = await fetch('data/games.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const gamesData = await response.json();
            
            if (!Array.isArray(gamesData) || gamesData.length === 0) {
                throw new Error('Invalid or empty games data');
            }
            
            this.achievements = gamesData.map(game => ({
                ...game,
                image: `https://via.placeholder.com/350x200/1a1a2e/ffffff?text=${encodeURIComponent(game.name)}`,
                isCompleted: game.dateCompleted !== null,
                lastPlayed: game.dateCompleted || new Date().toISOString().split('T')[0]
            }));

            // Sort achievements
            this.achievements.sort((a, b) => {
                if (a.dateCompleted && b.dateCompleted) {
                    return new Date(b.dateCompleted) - new Date(a.dateCompleted);
                }
                if (a.dateCompleted && !b.dateCompleted) return -1;
                if (!a.dateCompleted && b.dateCompleted) return 1;
                return a.name.localeCompare(b.name);
            });
            
            this.filteredAchievements = [...this.achievements];
        } catch (error) {
            console.error('Error loading achievements:', error);
            // Load sample data as fallback
            this.loadSampleData();
        }
    }

    async loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Could not load ${url}:`, error);
            return [];
        }
    }

    loadSampleData() {
        this.achievements = [
            {
                id: 'cyberpunk-2077',
                name: 'Cyberpunk 2077',
                platform: 'steam',
                platformId: '1091500',
                totalAchievements: 44,
                unlockedAchievements: 44,
                dateCompleted: '2024-02',
                playedTime: 85,
                coverImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_600x900_2x.jpg',
                image: 'https://via.placeholder.com/350x200/FF6B6B/FFFFFF?text=Cyberpunk+2077',
                isCompleted: true,
                lastPlayed: '2024-02'
            },
            {
                id: 'witcher-3',
                name: 'The Witcher 3: Wild Hunt',
                platform: 'gog',
                platformId: 'the_witcher_3_wild_hunt',
                totalAchievements: 78,
                unlockedAchievements: 78,
                dateCompleted: '2021-08',
                playedTime: 150,
                coverImage: 'https://images.gog-statics.com/5643a7c831df452d29005caeca24c231cd78f5628cd7f6e0cf5a9135a8e4d7f5_product_card_v2_mobile_slider_639.jpg',
                image: 'https://via.placeholder.com/350x200/4ECDC4/FFFFFF?text=The+Witcher+3',
                isCompleted: true,
                lastPlayed: '2021-08'
            },
            {
                id: 'super-mario-world',
                name: 'Super Mario World',
                platform: 'retroachievements',
                platformId: '228',
                totalAchievements: 51,
                unlockedAchievements: 51,
                dateCompleted: '2024-03',
                playedTime: 12,
                image: 'https://via.placeholder.com/350x200/FFE66D/FFFFFF?text=Super+Mario+World',
                isCompleted: true,
                lastPlayed: '2024-03'
            },
            {
                id: 'hollow-knight',
                name: 'Hollow Knight',
                platform: 'steam',
                platformId: '367520',
                totalAchievements: 63,
                unlockedAchievements: 45,
                dateCompleted: null,
                playedTime: 28,
                coverImage: 'https://cdn.akamai.steamstatic.com/steam/apps/367520/library_600x900_2x.jpg',
                image: 'https://via.placeholder.com/350x200/6C5CE7/FFFFFF?text=Hollow+Knight',
                isCompleted: false,
                lastPlayed: '2024-03'
            },
            {
                id: 'stardew-valley',
                name: 'Stardew Valley',
                platform: 'steam',
                platformId: '413150',
                totalAchievements: 40,
                unlockedAchievements: 23,
                dateCompleted: null,
                playedTime: 52,
                coverImage: 'https://cdn.akamai.steamstatic.com/steam/apps/413150/library_600x900_2x.jpg',
                image: 'https://via.placeholder.com/350x200/8B5A3C/FFFFFF?text=Stardew+Valley',
                isCompleted: false,
                lastPlayed: '2024-03'
            }
        ];
        this.filteredAchievements = [...this.achievements];
    }

    setupEventListeners() {
        // Platform navigation
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activeBtn = document.querySelector('.platform-btn.active');
                if (activeBtn) activeBtn.classList.remove('active');
                btn.classList.add('active');
                this.currentPlatform = btn.dataset.platform;
                this.applyFilters();
            });
        });

        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applySorting();
                this.renderAchievements();
            });
        }

        // Rarity filter (optional - only if exists)
        const rarityFilter = document.getElementById('rarity-filter');
        if (rarityFilter) {
            rarityFilter.addEventListener('change', (e) => {
                this.currentRarity = e.target.value;
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        this.filteredAchievements = this.achievements.filter(game => {
            // Platform filter
            if (this.currentPlatform !== 'all' && game.platform !== this.currentPlatform) {
                return false;
            }

            // Search filter
            if (this.searchQuery) {
                const searchLower = this.searchQuery.toLowerCase();
                const gameNameMatch = game.name.toLowerCase().includes(searchLower);
                
                if (!gameNameMatch) {
                    return false;
                }
            }

            return true;
        });

        this.applySorting();
        this.updateStats();
        this.renderAchievements();
    }

    applySorting() {
        this.filteredAchievements.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'completion':
                    const completionA = (a.unlockedAchievements / a.totalAchievements) * 100;
                    const completionB = (b.unlockedAchievements / b.totalAchievements) * 100;
                    return completionB - completionA;
                case 'recent':
                default:
                    // Sort by completion date (completed games first, then by date)
                    if (a.dateCompleted && b.dateCompleted) {
                        return new Date(b.dateCompleted) - new Date(a.dateCompleted);
                    }
                    if (a.dateCompleted && !b.dateCompleted) return -1;
                    if (!a.dateCompleted && b.dateCompleted) return 1;
                    return a.name.localeCompare(b.name);
            }
        });
    }

    getGameLink(game) {
        if (!game.platformId) return null;
        
        const linkTemplates = {
            steam: `https://steamcommunity.com/stats/${game.platformId}/achievements`,
            gog: `https://www.gog.com/game/${game.platformId}`,
            retroachievements: `https://retroachievements.org/game/${game.platformId}`
        };
        
        return linkTemplates[game.platform] || null;
    }

    updateStats() {
        const totalAchievements = this.achievements.reduce((sum, game) => sum + game.unlockedAchievements, 0);
        const totalPossible = this.achievements.reduce((sum, game) => sum + game.totalAchievements, 0);
        const totalGames = this.achievements.length;
        const completionRate = totalPossible > 0 ? ((totalAchievements / totalPossible) * 100).toFixed(1) : 0;
        
        const completedGames = this.achievements.filter(game => game.dateCompleted).length;
        const totalTime = this.achievements.reduce((sum, game) => sum + (game.playedTime || 0), 0);

        document.getElementById('total-achievements').textContent = totalAchievements;
        document.getElementById('total-games').textContent = totalGames;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;
        document.getElementById('rare-achievements').textContent = completedGames;
        document.getElementById('total-time').textContent = `${totalTime}h`;
    }

    renderAchievements() {
        const gamesGrid = document.getElementById('games-grid');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('no-results');

        if (loading) {
            loading.style.display = 'none';
        }

        if (this.filteredAchievements.length === 0) {
            if (gamesGrid) gamesGrid.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';
        
        if (gamesGrid) {
            gamesGrid.innerHTML = this.filteredAchievements.map(game => this.createGameCard(game)).join('');
        }

        // Add click listeners to game cards
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                const game = this.achievements.find(g => g.id === gameId);
                if (game) {
                    const link = this.getGameLink(game);
                    if (link) {
                        window.open(link, '_blank');
                    }
                }
            });
        });
    }

    createGameCard(game) {
        const completionPercentage = Math.round((game.unlockedAchievements / game.totalAchievements) * 100);

        const formatDate = (dateString) => {
            if (!dateString) return null;
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
            });
        };

        const formatPlayedTime = (hours) => {
            if (!hours) return '';
            if (hours < 1) return '< 1h';
            return `${Math.round(hours)}h`;
        };

        return `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-header">
                    ${game.coverImage ? 
                        `<img src="${game.coverImage}" alt="${game.name}" class="game-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="game-image-fallback" style="display: none;">${game.name}</div>` :
                        `<div class="game-image">${game.name}</div>`
                    }
                    <div class="game-platform ${game.platform}">${game.platform.toUpperCase()}</div>
                    ${game.playedTime ? `<div class="played-time">${formatPlayedTime(game.playedTime)}</div>` : ''}
                    <div class="completion-overlay">
                        <div class="game-title">${game.name}</div>
                        <div class="completion-text">${completionPercentage}% • ${game.unlockedAchievements}/${game.totalAchievements} achievements</div>
                        ${game.dateCompleted ? 
                            `<div class="completion-date">${formatDate(game.dateCompleted)}</div>` : 
                            game.lastPlayed ? `<div class="completion-date">Last played ${formatDate(game.lastPlayed)}</div>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AchievementDashboard();
});