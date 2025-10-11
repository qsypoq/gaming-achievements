// Simple test script
console.log('🧪 Test script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded');
    
    // Hide loading
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
        console.log('✅ Loading hidden');
    }
    
    // Show a test message
    const gamesGrid = document.getElementById('games-grid');
    if (gamesGrid) {
        gamesGrid.innerHTML = '<p style="color: white; text-align: center; padding: 2rem;">Test: JavaScript is working!</p>';
        console.log('✅ Test message displayed');
    }
    
    // Update stats with test values
    const totalAchievements = document.getElementById('total-achievements');
    const totalGames = document.getElementById('total-games');
    
    if (totalAchievements) totalAchievements.textContent = '123';
    if (totalGames) totalGames.textContent = '5';
    
    console.log('✅ Test complete');
});