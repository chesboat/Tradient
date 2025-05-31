// TradeExtractor - Simplified version without GPT Vision
// GPT Vision functionality removed as it's no longer needed

class TradeExtractor {
    constructor() {
        // GPT Vision feature removed - no longer needed
        console.log('📊 TradeExtractor initialized (GPT Vision disabled)');
    }

    // Main extraction method - currently not used since TradingView position tool handles extraction
    async extractTradeData(imagePath) {
        console.log('⚠️ GPT Vision trade extraction disabled - use TradingView position tool instead');
        
        return this.createFallbackData(imagePath);
    }

    createFallbackData(imagePath) {
        console.log('🔄 Creating fallback data - GPT Vision not available');
        
        return {
            symbol: 'Unknown',
            direction: 'unknown',
            timeframe: 'unknown',
            date: new Date().toISOString().split('T')[0],
            entryPrice: null,
            stopLoss: null,
            takeProfit: null,
            outcome: 'unknown',
            exitPrice: null,
            actualPnL: null,
            pointsGained: null,
            duration: 'unknown',
            plannedRR: null,
            actualRR: null,
            riskReward: null,
            reasoning: 'Fallback data - Use TradingView position tool for accurate extraction',
            rawGPTResponse: null
        };
    }
}

// Export singleton instance
const tradeExtractor = new TradeExtractor();

module.exports = tradeExtractor; 