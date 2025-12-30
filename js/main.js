// Achievement Dashboard JavaScript

/**
 * Achievement Progress Calculator
 * Handles progress calculation and UI generation for achievement bars
 */
class AchievementProgress {
    /**
     * Calculate progress and generate UI data
     * @param {number} totalAchievements - Total achievements available
     * @param {number} earnedAchievements - Achievements unlocked by user
     * @returns {Object} Progress data object
     */
    static calculate(totalAchievements, earnedAchievements) {
        const total = this.sanitizeNumber(totalAchievements);
        const earned = this.sanitizeNumber(earnedAchievements);

        if (total === 0) {
            return {
                percentage: 0,
                displayPercentage: '0%',
                earned: 0,
                total: 0,
                isComplete: false,
                status: 'No Achievements',
                barWidth: '2px',
                cssClass: '',
                showRibbon: false
            };
        }

        const cappedEarned = Math.min(earned, total);
        const rawPercentage = (cappedEarned / total) * 100;
        const percentage = Math.round(rawPercentage);
        const isComplete = cappedEarned === total && total > 0;

        let barWidth;
        if (percentage === 0) {
            barWidth = '2px';
        } else if (percentage < 1) {
            barWidth = '2px';
        } else {
            barWidth = `${percentage}%`;
        }

        let status;
        if (isComplete) {
            status = 'Complete';
        } else if (percentage === 0) {
            status = 'Not Started';
        } else if (percentage < 25) {
            status = 'Started';
        } else if (percentage < 75) {
            status = 'In Progress';
        } else {
            status = 'Almost There';
        }

        return {
            percentage,
            displayPercentage: `${percentage}%`,
            earned: cappedEarned,
            total,
            isComplete,
            status,
            barWidth,
            cssClass: isComplete ? 'complete' : '',
            showRibbon: isComplete
        };
    }

    static sanitizeNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
    }
}

class AchievementDashboard {
    constructor() {
        this.achievements = [];
        this.filteredAchievements = [];
        this.currentPlatform = 'all';
        this.currentSort = 'recent';
        this.currentRarity = 'all';
        this.searchQuery = '';
        this.includedTags = new Set();
        this.excludedTags = new Set();
        this.allTags = new Set();
        this.platformColors = {
            steam: '#66c0f4',
            gog: '#a861d6',
            retroachievements: '#ffcc00'
        };

        // Call init but don't await in constructor
        this.init().catch(error => {
            console.error('❌ Initialization error:', error);
            this.setupEventListeners();
        });
    }

    async init() {
        await this.loadAchievements();
        this.setupEventListeners();
        this.updateStats();
        this.renderCharts();
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
                            // Handle RetroAchievements games with subsets - expand into separate entries
                            if (platform === 'retroachievements' && game.subsets && typeof game.subsets === 'object') {
                                Object.entries(game.subsets).forEach(([key, subset]) => {
                                    // 'Base' uses the parent platformId, otherwise use the subset key as ID
                                    const isBase = key === 'Base';
                                    const setId = isBase ? game.platformId : key;
                                    // Build display name: Base uses parent name, subsets use "ParentName: SubsetName"
                                    const displayName = isBase
                                        ? (game.name || null)
                                        : (game.name && subset.name ? `${game.name}: ${subset.name}` : subset.name || null);
                                    allGames.push({
                                        ...game,
                                        // Override with subset-specific data
                                        platformId: setId,
                                        // Store parent ID and subset info for link generation
                                        parentId: game.platformId,
                                        isSubset: !isBase,
                                        subsetId: isBase ? null : key,
                                        name: displayName,
                                        coverImage: subset.coverImage || null,
                                        totalAchievements: subset.totalAchievements,
                                        unlockedAchievements: subset.unlockedAchievements,
                                        lastAchievement: subset.lastAchievement || game.lastAchievement,
                                        playedTime: subset.playedTime || game.playedTime,
                                        // Tags are shared from parent
                                        tags: game.tags,
                                        platform: platform,
                                        // Remove subsets to avoid confusion
                                        subsets: undefined
                                    });
                                });
                            } else {
                                allGames.push({
                                    ...game,
                                    platform: platform
                                });
                            }
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
                    isCompleted: game.lastAchievement !== null,
                    lastPlayed: game.lastAchievement || new Date().toISOString().split('T')[0]
                };
            });

            // Sort achievements
            this.achievements.sort((a, b) => {
                if (a.lastAchievement && b.lastAchievement) {
                    return new Date(b.lastAchievement) - new Date(a.lastAchievement);
                }
                if (a.lastAchievement && !b.lastAchievement) return -1;
                if (!a.lastAchievement && b.lastAchievement) return 1;
                return a.name.localeCompare(b.name);
            });

            this.filteredAchievements = [...this.achievements];
            this.extractAllTags();
        } catch (error) {
            console.error('Error loading achievements:', error);
            throw error;
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
        const tagList = document.getElementById('tag-list');
        const filterGroup = document.querySelector('.filter-group-tags');
        if (!tagList) return;

        // Hide the dropdown if there are no tags
        if (this.allTags.size === 0) {
            if (filterGroup) filterGroup.style.display = 'none';
            return;
        }

        if (filterGroup) filterGroup.style.display = '';
        tagList.innerHTML = '';

        // Add tag checkboxes
        const sortedTags = Array.from(this.allTags).sort();
        sortedTags.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `tag-${tag}`;
            checkbox.className = 'tag-checkbox';

            const includeBtn = document.createElement('button');
            includeBtn.className = 'tag-mode-btn include-btn';
            includeBtn.innerHTML = '<i class="fas fa-plus"></i>';
            includeBtn.title = 'Include';
            includeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.includedTags.has(tag)) {
                    this.includedTags.delete(tag);
                    includeBtn.classList.remove('active');
                } else {
                    this.includedTags.add(tag);
                    this.excludedTags.delete(tag);
                    includeBtn.classList.add('active');
                    excludeBtn.classList.remove('active');
                }
                this.updateTagFilterLabel();
                this.applyFilters();
            });

            const excludeBtn = document.createElement('button');
            excludeBtn.className = 'tag-mode-btn exclude-btn';
            excludeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            excludeBtn.title = 'Exclude';
            excludeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.excludedTags.has(tag)) {
                    this.excludedTags.delete(tag);
                    excludeBtn.classList.remove('active');
                } else {
                    this.excludedTags.add(tag);
                    this.includedTags.delete(tag);
                    excludeBtn.classList.add('active');
                    includeBtn.classList.remove('active');
                }
                this.updateTagFilterLabel();
                this.applyFilters();
            });

            const tagName = document.createElement('span');
            tagName.className = 'tag-name';
            tagName.textContent = tag;

            tagItem.appendChild(includeBtn);
            tagItem.appendChild(excludeBtn);
            tagItem.appendChild(tagName);
            tagList.appendChild(tagItem);
        });

        this.updateTagFilterLabel();
    }

    updateTagFilterLabel() {
        const label = document.getElementById('tag-filter-label');
        if (!label) return;

        const totalFilters = this.includedTags.size + this.excludedTags.size;
        if (totalFilters === 0) {
            label.textContent = 'All Tags';
        } else {
            const parts = [];
            if (this.includedTags.size > 0) parts.push(`+${this.includedTags.size}`);
            if (this.excludedTags.size > 0) parts.push(`-${this.excludedTags.size}`);
            label.textContent = parts.join(' ');
        }
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

    setupEventListeners() {
        // Platform dropdown
        const platformSelect = document.getElementById('platform-select');
        if (platformSelect) {
            platformSelect.addEventListener('change', (e) => {
                this.currentPlatform = e.target.value;
                this.applyFilters();
            });
        }

        // Tag filter toggle
        const tagFilterToggle = document.getElementById('tag-filter-toggle');
        const tagFilterDropdown = document.getElementById('tag-filter-dropdown');
        if (tagFilterToggle && tagFilterDropdown) {
            tagFilterToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                tagFilterDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.tag-filter-container')) {
                    tagFilterDropdown.classList.remove('show');
                }
            });
        }

        // Tag search
        const tagSearch = document.getElementById('tag-search');
        if (tagSearch) {
            tagSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                document.querySelectorAll('.tag-item').forEach(item => {
                    const tagName = item.querySelector('.tag-name').textContent.toLowerCase();
                    item.style.display = tagName.includes(searchTerm) ? '' : 'none';
                });
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
            if (this.includedTags.size > 0 || this.excludedTags.size > 0) {
                const gameTags = game.tags && Array.isArray(game.tags) ? game.tags : [];

                // Check included tags (must have at least one)
                if (this.includedTags.size > 0) {
                    const hasIncludedTag = gameTags.some(tag => this.includedTags.has(tag));
                    if (!hasIncludedTag) {
                        return false;
                    }
                }

                // Check excluded tags (must not have any)
                if (this.excludedTags.size > 0) {
                    const hasExcludedTag = gameTags.some(tag => this.excludedTags.has(tag));
                    if (hasExcludedTag) {
                        return false;
                    }
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
                case 'playtime':
                    const timeA = a.playedTime || 0;
                    const timeB = b.playedTime || 0;
                    return timeB - timeA;
                case 'recent':
                default:
                    // Sort by completion date (completed games first, then by date)
                    if (a.lastAchievement && b.lastAchievement) {
                        return new Date(b.lastAchievement) - new Date(a.lastAchievement);
                    }
                    if (a.lastAchievement && !b.lastAchievement) return -1;
                    if (!a.lastAchievement && b.lastAchievement) return 1;
                    return a.name.localeCompare(b.name);
            }
        });
    }

    getGameLink(game) {
        if (!game.platformId) return null;

        if (game.platform === 'retroachievements') {
            const baseUrl = `https://retroachievements.org/game/${game.parentId || game.platformId}`;
            // Add ?set= parameter for subsets
            return game.isSubset && game.subsetId ? `${baseUrl}?set=${game.subsetId}` : baseUrl;
        }

        const linkTemplates = {
            steam: `https://steamcommunity.com/stats/${game.platformId}/achievements`,
            gog: `https://www.gog.com/game/${game.platformId}`
        };

        return linkTemplates[game.platform] || null;
    }

    updateStats() {
        const totalAchievements = this.filteredAchievements.reduce((sum, game) => sum + game.unlockedAchievements, 0);
        const completedGames = this.filteredAchievements.filter(game =>
            game.totalAchievements > 0 && game.unlockedAchievements === game.totalAchievements
        ).length;

        document.getElementById('total-achievements').textContent = totalAchievements;
        document.getElementById('rare-achievements').textContent = completedGames;
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

                // Get tooltip's padding from computed style
                const tooltipStyle = window.getComputedStyle(tooltip);
                const tooltipPaddingTop = parseFloat(tooltipStyle.paddingTop);

                let left = cardRect.right + 8 + window.scrollX;
                let top = cardRect.top + window.scrollY - tooltipPaddingTop;

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

        // Calculate progress data
        const progressData = AchievementProgress.calculate(
            game.totalAchievements,
            game.unlockedAchievements
        );

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
        if (game.lastAchievement || game.lastPlayed) {
            tooltipLines.push(`Last achievement: ${game.lastAchievement ? formatDate(game.lastAchievement) : formatDate(game.lastPlayed)}`);
        }
        if (game.playedTime) {
            tooltipLines.push(`Total hours: ${formatPlayedTime(game.playedTime)}`);
        }
        if (game.console) {
            tooltipLines.push(`Console: ${game.console}`);
        }
        if (game.tags && game.tags.length > 0) {
            tooltipLines.push(`Tags: ${game.tags.join(', ')}`);
        }

        // Mutually exclusive states: ribbon for 100%, progress bar for incomplete
        const completionLabel = game.platform === 'retroachievements' ? 'Mastered' : '100% Complete';
        const platformIconSrc = game.platform === 'steam' ? 'assets/icons/steam.svg' :
                                game.platform === 'gog' ? 'assets/icons/gog.svg' :
                                game.platform === 'retroachievements' ? 'assets/icons/ra-icon.webp' : '';
        // Console icon for RetroAchievements games (normalize name to lowercase, replace spaces with hyphens)
        const consoleIconSrc = game.platform === 'retroachievements' && game.console
            ? `assets/icons/consoles/${game.console.toLowerCase().replace(/\s+/g, '-')}.png`
            : '';
        // Ribbon icon for 100% complete non-RA games
        const ribbonIconSrc = game.platform !== 'retroachievements' ? 'assets/icons/ribbon.png' : '';
        const completionHTML = progressData.isComplete ? `
            <div class="floating-ribbon" aria-label="All achievements completed">
                ${platformIconSrc ? `<img src="${platformIconSrc}" alt="" class="ribbon-platform-icon" aria-hidden="true">` : ''}
                <span class="ribbon-text">${completionLabel}</span>
                ${consoleIconSrc ? `<img src="${consoleIconSrc}" alt="${game.console}" class="ribbon-console-icon" aria-hidden="true" onerror="this.style.display='none'">` : ''}
                ${ribbonIconSrc ? `<img src="${ribbonIconSrc}" alt="" class="ribbon-badge-icon" aria-hidden="true" onerror="this.style.display='none'">` : ''}
            </div>
        ` : `
            <div class="game-progress-overlay" aria-label="Achievement progress: ${progressData.earned} out of ${progressData.total} achievements unlocked, ${progressData.percentage}%">
                <div class="achievement-progress">
                    ${platformIconSrc ? `<img src="${platformIconSrc}" alt="" class="progress-platform-icon" aria-hidden="true">` : ''}
                    <span class="achievement-count">${progressData.earned}/${progressData.total}</span>
                    ${consoleIconSrc ? `<img src="${consoleIconSrc}" alt="${game.console}" class="progress-console-icon" aria-hidden="true" onerror="this.style.display='none'">` : ''}
                </div>
            </div>
        `;

        return `
            <article class="game-card" data-platform="${game.platform}" data-game-id="${this.generateGameId(game.name)}" data-tooltip="${tooltipLines.join('\n')}" role="button" tabindex="0" aria-label="${safeName} - ${completionPercentage}% complete">
                <div class="game-header">
                    ${game.coverImage ?
                        `<img src="${game.coverImage}" alt="${safeName} cover" class="game-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="game-image-fallback" style="display: none;" aria-hidden="true">${safeName}</div>` :
                        `<div class="game-image-fallback" aria-hidden="true">${safeName}</div>`
                    }
                </div>
                ${!progressData.isComplete ? completionHTML : ''}
                ${progressData.isComplete ? completionHTML : ''}
            </article>
        `;
    }

    // Chart rendering methods
    renderCharts() {
        this.renderPlatformCharts();
        this.renderTagsChart();
        this.renderConsolesChart();
    }

    renderPlatformCharts() {
        const platformData = {};
        ['steam', 'gog', 'retroachievements'].forEach(p => {
            platformData[p] = { games: 0, achievements: 0 };
        });

        this.achievements.forEach(game => {
            const p = game.platform;
            if (platformData[p]) {
                platformData[p].games++;
                platformData[p].achievements += game.unlockedAchievements;
            }
        });

        const labels = ['Steam', 'GOG', 'RetroAchievements'];
        const platforms = ['steam', 'gog', 'retroachievements'];
        const colors = platforms.map(p => this.platformColors[p]);

        // Games by Platform
        this.createDoughnutChart('platformGamesChart', {
            labels,
            datasets: [{
                data: platforms.map(p => platformData[p].games),
                backgroundColor: colors,
                borderWidth: 0
            }]
        });

        // Achievements by Platform
        this.createDoughnutChart('platformAchievementsChart', {
            labels,
            datasets: [{
                data: platforms.map(p => platformData[p].achievements),
                backgroundColor: colors,
                borderWidth: 0
            }]
        });
    }

    renderTagsChart() {
        const tagStats = {};

        this.achievements.forEach(game => {
            if (game.tags && Array.isArray(game.tags)) {
                game.tags.forEach(tag => {
                    if (!tagStats[tag]) {
                        tagStats[tag] = { count: 0 };
                    }
                    tagStats[tag].count++;
                });
            }
        });

        const sortedByCount = Object.entries(tagStats)
            .sort((a, b) => b[1].count - a[1].count);

        this.createVerticalBarChart('tagsChart', {
            labels: sortedByCount.map(([tag]) => tag),
            datasets: [{
                data: sortedByCount.map(([, stats]) => stats.count),
                backgroundColor: 'rgba(102, 192, 244, 0.7)',
                borderRadius: 4
            }]
        });
    }

    renderConsolesChart() {
        const consoleStats = {};

        this.achievements.forEach(game => {
            // Use console value for RA games, 'PC' for Steam/GOG
            const consoleName = game.platform === 'retroachievements' && game.console
                ? game.console
                : 'PC';

            if (!consoleStats[consoleName]) {
                consoleStats[consoleName] = 0;
            }
            consoleStats[consoleName]++;
        });

        const entries = Object.entries(consoleStats).sort((a, b) => b[1] - a[1]);

        const generateColors = (count) => {
            const colors = [];
            for (let i = 0; i < count; i++) {
                const hue = (40 + (i * 30)) % 360;
                colors.push(`hsl(${hue}, 70%, 50%)`);
            }
            return colors;
        };

        this.createDoughnutChart('consolesChart', {
            labels: entries.map(([consoleName]) => consoleName),
            datasets: [{
                data: entries.map(([, count]) => count),
                backgroundColor: generateColors(entries.length),
                borderWidth: 0
            }]
        });
    }

    createDoughnutChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#8f98a0',
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    createHorizontalBarChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { color: '#8f98a0' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { color: '#8f98a0' },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    createVerticalBarChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#8f98a0',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#8f98a0' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AchievementDashboard();
});