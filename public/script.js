class PropJournal {
    constructor() {
        this.init();
        this.trades = [];
        this.filteredTrades = [];
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadTrades();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // File input
        const fileInput = document.getElementById('file-input');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadFile(e.target.files[0]);
            }
        });

        // Upload area click
        document.getElementById('upload-area').addEventListener('click', () => {
            fileInput.click();
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('trade-modal').addEventListener('click', (e) => {
            if (e.target.id === 'trade-modal') {
                this.closeModal();
            }
        });

        // Filters
        document.getElementById('direction-filter').addEventListener('change', () => {
            this.filterTrades();
        });

        document.getElementById('symbol-filter').addEventListener('change', () => {
            this.filterTrades();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.uploadFile(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    switchTab(tabName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load specific tab data
        if (tabName === 'journal') {
            this.loadTrades();
        } else if (tabName === 'analytics') {
            this.loadAnalytics();
        }
    }

    async uploadFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please upload an image file', 'error');
            return;
        }

        this.showProcessing(true);

        const formData = new FormData();
        formData.append('screenshot', file);

        try {
            const response = await fetch('/api/upload-trade', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showTradeResult(result.trade);
                this.showNotification('Trade extracted successfully!', 'success');
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.showProcessing(false);
        }
    }

    showProcessing(show) {
        const indicator = document.getElementById('processing-indicator');
        const result = document.getElementById('trade-result');
        
        if (show) {
            indicator.style.display = 'block';
            result.style.display = 'none';
        } else {
            indicator.style.display = 'none';
        }
    }

    showTradeResult(trade) {
        const result = document.getElementById('trade-result');
        const tradeCard = document.getElementById('extracted-trade');
        
        tradeCard.innerHTML = this.generateTradeCard(trade);
        result.style.display = 'block';

        // Refresh trades list
        this.loadTrades();
    }

    generateTradeCard(trade) {
        const formatPrice = (price) => price ? price.toFixed(4) : 'N/A';
        const formatRR = (rr) => rr ? `${rr.toFixed(2)}:1` : 'N/A';
        
        return `
            <div class="trade-header">
                <span class="trade-symbol">${trade.symbol || 'Unknown Symbol'}</span>
                <span class="trade-direction ${trade.direction}">${trade.direction || 'unknown'}</span>
            </div>
            <div class="trade-details">
                <div class="trade-detail">
                    <div class="trade-detail-label">Entry Price</div>
                    <div class="trade-detail-value">${formatPrice(trade.entryPrice)}</div>
                </div>
                <div class="trade-detail">
                    <div class="trade-detail-label">Stop Loss</div>
                    <div class="trade-detail-value">${formatPrice(trade.stopLoss)}</div>
                </div>
                <div class="trade-detail">
                    <div class="trade-detail-label">Take Profit</div>
                    <div class="trade-detail-value">${formatPrice(trade.takeProfit)}</div>
                </div>
                <div class="trade-detail">
                    <div class="trade-detail-label">Risk:Reward</div>
                    <div class="trade-detail-value">${formatRR(trade.riskReward)}</div>
                </div>
                <div class="trade-summary">
                    <div class="trade-detail">
                        <div class="trade-detail-label">Timeframe</div>
                        <div class="trade-detail-value">${trade.timeframe || 'N/A'}</div>
                    </div>
                    <div class="trade-detail">
                        <div class="trade-detail-label">Date</div>
                        <div class="trade-detail-value">${trade.date || 'Today'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadTrades() {
        try {
            const response = await fetch('/api/trades');
            this.trades = await response.json();
            this.filteredTrades = [...this.trades];
            this.renderTrades();
            this.populateFilters();
        } catch (error) {
            console.error('Error loading trades:', error);
            this.showNotification('Failed to load trades', 'error');
        }
    }

    populateFilters() {
        const symbolFilter = document.getElementById('symbol-filter');
        const symbols = [...new Set(this.trades.map(trade => trade.symbol).filter(Boolean))];
        
        symbolFilter.innerHTML = '<option value="">All Symbols</option>';
        symbols.forEach(symbol => {
            symbolFilter.innerHTML += `<option value="${symbol}">${symbol}</option>`;
        });
    }

    filterTrades() {
        const directionFilter = document.getElementById('direction-filter').value;
        const symbolFilter = document.getElementById('symbol-filter').value;

        this.filteredTrades = this.trades.filter(trade => {
            const directionMatch = !directionFilter || trade.direction === directionFilter;
            const symbolMatch = !symbolFilter || trade.symbol === symbolFilter;
            return directionMatch && symbolMatch;
        });

        this.renderTrades();
    }

    renderTrades() {
        const grid = document.getElementById('trades-grid');
        
        if (this.filteredTrades.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No trades found. Upload your first TradingView screenshot!</p>
                </div>
            `;
            return;
        }

        // Header row
        let html = `
            <div class="trade-row" style="background: #f8fafc; font-weight: 600;">
                <div class="trade-cell">Symbol</div>
                <div class="trade-cell">Direction</div>
                <div class="trade-cell">Entry</div>
                <div class="trade-cell">Stop Loss</div>
                <div class="trade-cell">Take Profit</div>
                <div class="trade-cell">R:R</div>
                <div class="trade-cell">Actions</div>
            </div>
        `;

        // Trade rows
        this.filteredTrades.forEach(trade => {
            html += this.generateTradeRow(trade);
        });

        grid.innerHTML = html;
    }

    generateTradeRow(trade) {
        const formatPrice = (price) => price ? price.toFixed(4) : 'N/A';
        const formatRR = (rr) => rr ? `${rr.toFixed(2)}:1` : 'N/A';
        const rrClass = trade.riskReward && trade.riskReward >= 2 ? 'good' : 'poor';

        return `
            <div class="trade-row" onclick="app.showTradeModal('${trade.id}')">
                <div class="trade-cell symbol">${trade.symbol || 'Unknown'}</div>
                <div class="trade-cell">
                    <span class="trade-direction ${trade.direction}">${trade.direction || 'unknown'}</span>
                </div>
                <div class="trade-cell price">${formatPrice(trade.entryPrice)}</div>
                <div class="trade-cell price">${formatPrice(trade.stopLoss)}</div>
                <div class="trade-cell price">${formatPrice(trade.takeProfit)}</div>
                <div class="trade-cell risk-reward ${rrClass}">${formatRR(trade.riskReward)}</div>
                <div class="trade-actions" onclick="event.stopPropagation()">
                    <button class="action-btn edit-btn" onclick="app.editTrade('${trade.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="app.deleteTrade('${trade.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    async showTradeModal(tradeId) {
        try {
            const response = await fetch(`/api/trades/${tradeId}`);
            const trade = await response.json();
            
            const modal = document.getElementById('trade-modal');
            const modalBody = document.getElementById('modal-body');
            
            modalBody.innerHTML = `
                <div class="trade-card">
                    ${this.generateTradeCard(trade)}
                    <div style="margin-top: 1rem; text-align: center;">
                        <img src="${trade.screenshotPath}" alt="Trade Screenshot" 
                             style="max-width: 100%; border-radius: 0.5rem; border: 1px solid #e5e7eb;">
                    </div>
                </div>
            `;
            
            modal.classList.add('open');
        } catch (error) {
            console.error('Error loading trade details:', error);
            this.showNotification('Failed to load trade details', 'error');
        }
    }

    closeModal() {
        document.getElementById('trade-modal').classList.remove('open');
    }

    async deleteTrade(tradeId) {
        if (!confirm('Are you sure you want to delete this trade?')) {
            return;
        }

        try {
            const response = await fetch(`/api/trades/${tradeId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Trade deleted successfully', 'success');
                this.loadTrades();
            } else {
                throw new Error('Failed to delete trade');
            }
        } catch (error) {
            console.error('Error deleting trade:', error);
            this.showNotification('Failed to delete trade', 'error');
        }
    }

    editTrade(tradeId) {
        // TODO: Implement trade editing functionality
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    async loadAnalytics() {
        try {
            const [tradesResponse, statsResponse] = await Promise.all([
                fetch('/api/trades'),
                fetch('/api/trades/stats') // We'll need to add this endpoint
            ]);

            const trades = await tradesResponse.json();
            
            // Calculate basic stats from trades data
            const stats = this.calculateStats(trades);
            this.renderAnalytics(stats);

        } catch (error) {
            console.error('Error loading analytics:', error);
            // Show basic stats even if API fails
            this.renderAnalytics(this.calculateStats(this.trades));
        }
    }

    calculateStats(trades) {
        const totalTrades = trades.length;
        const longTrades = trades.filter(t => t.direction === 'long').length;
        const shortTrades = trades.filter(t => t.direction === 'short').length;
        const avgRiskReward = trades.filter(t => t.riskReward).reduce((sum, t) => sum + t.riskReward, 0) / trades.filter(t => t.riskReward).length || 0;
        const winningTrades = trades.filter(t => t.status === 'won').length;
        const losingTrades = trades.filter(t => t.status === 'lost').length;

        return {
            totalTrades,
            longTrades,
            shortTrades,
            avgRiskReward,
            winningTrades,
            losingTrades
        };
    }

    renderAnalytics(stats) {
        const grid = document.getElementById('stats-grid');
        
        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.totalTrades}</div>
                <div class="stat-label">Total Trades</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.longTrades}</div>
                <div class="stat-label">Long Trades</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.shortTrades}</div>
                <div class="stat-label">Short Trades</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.avgRiskReward.toFixed(2)}:1</div>
                <div class="stat-label">Avg Risk:Reward</div>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;

        // Set color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app
const app = new PropJournal(); 