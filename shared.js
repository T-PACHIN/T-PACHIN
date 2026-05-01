// ==================== 全域共用資料 ====================
const T_PACHIN_STORAGE = {
    // 儲存 KEY
    FAVORITE_KEY: 't_pachin_favorites',
    RESERVE_KEY: 't_pachin_reserved',
    USER_KEY: 't_pachin_user',
    PLAYED_KEY: 't_pachin_played',
    POINTS_KEY: 't_pachin_user_points',
    // 設定 KEY
    SETTINGS_KEY: 't_pachin_settings',
    
    // ==================== 設定管理 ====================
    getSettings() {
        const defaultSettings = {
            darkMode: true,      // true = 深色模式, false = 淺色模式
            language: 'zh-TW',
            sound: true,
            notify: true
        };
        const stored = localStorage.getItem(this.SETTINGS_KEY);
        if (stored) {
            try {
                return { ...defaultSettings, ...JSON.parse(stored) };
            } catch (e) {
                return defaultSettings;
            }
        }
        return defaultSettings;
    },
    
    saveSettings(settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('t-pachin:settings-updated', {
            detail: settings
        }));
        return settings;
    },
    
    updateSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.saveSettings(settings);
        this.applySettingsToBody(settings);
        return settings;
    },
    
    applySettingsToBody(settings) {
        const body = document.body;
        if (!settings.darkMode) {
            body.classList.add('light-mode');
        } else {
            body.classList.remove('light-mode');
        }
    },
    
    // ==================== 使用者資料 ====================
    getUserData() {
        const defaultData = {
            points: 6600,
            totalTokens: 6000,
            nickname: '夫人會生氣',
            vipLevel: 1,
            lastUpdated: Date.now()
        };
        
        const pointsStored = localStorage.getItem(this.POINTS_KEY);
        if (pointsStored !== null) {
            defaultData.points = parseInt(pointsStored, 10) || 6600;
        }
        
        const stored = localStorage.getItem(this.USER_KEY);
        if (stored) {
            try {
                const userData = JSON.parse(stored);
                userData.points = defaultData.points;
                return { ...defaultData, ...userData };
            } catch (e) {
                return defaultData;
            }
        }
        return defaultData;
    },
    
    saveUserData(userData) {
        localStorage.setItem(this.POINTS_KEY, userData.points);
        localStorage.setItem(this.USER_KEY, JSON.stringify({
            ...userData,
            lastUpdated: Date.now()
        }));
        
        window.dispatchEvent(new CustomEvent('t-pachin:user-updated', {
            detail: userData
        }));
        window.dispatchEvent(new CustomEvent('points-updated', {
            detail: { points: userData.points }
        }));
    },
    
    updatePoints(changeAmount) {
        const userData = this.getUserData();
        userData.points = Math.max(0, userData.points + changeAmount);
        this.saveUserData(userData);
        this.updateAllPointsDisplay();
        return userData.points;
    },
    
    getPoints() {
        const pointsStored = localStorage.getItem(this.POINTS_KEY);
        if (pointsStored !== null) {
            return parseInt(pointsStored, 10) || 6600;
        }
        return this.getUserData().points;
    },
    
    setPoints(points) {
        const userData = this.getUserData();
        userData.points = Math.max(0, points);
        this.saveUserData(userData);
        this.updateAllPointsDisplay();
        return userData.points;
    },
    
    updateAllPointsDisplay() {
        const points = this.getPoints();
        document.querySelectorAll('.points-display, .points-value, [data-points-display]').forEach(el => {
            if (el.tagName === 'INPUT') {
                el.value = points.toLocaleString();
            } else {
                el.textContent = points.toLocaleString();
            }
        });
        document.querySelectorAll('#userPoints, #headerPoints .points-value, #tokenBtn, #headerPoints').forEach(el => {
            if (el.id === 'userPoints') {
                el.textContent = points;
            } else if (el.id === 'tokenBtn') {
                el.textContent = points.toLocaleString();
            } else if (el.id === 'headerPoints') {
                el.innerHTML = `💰 <span id="userPoints">${points}</span>`;
            } else {
                el.textContent = points.toLocaleString();
            }
        });
    },
    
    // ==================== 我的最愛 ====================
    getFavorites() {
        const stored = localStorage.getItem(this.FAVORITE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    },
    
    saveFavorites(favorites) {
        localStorage.setItem(this.FAVORITE_KEY, JSON.stringify(favorites));
        window.dispatchEvent(new CustomEvent('t-pachin:favorites-updated', {
            detail: favorites
        }));
        window.dispatchEvent(new CustomEvent('favorites-updated', { detail: { favorites } }));
        return favorites;
    },
    
    toggleFavorite(machine) {
        const favorites = this.getFavorites();
        const index = favorites.findIndex(m => m.id === machine.id);
        
        if (index !== -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push({ ...machine, favoritedAt: Date.now() });
        }
        
        this.saveFavorites(favorites);
        return favorites;
    },
    
    isFavorite(machineId) {
        return this.getFavorites().some(m => m.id === machineId);
    },
    
    // ==================== 保留機台 ====================
    getReserves() {
        const stored = localStorage.getItem(this.RESERVE_KEY);
        if (stored) {
            try {
                const reserves = JSON.parse(stored);
                const now = Date.now();
                return reserves.filter(r => !r.expiresAt || r.expiresAt > now);
            } catch (e) {
                return [];
            }
        }
        return [];
    },
    
    saveReserves(reserves) {
        localStorage.setItem(this.RESERVE_KEY, JSON.stringify(reserves));
        window.dispatchEvent(new CustomEvent('t-pachin:reserves-updated', {
            detail: reserves
        }));
        window.dispatchEvent(new CustomEvent('reserved-updated', { detail: { reserved: reserves } }));
        return reserves;
    },
    
    addReserve(machine, minutes = 30) {
        let reserves = this.getReserves();
        const now = Date.now();
        const expiresAt = now + minutes * 60 * 1000;
        
        const existingIndex = reserves.findIndex(r => r.id === machine.id);
        const reserveData = {
            ...machine,
            reserveTime: new Date(expiresAt).toLocaleTimeString('zh-TW', {
                hour: '2-digit', minute: '2-digit'
            }),
            expiresAt: expiresAt,
            addedAt: now,
            reservedAt: now
        };
        
        if (existingIndex !== -1) {
            reserves[existingIndex] = reserveData;
        } else {
            reserves.push(reserveData);
        }
        
        this.saveReserves(reserves);
        return reserves;
    },
    
    removeReserve(machineId) {
        let reserves = this.getReserves();
        reserves = reserves.filter(r => r.id !== machineId);
        this.saveReserves(reserves);
        return reserves;
    },
    
    isReserved(machineId) {
        return this.getReserves().some(r => r.id === machineId);
    },
    
    // ==================== 玩過記錄 ====================
    getPlayed() {
        const stored = localStorage.getItem(this.PLAYED_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    },
    
    savePlayed(played) {
        localStorage.setItem(this.PLAYED_KEY, JSON.stringify(played));
        window.dispatchEvent(new CustomEvent('t-pachin:played-updated', {
            detail: played
        }));
        return played;
    },
    
    addPlayed(machine, coinsUsed = 0) {
        let played = this.getPlayed();
        const existingIndex = played.findIndex(p => p.id === machine.id);
        
        const playedData = {
            ...machine,
            playedDate: new Date().toLocaleDateString('zh-TW'),
            playedTime: new Date().toLocaleTimeString('zh-TW'),
            coinsUsed: coinsUsed,
            lastPlayed: Date.now()
        };
        
        if (existingIndex !== -1) {
            played[existingIndex] = { ...played[existingIndex], ...playedData };
        } else {
            played.unshift(playedData);
        }
        
        if (played.length > 50) played = played.slice(0, 50);
        
        this.savePlayed(played);
        return played;
    },
    
    // ==================== 機台佔用記錄 ====================
    getOccupiedTokens() {
        const stored = localStorage.getItem('t_pachin_occupied_tokens');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return {};
            }
        }
        return {};
    },
    
    saveOccupiedTokens(tokens) {
        localStorage.setItem('t_pachin_occupied_tokens', JSON.stringify(tokens));
    },
    
    setOccupiedToken(machineKey, tokens) {
        const occupied = this.getOccupiedTokens();
        occupied[machineKey] = tokens;
        this.saveOccupiedTokens(occupied);
    },
    
    removeOccupiedToken(machineKey) {
        const occupied = this.getOccupiedTokens();
        delete occupied[machineKey];
        this.saveOccupiedTokens(occupied);
    },
    
    // ==================== 導航高亮 (根據 data-page) ====================
    highlightCurrentNav() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const pageMap = {
            'index.html': 'index',
            'machines.html': 'machines',
            'news.html': 'news',
            'about.html': 'about'
        };
        const currentPage = pageMap[currentPath] || 'index';
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (page === currentPage) {
                item.classList.add('current-page');
            } else {
                item.classList.remove('current-page');
            }
        });
    },
    
    // ==================== 暱稱管理 ====================
    getNickname() {
        return this.getUserData().nickname;
    },
    
    setNickname(nickname) {
        if (nickname && nickname.trim()) {
            const userData = this.getUserData();
            userData.nickname = nickname.trim();
            this.saveUserData(userData);
            document.querySelectorAll('.nickname-display, .nickname-edit, #displayNickname').forEach(el => {
                el.textContent = nickname.trim();
            });
        }
        return nickname;
    }
};

// ==================== 導航列跳轉統一初始化 (所有頁面共用) ====================
function initGlobalNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        // 避免重複綁定
        if (item._navHandler) return;
        
        const handler = function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page === 'index') window.location.href = 'index.html';
            else if (page === 'machines') window.location.href = 'machines.html';
            else if (page === 'news') window.location.href = 'news.html';
            else if (page === 'about') window.location.href = 'about.html';
        };
        
        item._navHandler = handler;
        item.addEventListener('click', handler);
    });
    
    // Logo 跳轉 (如果有 .logo 元素)
    document.querySelectorAll('.logo').forEach(logo => {
        if (logo._logoHandler) return;
        const handler = function(e) {
            e.preventDefault();
            window.location.href = 'index.html';
        };
        logo._logoHandler = handler;
        logo.addEventListener('click', handler);
    });
    
    // 公告按鈕跳轉 (如果有 .combo-announce-btn)
    document.querySelectorAll('.combo-announce-btn').forEach(btn => {
        if (btn._announceHandler) return;
        const handler = function(e) {
            e.preventDefault();
            window.location.href = 'news.html';
        };
        btn._announceHandler = handler;
        btn.addEventListener('click', handler);
    });
}

// ==================== 倒數計時器管理 ====================
const CountdownManager = {
    intervals: {},
    
    startCountdown(elementId, expiresAt, onExpire, onUpdate) {
        if (this.intervals[elementId]) {
            clearInterval(this.intervals[elementId]);
        }
        
        const update = () => {
            const now = Date.now();
            const remaining = expiresAt - now;
            
            const el = document.getElementById(elementId);
            if (!el) return;
            
            if (remaining <= 0) {
                el.textContent = '已到期';
                el.classList.add('warning');
                if (onExpire) onExpire();
                clearInterval(this.intervals[elementId]);
                delete this.intervals[elementId];
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            el.textContent = timeStr;
            
            if (remaining <= 600000) {
                el.classList.add('warning');
            } else {
                el.classList.remove('warning');
            }
            
            if (onUpdate) onUpdate(remaining, timeStr);
        };
        
        update();
        this.intervals[elementId] = setInterval(update, 1000);
        return this.intervals[elementId];
    },
    
    stopCountdown(elementId) {
        if (this.intervals[elementId]) {
            clearInterval(this.intervals[elementId]);
            delete this.intervals[elementId];
        }
    },
    
    stopAll() {
        Object.keys(this.intervals).forEach(id => this.stopCountdown(id));
    }
};

// ==================== 初始化所有頁面共用功能 ====================
function initializeSharedFeatures() {
    // 套用儲存的深色模式設定
    const settings = T_PACHIN_STORAGE.getSettings();
    T_PACHIN_STORAGE.applySettingsToBody(settings);
    
    T_PACHIN_STORAGE.updateAllPointsDisplay();
    T_PACHIN_STORAGE.highlightCurrentNav();
    
    // 初始化全域導航
    initGlobalNavigation();
    
    // 監聽設定更新事件
    window.addEventListener('t-pachin:settings-updated', function(e) {
        const newSettings = e.detail;
        T_PACHIN_STORAGE.applySettingsToBody(newSettings);
    });
    
    window.addEventListener('t-pachin:user-updated', () => {
        T_PACHIN_STORAGE.updateAllPointsDisplay();
    });
    
    window.addEventListener('points-updated', (e) => {
        if (e.detail && e.detail.points !== undefined) {
            T_PACHIN_STORAGE.updateAllPointsDisplay();
        }
    });
    
    document.querySelectorAll('.points-display, #tokenBtn').forEach(el => {
        el.addEventListener('click', () => {
            alert(`💰 目前點數：${T_PACHIN_STORAGE.getPoints().toLocaleString()}\n\n遊玩機台即可累積點數！`);
        });
    });
    
    document.querySelectorAll('.nickname-display, .nickname-edit, #displayNickname').forEach(el => {
        el.addEventListener('click', () => {
            const currentName = T_PACHIN_STORAGE.getNickname();
            const newName = prompt('修改暱稱', currentName);
            if (newName && newName.trim()) {
                T_PACHIN_STORAGE.setNickname(newName.trim());
            }
        });
    });
    
    document.querySelectorAll('.vip-badge, #vipBadge').forEach(el => {
        el.addEventListener('click', () => {
            const userData = T_PACHIN_STORAGE.getUserData();
            alert(`VIP ${userData.vipLevel} 特權: 返水0.2%\n累積遊玩可提升 VIP 等級！`);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSharedFeatures);
} else {
    initializeSharedFeatures();
}

window.T_PACHIN_STORAGE = T_PACHIN_STORAGE;
window.CountdownManager = CountdownManager;
window.initializeSharedFeatures = initializeSharedFeatures;
window.initGlobalNavigation = initGlobalNavigation;

// 相容性別名
window.TPachin = {
    points: {
        get: () => T_PACHIN_STORAGE.getPoints(),
        set: (points) => T_PACHIN_STORAGE.setPoints(points),
        update: (delta) => T_PACHIN_STORAGE.updatePoints(delta),
        on: (callback) => {
            window.addEventListener('t-pachin:user-updated', (e) => callback(e.detail.points));
            callback(T_PACHIN_STORAGE.getPoints());
        }
    },
    favorites: {
        getAll: () => T_PACHIN_STORAGE.getFavorites(),
        add: (machine) => T_PACHIN_STORAGE.toggleFavorite(machine),
        remove: (id) => {
            const favorites = T_PACHIN_STORAGE.getFavorites();
            const newFavorites = favorites.filter(f => f.id !== id);
            T_PACHIN_STORAGE.saveFavorites(newFavorites);
        },
        is: (id) => T_PACHIN_STORAGE.isFavorite(id),
        on: (callback) => {
            window.addEventListener('t-pachin:favorites-updated', (e) => callback(e.detail));
            callback(T_PACHIN_STORAGE.getFavorites());
        }
    },
    reserved: {
        getAll: () => T_PACHIN_STORAGE.getReserves(),
        add: (machine) => T_PACHIN_STORAGE.addReserve(machine),
        remove: (id) => T_PACHIN_STORAGE.removeReserve(id),
        is: (id) => T_PACHIN_STORAGE.isReserved(id),
        on: (callback) => {
            window.addEventListener('t-pachin:reserves-updated', (e) => callback(e.detail));
            callback(T_PACHIN_STORAGE.getReserves());
        }
    },
    user: {
        getNickname: () => T_PACHIN_STORAGE.getNickname(),
        setNickname: (name) => T_PACHIN_STORAGE.setNickname(name)
    },
    settings: {
        get: () => T_PACHIN_STORAGE.getSettings(),
        set: (key, value) => T_PACHIN_STORAGE.updateSetting(key, value),
        on: (callback) => {
            window.addEventListener('t-pachin:settings-updated', (e) => callback(e.detail));
            callback(T_PACHIN_STORAGE.getSettings());
        }
    }
};
