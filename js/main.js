// Achievement Dashboard JavaScript
class AchievementDashboard {
    constructor() {
        this.achievements = [];
        this.filteredAchievements = [];
        this.currentPlatform = 'all';
        this.currentSort = 'recent';
        this.currentRarity = 'all';
        this.searchQuery = '';
        this.selectedTags = new Set();
        this.allTags = new Set();
        
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
            // Load data from separate platform files
            const platforms = ['steam', 'gog', 'retroachievements'];
            const allGames = [];
            
            for (const platform of platforms) {
                try {
                    const response = await fetch(`data/${platform}.json`);
                    if (!response.ok) {
                        console.warn(`Could not load ${platform}.json: ${response.status}`);
                        continue;
                    }
                    
                    const platformGames = await response.json();
                    
                    if (Array.isArray(platformGames)) {
                        // Add platform info to each game
                        platformGames.forEach(game => {
                            allGames.push({
                                ...game,
                                platform: platform
                            });
                        });
                    }
                } catch (error) {
                    console.warn(`Error loading ${platform}.json:`, error);
                }
            }
            
            if (allGames.length === 0) {
                throw new Error('No games data found');
            }
            
            // Load games data - names should already be in platform files
            this.achievements = allGames.map((game) => {
                const coverImage = game.coverImage || this.generateCoverImagePath(game);
                return {
                    ...game,
                    name: game.name || `Unknown Game (${game.platformId})`,
                    coverImage: coverImage,
                    isCompleted: game.dateCompleted !== null,
                    lastPlayed: game.dateCompleted || new Date().toISOString().split('T')[0]
                };
            });

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
            this.extractAllTags();
        } catch (error) {
            console.error('Error loading achievements:', error);
            // Load sample data as fallback
            this.loadSampleData();
        }
    }

    extractAllTags() {
        this.allTags.clear();
        this.achievements.forEach(game => {
            if (game.tags && Array.isArray(game.tags)) {
                game.tags.forEach(tag => this.allTags.add(tag));
            }
        });
        this.renderTagFilters();
    }

    renderTagFilters() {
        const tagSelect = document.getElementById('tag-select');
        if (!tagSelect) return;
        
        // Clear existing options except "All Tags"
        tagSelect.innerHTML = '<option value="all">All Tags</option>';
        
        // Hide the dropdown if there are no tags
        const filterGroup = tagSelect.closest('.filter-group');
        if (this.allTags.size === 0) {
            if (filterGroup) filterGroup.style.display = 'none';
            return;
        }
        
        if (filterGroup) filterGroup.style.display = '';
        
        // Add tag options
        const sortedTags = Array.from(this.allTags).sort();
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagSelect.appendChild(option);
        });
    }



    generateCoverImagePath(game) {
        // Generate standardized cover image paths
        const coverPaths = {
            steam: `assets/covers/steam/${game.platformId}.jpg`,
            gog: `assets/covers/gog/${game.platformId}.jpg`,
            retroachievements: `assets/covers/retroachievements/${game.platformId}.jpg`
        };
        
        return coverPaths[game.platform] || null;
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
                lastPlayed: '2024-02',
                tags: ["One", "Another","One Really Long Tag"]
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
        // Platform dropdown
        const platformSelect = document.getElementById('platform-select');
        if (platformSelect) {
            platformSelect.addEventListener('change', (e) => {
                this.currentPlatform = e.target.value;
                this.applyFilters();
            });
        }

        // Tag dropdown
        const tagSelect = document.getElementById('tag-select');
        if (tagSelect) {
            tagSelect.addEventListener('change', (e) => {
                const selectedTag = e.target.value;
                this.selectedTags.clear();
                if (selectedTag !== 'all') {
                    this.selectedTags.add(selectedTag);
                }
                this.applyFilters();
            });
        }

        // Search input with debounce for better performance
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 150); // 150ms debounce
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

            // Tag filter
            if (this.selectedTags.size > 0) {
                if (!game.tags || !Array.isArray(game.tags)) {
                    return false;
                }
                // Check if game has at least one of the selected tags
                const hasSelectedTag = game.tags.some(tag => this.selectedTags.has(tag));
                if (!hasSelectedTag) {
                    return false;
                }
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
        const completedGames = this.achievements.filter(game => game.dateCompleted).length;
        const totalTime = this.achievements.reduce((sum, game) => sum + (game.playedTime || 0), 0);

        document.getElementById('total-achievements').textContent = totalAchievements;
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

        // Add click and keyboard listeners to game cards
        document.querySelectorAll('.game-card').forEach(card => {
            const handleCardActivation = () => {
                const gameId = card.dataset.gameId;
                const game = this.achievements.find(g => this.generateGameId(g.name) === gameId);
                if (game) {
                    const link = this.getGameLink(game);
                    if (link) {
                        window.open(link, '_blank', 'noopener,noreferrer');
                    }
                }
            };

            card.addEventListener('click', handleCardActivation);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardActivation();
                }
            });

            // Tooltip on hover
            card.addEventListener('mouseenter', (e) => {
                const tooltipText = card.dataset.tooltip;
                if (!tooltipText) return;

                const tooltip = document.createElement('div');
                tooltip.className = 'game-tooltip';
                tooltip.id = 'game-tooltip';
                tooltip.innerHTML = tooltipText.split('\n').map((line, i) => 
                    i === 0 ? `<div class="tooltip-title">${line}</div>` : `<div class="tooltip-line">${line}</div>`
                ).join('');

                document.body.appendChild(tooltip);

                // Position relative to card (bottom-right corner)
                const cardRect = card.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                let left = cardRect.right + 8 + window.scrollX;
                let top = cardRect.top + window.scrollY;
                
                // If tooltip would go off the right edge, show on left side
                if (left + tooltipRect.width > window.innerWidth) {
                    left = cardRect.left - tooltipRect.width - 8 + window.scrollX;
                }
                
                // If tooltip would go off bottom, adjust upward
                if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
                    top = cardRect.bottom - tooltipRect.height + window.scrollY;
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });

            card.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('game-tooltip');
                if (tooltip) tooltip.remove();
            });
        });
    }

    generateGameId(gameName) {
        return gameName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    createGameCard(game) {
        const completionPercentage = Math.round((game.unlockedAchievements / game.totalAchievements) * 100);

        const formatDate = (dateString) => {
            if (!dateString) return null;
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const formatPlayedTime = (hours) => {
            if (!hours) return '';
            if (hours < 1) return '< 1h';
            return `${Math.round(hours)}h`;
        };

        // Escape HTML to prevent XSS
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        const safeName = escapeHtml(game.name);
        
        // Build tooltip content
        const tooltipLines = [
            safeName,
            `${completionPercentage}% • ${game.unlockedAchievements}/${game.totalAchievements} achievements`
        ];
        if (game.dateCompleted || game.lastPlayed) {
            tooltipLines.push(`Last achievement: ${game.dateCompleted ? formatDate(game.dateCompleted) : formatDate(game.lastPlayed)}`);
        }
        if (game.playedTime) {
            tooltipLines.push(`Total hours: ${formatPlayedTime(game.playedTime)}`);
        }
        if (game.tags && game.tags.length > 0) {
            tooltipLines.push(`Tags: ${game.tags.join(', ')}`);
        }

        return `
            <article class="game-card" data-platform="${game.platform}" data-game-id="${this.generateGameId(game.name)}" data-tooltip="${tooltipLines.join('\n')}" role="button" tabindex="0" aria-label="${safeName} - ${completionPercentage}% complete">
                <div class="game-header">
                    ${game.coverImage ? 
                        `<img src="${game.coverImage}" alt="${safeName} cover" class="game-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="game-image-fallback" style="display: none;" aria-hidden="true">${safeName}</div>` :
                        `<div class="game-image-fallback" aria-hidden="true">${safeName}</div>`
                    }
                    <div class="game-platform ${game.platform}" aria-label="${game.platform} platform">
                        ${game.platform === 'steam' ? '<img src="assets/icons/steam.svg" alt="" class="platform-icon" aria-hidden="true">' : 
                          game.platform === 'gog' ? '<img src="assets/icons/gog.svg" alt="" class="platform-icon" aria-hidden="true">' : 
                          game.platform === 'retroachievements' ? '<img src="assets/icons/ra-icon.webp" alt="" class="platform-icon" aria-hidden="true">' : 
                          game.platform.toUpperCase()}
                    </div>
                </div>
            </article>
        `;
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AchievementDashboard();
});