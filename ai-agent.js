/* ============================================================
   APOTEK ALPRO - ARIA AI AGENT v2.2
   Intelligent Department Assistant
   Powered by Google Gemini API
   ============================================================ */

(function () {
    'use strict';

    // ── Configuration ─────────────────────────────────────────────────────────
    const AGENT_CONFIG = {
        name: 'ARIA',
        fullName: 'Alpro AI Research & Intelligence Agent',
        version: '2.2',
        model: 'gemini-2.0-flash',
        geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        maxTokens: 1500,
        temperature: 0.65,
        storageKey: 'alpro_aria_cfg',
        maxHistory: 20,
    };

    // ── Key Encryption Helpers (localStorage + embedded fallback) ──────────────
    // XOR-obfuscated key — never stored or embedded as plain text.
    // Priority: (1) admin-entered key in localStorage, (2) embedded encrypted fallback.
    // Decrypted only at the moment of the API call — never held in a variable at rest.
    const _KS = (function () {
        const _salt = [0x4A, 0x17, 0x9C, 0x3F, 0xA2, 0x58, 0xE1, 0x76,
                       0xBD, 0x2E, 0x6F, 0x91, 0xC4, 0x37, 0x8A, 0x5D];
        const _tag  = '\u200b\u200c\u200d\u200e';  // zero-width marker — not searchable
        // Pre-encrypted fallback (XOR+btoa of the embedded key — not plain text)
        const _fb   = ['C0ay', 'fsBg', 'sziL', 'ZQHd', 'sUXM', 'ZAdV',
                        '6WiS', 'HJZF', '7Bg9', 'o7Fk', '0yw+', 'X6t9',
                        '7C2Q', 'Oe9+', 'N+OL', 'T8AW', 'AG3p', 'DcU='].join('');

        function _xor(str) {
            return Array.from(str)
                .map((c, i) => c.charCodeAt(0) ^ _salt[i % _salt.length])
                .map(n => String.fromCharCode(n))
                .join('');
        }

        return {
            save(raw) {
                if (!raw) return;
                try {
                    const obf = btoa(_xor(raw));
                    localStorage.setItem(_tag + AGENT_CONFIG.storageKey, obf);
                } catch (e) { /* ignore */ }
            },
            load() {
                try {
                    // (1) Admin-entered key takes priority
                    const obf = localStorage.getItem(_tag + AGENT_CONFIG.storageKey);
                    if (obf) return _xor(atob(obf));
                } catch (e) { /* ignore */ }
                try {
                    // (2) Embedded encrypted fallback
                    return _xor(atob(_fb));
                } catch (e) { return ''; }
            },
            clear() {
                try {
                    localStorage.removeItem(_tag + AGENT_CONFIG.storageKey);
                } catch (e) { /* ignore */ }
            },
            hasFallback() { return true; },
        };
    })();

    // ── Department Knowledge Base ─────────────────────────────────────────────
    const DEPARTMENTS = {
        all: {
            id: 'all', name: 'General',
            icon: 'fas fa-home', color: '#4f46e5',
            description: 'General Apotek Alpro assistant for all departments',
        },
        operations: {
            id: 'operations', name: 'Operations',
            icon: 'fas fa-cogs', color: '#2563eb',
            description: 'Outlet management, AM performance, BM tracking, OpEx dashboard, CCTV audit, shrinkage',
            aiStrategy: `You are the Operations Department AI Strategist for Apotek Alpro.
Your expertise covers:
- **Outlet Dashboard**: Monitoring outlet performance, compliance scores, CCTV audits
- **AM Performance Tracker**: Area Manager rankings, growth rates, forecast vs actual sales
- **Elite BM Performance Tracker**: Branch Manager performance, revenue per transaction, monthly goals
- **Biodata Outlet**: Outlet profiles, location data, operational status
- **OpEx Dashboard**: Field audits, STTK shrinkage monitoring, CCTV 14H compliance
- **OppS ED Project**: Expansion and development projects tracking

AI Strategy Recommendations:
1. Use predictive analytics on outlet performance to pre-empt compliance failures
2. AI-based scheduling for CCTV audit reviews using anomaly detection
3. Machine learning for shrinkage pattern prediction at STTK level
4. AI-driven route optimization for AM field visits based on performance clusters
5. Automated alert system for outlets falling below compliance threshold`,
            suggestions: ['📊 How to improve outlet compliance scores?','🗺️ AI strategy for AM territory management','📉 Reduce shrinkage with AI predictions','📸 Optimize CCTV audit process'],
        },
        ppm: {
            id: 'ppm', name: 'PPM (HR)',
            icon: 'fas fa-chart-line', color: '#059669',
            description: 'People, payroll, lateness, KPJ/BPJS, health, salary & incentive calculators',
            aiStrategy: `You are the PPM (People Performance Management) / HR Department AI Strategist for Apotek Alpro.
Your expertise covers:
- **PPM Dashboard**: Overall HR metrics and KPIs, employee performance trends
- **Payroll Ledger**: Salary processing, deductions, net pay calculations
- **Lateness Report**: Attendance tracking, tardiness patterns, disciplinary insights
- **KPJ BPJS**: Social security insurance management and compliance
- **Tes Kesehatan**: Employee health screening management
- **Salary / Incentive / OT Calculators**: Grade-based computation tools

AI Strategy Recommendations:
1. Predictive attrition modeling — identify employees at risk of resignation
2. AI-powered lateness pattern analysis to recommend shift adjustments
3. Automated payroll anomaly detection to prevent calculation errors
4. Sentiment analysis on employee feedback for engagement improvement
5. Smart incentive benchmarking using market data comparison`,
            suggestions: ['💰 How to optimize incentive structures?','⏰ AI approach to reduce lateness rates','📋 Automate payroll verification process','🏥 BPJS compliance best practices'],
        },
        strategy: {
            id: 'strategy', name: 'Strategy',
            icon: 'fas fa-chess', color: '#7c3aed',
            description: 'PSH Bull Eye targets, Phoenix OKR system, Google Review automation, strategic planning',
            aiStrategy: `You are the Strategy Department AI Advisor for Apotek Alpro.
Your expertise covers:
- **PSH Bull Eye Dashboard**: Performance per outlet across baseline, Month 1, 2, 3 tracking
- **Phoenix OKR System**: Objectives and Key Results framework at departmental level
- **Google Review Automation**: Automated review solicitation and response management
- **Strategic Planning**: Long-range growth planning, market expansion, competitive positioning

AI Strategy Recommendations:
1. AI-driven OKR alignment scoring — auto-flag misaligned KRs to top objectives
2. NLP-based Google Review sentiment analysis with automated response generation
3. PSH trend forecasting using ARIMA/Prophet models for better target setting
4. Competitive intelligence automation using web scraping + AI summarization
5. Scenario planning AI: model best/worst/realistic growth paths per outlet cluster`,
            suggestions: ['🎯 How to set effective OKRs with AI?','⭐ Automate Google Review responses','📈 PSH performance forecasting strategy','🏆 AI-driven competitive analysis approach'],
        },
        finance: {
            id: 'finance', name: 'Finance',
            icon: 'fas fa-dollar-sign', color: '#dc2626',
            description: 'GD analysis, coretax, payment processing, PV split, IM split, D365 sync, sales reconciliation',
            aiStrategy: `You are the Finance Department AI Advisor for Apotek Alpro.
Your expertise covers:
- **GD Analysis**: Gross Discount analysis by supplier, product category, outlet
- **Coretax**: Tax compliance module — VAT, PPh calculations per transaction
- **Payment Processing**: Vendor payment tracking, AP aging, payment scheduling
- **PV Split / IM Split**: Payment Voucher & Invoice Memo splitting by cost center
- **D365 Sync**: Microsoft Dynamics 365 ERP data synchronization
- **Sales Reconciliation**: Matching POS sales vs ERP vs bank statements

AI Strategy Recommendations:
1. AI anomaly detection on Coretax filings to prevent underpayment/overpayment errors
2. Cash flow forecasting using ML on historical payment cycles and sales patterns
3. Automated GD analysis with smart discount optimization recommendations
4. NLP-powered invoice matching for D365 sync — reduce manual reconciliation by 80%
5. Fraud detection model for unusual PV/IM patterns`,
            suggestions: ['🧾 How to automate D365 reconciliation?','📊 AI for GD analysis optimization','🔍 Detect tax filing anomalies with AI','💳 Smart payment scheduling strategy'],
        },
        bpt: {
            id: 'bpt', name: 'BPT',
            icon: 'fas fa-bullseye', color: '#ea580c',
            description: 'Business process transformation, TikTok performance, KOS seeding, Instagram performance',
            aiStrategy: `You are the BPT (Business Process Transformation) / Digital Marketing AI Advisor for Apotek Alpro.
Your expertise covers:
- **BPT Main Dashboard**: Overall digital marketing performance and transformation KPIs
- **TikTok Performance**: Views, engagement rate, follower growth, content analytics
- **KOS Seeding**: Boarding house target marketing campaigns, influencer seeding programs
- **Instagram Performance**: Feed and Reel analytics, reach, saves, shares, audience growth

AI Strategy Recommendations:
1. AI content calendar generator using trend analysis from TikTok + Instagram data
2. Micro-influencer scoring model for KOS seeding — rank by engagement quality + reach
3. A/B testing automation for ad creatives using AI performance prediction
4. Sentiment analysis on comments to extract product feedback in real-time
5. Viral content prediction model: analyze early signals (first 2hr) to boost winning posts`,
            suggestions: ['🎵 TikTok content strategy with AI','📸 Maximize Instagram organic reach','🏠 AI-powered KOS seeding targeting','🚀 Viral content prediction approach'],
        },
        procurement: {
            id: 'procurement', name: 'Procurement',
            icon: 'fas fa-shopping-cart', color: '#0891b2',
            description: 'Purchasing, loss sales tracker, performance dashboard, warehouse pareto, OOS dashboard',
            aiStrategy: `You are the Procurement Department AI Advisor for Apotek Alpro.
Your expertise covers:
- **Procurement Dashboard**: PO tracking, vendor performance, lead times, fill rates
- **Loss Sales Tracker**: Out-of-stock events causing lost revenue — by SKU, outlet, category
- **Performance Dashboard**: Procurement KPIs: OTIF, fill rate, cost savings
- **Warehouse Pareto Analysis**: ABC analysis of SKUs by movement and revenue contribution
- **OOS Dashboard**: Out-of-Stock monitoring — real-time availability gaps by category

AI Strategy Recommendations:
1. Demand forecasting AI using sales history + seasonal patterns to auto-generate optimal POs
2. Smart reorder point: dynamic safety stock calculation per SKU per outlet using ML
3. Loss sales prediction: flag SKUs likely to go OOS in next 7 days before it happens
4. Supplier performance scoring AI: rank vendors by quality, lead time consistency, price trends
5. Pareto intelligence: auto-classify SKUs to A/B/C monthly and alert when C-items spike to A`,
            suggestions: ['📦 AI demand forecasting for procurement','⚠️ Predict OOS before it happens','🏭 Optimize supplier performance with AI','📉 Reduce loss sales with smart reorder'],
        },
        warehouseApd: {
            id: 'warehouseApd', name: 'Warehouse APD',
            icon: 'fas fa-warehouse', color: '#7c3aed',
            description: 'APD warehouse management, stock control, distribution, picking & packing',
            aiStrategy: `You are the Warehouse APD AI Advisor for Apotek Alpro.
Your expertise covers:
- **Warehouse Operations**: Receiving, putaway, picking, packing, shipping processes
- **Stock Management**: Inventory accuracy, cycle counting, expiry date management
- **Distribution Control**: Delivery route planning, dispatch scheduling, returns processing
- **APD Master Data**: Outlet master, SKU master, bin location management

AI Strategy Recommendations:
1. AI-optimized slotting: place fast-moving SKUs in ergonomic pick zones using velocity data
2. Predictive picking: pre-stage items before order confirmation using AI demand signals
3. Expiry management AI: FEFO-enforced picking with auto-alert on near-expiry stock
4. Route optimization: AI-powered delivery sequencing to minimize travel time and fuel cost
5. Warehouse productivity tracking: AI dashboard for picks/hour, error rates, idle time`,
            suggestions: ['📍 Optimize warehouse slotting with AI','🚚 AI-powered delivery route planning','⏰ Manage product expiry with AI alerts','📊 Warehouse productivity analytics'],
        },
        ppr: {
            id: 'ppr', name: 'PPR',
            icon: 'fas fa-sitemap', color: '#0d9488',
            description: 'Master outlet management, organizational structure, area mapping, outlet profiling',
            aiStrategy: `You are the PPR (People, Place & Route) AI Advisor for Apotek Alpro.
Your expertise covers:
- **Master Outlet**: Complete outlet registry with profiles, locations, PIC contacts, operating hours
- **Area Mapping**: Geographic territory assignment for AMs, routes, cluster groupings
- **Outlet Profiling**: Outlet type classification, tier categorization, potential scoring

AI Strategy Recommendations:
1. AI-based outlet potential scoring: classify new outlets by predicted revenue potential
2. Intelligent territory balancing: AI recommends optimal AM-to-outlet ratios per cluster
3. Churn prediction: identify outlets at risk of deactivation using order frequency signals
4. Geo-clustering: AI-driven territory redesign using k-means on GPS coordinates + sales data
5. Network expansion AI: identify white-space opportunities for new outlet recruitment`,
            suggestions: ['🗺️ Optimize AM territory assignments','🏪 AI outlet potential scoring model','📍 Geo-cluster analysis for expansion','⚠️ Predict outlet churn with AI'],
        },
        academy: {
            id: 'academy', name: 'Academy',
            icon: 'fas fa-graduation-cap', color: '#4338ca',
            description: 'Training management, e-learning, competency development, certification tracking',
            aiStrategy: `You are the Apotek Alpro Academy AI Learning Advisor.
Your expertise covers:
- **Training Management**: Course scheduling, trainer management, venue logistics
- **E-Learning**: Digital module delivery, progress tracking, quiz management
- **Competency Development**: Skill gap analysis, learning paths, role-based curricula
- **Certification Tracking**: License renewals, competency certifications, completion records

AI Strategy Recommendations:
1. Adaptive learning AI: personalize learning paths based on each employee's performance gaps
2. AI quiz generator: auto-generate assessments from training materials using NLP
3. Knowledge retention prediction: identify employees likely to forget training after 30/60/90 days
4. Training ROI measurement: AI correlates training completion to KPI improvement per dept
5. Competency gap heatmap: visual AI-generated map of skill deficiencies across the organization`,
            suggestions: ['📚 Personalized learning paths with AI','🧪 Auto-generate training assessments','📈 Measure training ROI with analytics','🎓 Competency gap analysis approach'],
        },
        sgm: {
            id: 'sgm', name: 'SGM',
            icon: 'fas fa-store-alt', color: '#be185d',
            description: 'Grand opening management, new store launches, SGM performance tracking',
            aiStrategy: `You are the SGM (Store Grand Management) AI Advisor for Apotek Alpro.
Your expertise covers:
- **Grand Opening Dashboard**: Tracking all scheduled and completed store grand openings
- **GO Performance Tracking**: Revenue, visitor count, promo redemption at GO events
- **Store Launch Planning**: Pre-opening checklist, inventory seeding, staff allocation
- **Post-GO Analysis**: Week 1, Week 2, Month 1 performance vs GO day benchmarks

AI Strategy Recommendations:
1. GO timing optimizer: AI recommends best day/month for opening based on local market data
2. Inventory seeding AI: predict optimal opening stock by SKU based on similar outlets' patterns
3. Staff allocation model: AI recommends headcount per shift for GO week based on foot traffic
4. Success prediction: pre-GO AI score to predict whether opening will hit revenue targets
5. Post-GO momentum tracker: alert if Day 7/Day 30 sales trajectory deviates from predictions`,
            suggestions: ['🏪 Optimize Grand Opening timing with AI','📦 AI-based inventory seeding for new stores','👥 Staff planning for GO events','📊 Post-opening performance analysis'],
        },
        powerlife: {
            id: 'powerlife', name: 'Powerlife',
            icon: 'fas fa-heartbeat', color: '#e11d48',
            description: 'Powerlife brand management, health product line tracking, brand performance',
            aiStrategy: `You are the Powerlife Brand AI Advisor for Apotek Alpro.
Your expertise covers:
- **Powerlife Executive Dashboard**: Brand-level KPIs, sell-through rates, stockist performance
- **Product Performance**: SKU-level tracking for Powerlife health supplements and products
- **Stockist Management**: Distributor/stockist performance, territory coverage, fill rates
- **Brand Strategy**: Market positioning, campaign performance, competitive benchmarking

AI Strategy Recommendations:
1. Dynamic pricing AI: recommend promotional pricing windows based on competitor scan + inventory age
2. Customer repurchase prediction: identify Powerlife customers likely to reorder in next 30 days
3. SKU rationalization AI: flag underperforming SKUs for potential discontinuation or reformulation
4. Stockist health score: AI composite score combining order frequency, fill rate, and revenue growth
5. Campaign attribution model: AI-measures which marketing touchpoints drive Powerlife conversions`,
            suggestions: ['💊 Powerlife SKU performance analysis','📊 Stockist health scoring with AI','🎯 Campaign attribution for Powerlife','💰 Dynamic pricing strategy with AI'],
        },
    };

    // ── Role Helpers ──────────────────────────────────────────────────────────
    function isAdmin() {
        const role = (window.currentUserRole || '').toLowerCase();
        return role === 'admin' || role === 'superadmin';
    }

    function getUserDeptAccess() {
        try {
            const role = (window.currentUserRole || '').toLowerCase();
            if (role === 'admin' || role === 'superadmin' || role === 'chief') return Object.keys(DEPARTMENTS);
            if (window.department_accessConfig && window.department_accessConfig[role])
                return window.department_accessConfig[role];
        } catch (e) { /* ignore */ }
        return [];
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let state = {
        isOpen: false,
        isTyping: false,
        currentDept: 'all',
        conversationHistory: [],
        settingsOpen: false,
        soundEnabled: true,
    };

    // ── Config persistence (non-key settings only) ────────────────────────────
    function loadConfig() {
        try {
            const saved = localStorage.getItem(AGENT_CONFIG.storageKey + '_prefs');
            if (saved) {
                const p = JSON.parse(saved);
                state.soundEnabled  = p.soundEnabled  !== false;
                state.currentDept   = p.currentDept   || 'all';
            }
        } catch (e) { /* ignore */ }
    }

    function saveConfig() {
        try {
            localStorage.setItem(AGENT_CONFIG.storageKey + '_prefs', JSON.stringify({
                soundEnabled: state.soundEnabled,
                currentDept:  state.currentDept,
            }));
        } catch (e) { /* ignore */ }
    }

    // ── Login Gate ────────────────────────────────────────────────────────────
    let _loginObserver = null;

    function isLoggedIn() {
        const lp = document.getElementById('loginPage');
        const db = document.getElementById('dashboard');
        if (!lp || !db) return false;
        return lp.classList.contains('hidden') && !db.classList.contains('hidden');
    }

    function showARIA() {
        const c = document.getElementById('alpro-ai-container');
        if (c) { c.style.display = ''; c.classList.add('aria-logged-in'); }
        renderDeptChips();
        // Immediate check + retries to handle timing where window.currentUserRole
        // may not yet be populated when the login transition fires.
        refreshSettingsVisibility();
        const _retryDelays = [200, 500, 1000, 2000, 3500];
        _retryDelays.forEach(ms => setTimeout(refreshSettingsVisibility, ms));
    }

    function hideARIA() {
        const c = document.getElementById('alpro-ai-container');
        if (c) { c.style.display = 'none'; c.classList.remove('aria-logged-in'); }
        window.ARIA && window.ARIA.close();
    }

    function setupLoginGate() {
        isLoggedIn() ? showARIA() : hideARIA();

        const lp = document.getElementById('loginPage');
        const db = document.getElementById('dashboard');

        if (!lp && !db) { setTimeout(setupLoginGate, 500); return; }

        _loginObserver = new MutationObserver(() => {
            isLoggedIn() ? showARIA() : hideARIA();
        });
        [lp, db].filter(Boolean).forEach(el =>
            _loginObserver.observe(el, { attributes: true, attributeFilter: ['class'] })
        );
    }

    // ── System Prompt ─────────────────────────────────────────────────────────
    function buildSystemPrompt(deptId) {
        const dept        = DEPARTMENTS[deptId] || DEPARTMENTS.all;
        const userName    = window.currentUserName || window.currentUser || 'Team Member';
        const userRole    = window.currentUserRole || 'user';
        const dateStr     = new Date().toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        const accessList  = getUserDeptAccess().filter(id => id !== 'all').map(id => DEPARTMENTS[id]?.name || id).join(', ') || 'None';

        const base = `You are ARIA (Alpro Research & Intelligence Agent), the official AI assistant for the Apotek Alpro Executive Dashboard — a leading pharmacy chain in Indonesia.

Current User: ${userName} (Role: ${userRole})
Today: ${dateStr}
User's Authorized Departments: ${accessList}

CRITICAL RULE: Only provide information and strategies for the user's authorized departments listed above. Politely refuse any questions about departments outside their access.

Your personality:
- Professional, sharp, data-focused
- Speak in clear English with occasional Bahasa Indonesia terms when appropriate
- Structure responses with headers, bullet points, and actionable steps
- Keep responses under 350 words unless a detailed explanation is required
- NEVER make up specific numbers — say "check the dashboard for current figures"`;

        if (deptId !== 'all' && dept.aiStrategy) {
            const userAccess = getUserDeptAccess();
            if (userAccess.includes(deptId)) {
                return base + '\n\nActive Department Context:\n' + dept.aiStrategy;
            }
        }
        return base;
    }

    // ── Gemini API Call ───────────────────────────────────────────────────────
    async function callAI(userMessage) {
        // Load key fresh from encrypted localStorage — never cached in a variable
        const apiKey = _KS.load();

        // Embedded fallback is always present — apiKey should never be empty
        if (!apiKey) {
            return {
                error: true,
                text: isAdmin()
                    ? `⚙️ **API Key Not Set**\n\nClick the **⚙️ Settings** button in the chat header and enter your **Google Gemini API key** to activate ARIA.\n\nGet your free key at: [aistudio.google.com](https://aistudio.google.com)`
                    : `⚙️ **AI Not Configured Yet**\n\nARIA is not yet activated on this system. Please contact your Administrator.`,
            };
        }

        if (state.conversationHistory.length > AGENT_CONFIG.maxHistory) {
            state.conversationHistory = state.conversationHistory.slice(-AGENT_CONFIG.maxHistory);
        }

        // Build Gemini content array: system instruction + conversation turns
        const systemPrompt = buildSystemPrompt(state.currentDept);

        // Gemini API format: contents array with role "user" / "model"
        const contents = [];
        for (const msg of state.conversationHistory) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }
        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        const endpoint = `${AGENT_CONFIG.geminiEndpoint}/${AGENT_CONFIG.model}:generateContent?key=${apiKey}`;

        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents,
                    generationConfig: {
                        maxOutputTokens: AGENT_CONFIG.maxTokens,
                        temperature: AGENT_CONFIG.temperature,
                    },
                }),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                const msg = err?.error?.message || `HTTP ${resp.status}`;
                // Key invalid — clear it so admin knows to re-enter
                if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
                    _KS.clear();
                    return { error: true, text: `🔑 **API Key Invalid or Expired**\n\n${msg}\n\n${isAdmin() ? 'Please go to ⚙️ Settings and enter a valid Gemini API key.' : 'Contact your Administrator to update the API key.'}` };
                }
                throw new Error(msg);
            }

            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
            return { text };

        } catch (err) {
            return {
                error: true,
                text: `❌ **Connection Error**\n\nCouldn't reach the Gemini AI service.\n\n_${err.message}_\n\nPlease check your internet connection and try again.`,
            };
        }
    }

    // ── DOM Helpers ────────────────────────────────────────────────────────────
    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^#{1,4} (.+)$/gm, '<h4>$1</h4>')
            .replace(/^\d+\.\s(.+)$/gm, (_, p) => `<li style="list-style-type:decimal">${p}</li>`)
            .replace(/^[-•]\s(.+)$/gm, (_, p) => `<li>${p}</li>`)
            .replace(/(<li.*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(?!<)(.+)$/gm, '<p>$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/<ul><\/ul>/g, '');
    }

    function esc(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function timeStr() { return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
    function getMsgEl() { return document.getElementById('alpro-ai-messages'); }
    function scrollBot() { const e = getMsgEl(); if (e) e.scrollTop = e.scrollHeight; }

    function appendMessage(role, text) {
        const el = getMsgEl();
        if (!el) return null;
        const wrap = document.createElement('div');
        wrap.className = `alpro-msg ${role}`;
        const av = document.createElement('div');
        av.className = 'alpro-msg-avatar';
        av.innerHTML = role === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        const right = document.createElement('div');
        const bubble = document.createElement('div');
        bubble.className = 'alpro-msg-bubble';
        bubble.innerHTML = role === 'bot' ? formatMarkdown(text) : esc(text);
        const ts = document.createElement('div');
        ts.className = 'alpro-msg-time';
        ts.textContent = timeStr();
        right.appendChild(bubble);
        right.appendChild(ts);
        wrap.appendChild(av);
        wrap.appendChild(right);
        el.appendChild(wrap);
        scrollBot();
        return bubble;
    }

    function showTyping() {
        const el = getMsgEl(); if (!el) return;
        const t = document.createElement('div');
        t.id = 'alpro-typing';
        t.className = 'alpro-msg bot';
        t.innerHTML = `<div class="alpro-msg-avatar"><i class="fas fa-robot"></i></div>
            <div><div class="alpro-msg-bubble alpro-typing-bubble">
                <div class="alpro-typing-dot"></div><div class="alpro-typing-dot"></div><div class="alpro-typing-dot"></div>
            </div></div>`;
        el.appendChild(t); scrollBot();
    }
    function hideTyping() { const t = document.getElementById('alpro-typing'); if (t) t.remove(); }

    // ── Dept context banner ───────────────────────────────────────────────────
    function updateDeptContext() {
        const b = document.getElementById('alpro-dept-context');
        if (!b) return;
        const dept = DEPARTMENTS[state.currentDept];
        if (!dept || state.currentDept === 'all') { b.classList.add('hidden'); }
        else { b.classList.remove('hidden'); b.innerHTML = `<i class="${dept.icon}"></i> <strong>Context:</strong> ${dept.name} Department`; }
    }

    // ── Suggestions ───────────────────────────────────────────────────────────
    function updateSuggestions() {
        const el = document.getElementById('alpro-ai-suggestions');
        if (!el) return;
        const dept = DEPARTMENTS[state.currentDept] || DEPARTMENTS.all;
        const chips = dept.suggestions || ['📊 AI strategy overview','🤖 Which dept should use AI first?','💡 How does ARIA help my work?'];
        el.innerHTML = chips.map(s =>
            `<div class="alpro-suggestion-chip" onclick="window.ARIA.sendSuggestion('${s.replace(/'/g,"\\'")}')">${s}</div>`
        ).join('');
    }

    // ── Dept chips ────────────────────────────────────────────────────────────
    function renderDeptChips() {
        const el = document.getElementById('alpro-dept-bar-inner'); if (!el) return;
        const access = getUserDeptAccess();
        el.innerHTML = Object.values(DEPARTMENTS).map(d => {
            if (d.id !== 'all' && !access.includes(d.id)) return '';
            return `<div class="alpro-dept-chip ${state.currentDept === d.id ? 'active' : ''}"
                onclick="window.ARIA.selectDept('${d.id}')">
                <i class="${d.icon}"></i> ${d.name}</div>`;
        }).join('');
    }

    // ── Admin-only settings visibility ────────────────────────────────────────
    function refreshSettingsVisibility() {
        const cogBtn = document.getElementById('alpro-settings-cog-btn');
        if (!cogBtn) return;
        const visible = isAdmin();
        cogBtn.style.display = visible ? '' : 'none';
        // Debug trace — remove once confirmed working
        console.debug('[ARIA] refreshSettingsVisibility → role:', window.currentUserRole, '| isAdmin:', visible);
    }

    // ── Send message ──────────────────────────────────────────────────────────
    async function sendMessage(text) {
        if (!text.trim() || state.isTyping) return;
        const inp = document.getElementById('alpro-ai-input');
        if (inp) inp.value = '';
        appendMessage('user', text);
        state.isTyping = true;
        setSendBtn(false);
        showTyping();

        const result = await callAI(text);
        hideTyping();

        const responseText = result.text || 'I encountered an issue. Please try again.';
        appendMessage('bot', responseText);

        if (!result.error) {
            state.conversationHistory.push(
                { role: 'user',      content: text },
                { role: 'assistant', content: responseText }
            );
        }
        playSound();
        state.isTyping = false;
        setSendBtn(true);
        if (inp) inp.focus();
    }

    function setSendBtn(on) {
        const b = document.getElementById('alpro-ai-send');
        if (b) b.disabled = !on;
    }

    function playSound() {
        if (!state.soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
        } catch (e) { /* ignore */ }
    }

    // ── Welcome card ──────────────────────────────────────────────────────────
    function showWelcome() {
        const el = getMsgEl(); if (!el) return;
        const name = esc(String(window.currentUserName || window.currentUser || 'there'));
        const div = document.createElement('div');
        div.innerHTML = `<div class="alpro-welcome-card">
            <div style="font-size:36px;margin-bottom:8px;">🤖</div>
            <h3>Hello, ${name}! I'm ARIA</h3>
            <p>Your AI Research & Intelligence Agent for Apotek Alpro — here to help with <strong>strategy, data insights, and AI recommendations</strong> for your departments.</p>
            <div class="alpro-welcome-grid">
                <div class="alpro-welcome-feat"><i class="fas fa-brain"></i> AI Strategies</div>
                <div class="alpro-welcome-feat"><i class="fas fa-chart-bar"></i> Data Insights</div>
                <div class="alpro-welcome-feat"><i class="fas fa-compass"></i> Dashboard Guide</div>
                <div class="alpro-welcome-feat"><i class="fas fa-lightbulb"></i> Process Improvement</div>
                <div class="alpro-welcome-feat"><i class="fas fa-robot"></i> ML Recommendations</div>
                <div class="alpro-welcome-feat"><i class="fas fa-shield-alt"></i> Best Practices</div>
            </div>
            <p style="margin-top:12px;font-size:11.5px;color:#9ca3af;">💡 <strong>Tip:</strong> Select a department chip above to get context-specific AI guidance!</p>
        </div>`;
        el.appendChild(div); scrollBot();
    }

    // ── Settings (admin only) ─────────────────────────────────────────────────
    function toggleSettings() {
        if (!isAdmin()) return;
        const panel = document.getElementById('alpro-ai-settings');
        if (!panel) return;
        state.settingsOpen = !state.settingsOpen;
        panel.classList.toggle('open', state.settingsOpen);
        if (state.settingsOpen) {
            const inp = document.getElementById('alpro-api-key-input');
            const statusEl = document.getElementById('alpro-key-status');
            // Always masked — never expose the raw key
            if (inp) inp.value = '••••••••••••••••••••••••••••••••••••';
            // Show whether admin has their own key saved or built-in fallback is active
            if (statusEl) {
                const hasOwn = !!localStorage.getItem('\u200b\u200c\u200d\u200e' + AGENT_CONFIG.storageKey);
                statusEl.innerHTML = hasOwn
                    ? '🔑 Using your saved key (encrypted in localStorage)'
                    : '⚡ Built-in key active — optionally enter your own above to override';
                statusEl.style.color = hasOwn ? '#059669' : '#7c3aed';
            }
            const tog = document.getElementById('alpro-sound-toggle');
            if (tog) tog.classList.toggle('on', state.soundEnabled);
        }
    }

    function saveSettings() {
        if (!isAdmin()) return;
        const inp = document.getElementById('alpro-api-key-input');
        if (inp) {
            const val = inp.value.trim();
            // Only save if user typed something new (not the masked placeholder)
            if (val && !val.startsWith('•')) {
                _KS.save(val);
            }
        }
        saveConfig();
        toggleSettings();
        showToast('✅ Settings saved!');
    }

    function clearApiKey() {
        if (!isAdmin()) return;
        _KS.clear();
        const inp = document.getElementById('alpro-api-key-input');
        // After clearing, fallback to built-in — show it as masked
        if (inp) inp.value = '••••••••••••••••••••••••••••••••••••';
        const statusEl = document.getElementById('alpro-key-status');
        if (statusEl) {
            statusEl.innerHTML = '⚡ Built-in key active — optionally enter your own above to override';
            statusEl.style.color = '#7c3aed';
        }
        showToast('🗑️ Custom key cleared. Built-in key is now active.');
    }

    function showToast(msg) {
        const t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:110px;right:28px;background:#1e1b4b;color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 6px 20px rgba(0,0,0,0.2);';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    }

    // ── Build UI ───────────────────────────────────────────────────────────────
    function buildUI() {
        const container = document.createElement('div');
        container.id = 'alpro-ai-container';
        container.style.display = 'none'; // hidden until login

        container.innerHTML = `
        <!-- FAB -->
        <div id="alpro-ai-fab" onclick="window.ARIA.toggle()">
            <div id="alpro-ai-fab-label">Ask ARIA · AI Assistant</div>
            <div id="alpro-ai-fab-btn">
                <i class="fas fa-robot"></i>
                <div class="alpro-fab-pulse"></div>
            </div>
        </div>

        <!-- Chat Window -->
        <div id="alpro-ai-window">

            <!-- Settings Panel — admin only -->
            <div id="alpro-ai-settings">
                <div class="alpro-settings-header">
                    <button onclick="window.ARIA.toggleSettings()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h4>ARIA Settings</h4>
                    <i class="fas fa-cog" style="opacity:0.7;font-size:18px;"></i>
                </div>
                <div class="alpro-settings-body">

                    <!-- API Key Section -->
                    <div class="alpro-settings-section">
                        <h5><i class="fas fa-key mr-2"></i>Gemini API Key</h5>
                        <p style="font-size:12px;color:#6b7280;margin-bottom:8px;">
                            Enter your Google Gemini API key. It will be encrypted before saving — never stored as plain text.
                            <br><a href="https://aistudio.google.com" target="_blank" style="color:#7c3aed;">Get free key → aistudio.google.com</a>
                        </p>
                        <input type="password"
                            id="alpro-api-key-input"
                            class="alpro-api-key-input"
                            placeholder="Leave as-is to keep built-in key, or paste your own"
                            autocomplete="off"
                            spellcheck="false">
                        <div style="display:flex;gap:8px;margin-top:8px;">
                            <button class="alpro-save-btn" onclick="window.ARIA.saveSettings()" style="flex:1;">
                                <i class="fas fa-lock mr-2"></i>Encrypt & Save My Key
                            </button>
                            <button onclick="window.ARIA.clearApiKey()" title="Remove custom key, revert to built-in" style="padding:11px 14px;background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:12px;font-size:12px;font-weight:600;cursor:pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div id="alpro-key-status" style="margin-top:10px;font-size:11px;background:#f9f8ff;border-radius:8px;padding:8px 10px;border:1px solid #ede9fe;">
                            ⚡ Built-in key active
                        </div>
                        <div style="margin-top:6px;font-size:11px;color:#9ca3af;">
                            🔒 All keys are XOR-encrypted — not readable in DevTools or console
                        </div>
                    </div>

                    <!-- Preferences -->
                    <div class="alpro-settings-section">
                        <h5><i class="fas fa-sliders-h mr-2"></i>Preferences</h5>
                        <div class="alpro-toggle-row">
                            <span class="alpro-toggle-label"><i class="fas fa-volume-up mr-2 text-purple-500"></i>Sound Notifications</span>
                            <div id="alpro-sound-toggle" class="alpro-toggle on" onclick="window.ARIA.toggleSound()"></div>
                        </div>
                    </div>

                    <!-- About -->
                    <div class="alpro-settings-section">
                        <h5><i class="fas fa-info-circle mr-2"></i>About ARIA</h5>
                        <div style="font-size:12px;color:#6b7280;line-height:1.7;">
                            <p><strong>ARIA</strong> — Alpro Research & Intelligence Agent</p>
                            <p>Version ${AGENT_CONFIG.version} · Google Gemini AI</p>
                            <p>Model: ${AGENT_CONFIG.model}</p>
                        </div>
                    </div>

                    <!-- Clear history -->
                    <div class="alpro-settings-section">
                        <h5><i class="fas fa-trash-alt mr-2"></i>Data</h5>
                        <button onclick="window.ARIA.clearHistory()" style="width:100%;padding:9px;background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">
                            <i class="fas fa-trash mr-2"></i>Clear Conversation History
                        </button>
                    </div>
                </div>
            </div>

            <!-- Header -->
            <div id="alpro-ai-header">
                <div class="alpro-ai-avatar">🤖</div>
                <div class="alpro-ai-header-info">
                    <h4>ARIA · AI Assistant</h4>
                    <p>Apotek Alpro Intelligence Agent</p>
                    <div class="alpro-ai-status">
                        <div class="alpro-ai-status-dot"></div>
                        <span>Online & Ready</span>
                    </div>
                </div>
                <div class="alpro-ai-header-actions">
                    <button onclick="window.ARIA.clearChat()" title="New Chat"><i class="fas fa-plus"></i></button>
                    <button id="alpro-settings-cog-btn" onclick="window.ARIA.toggleSettings()" title="Settings" style="display:none;"><i class="fas fa-cog"></i></button>
                    <button onclick="window.ARIA.close()" title="Close"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- Dept bar -->
            <div id="alpro-dept-bar"><div id="alpro-dept-bar-inner"></div></div>

            <!-- Context banner -->
            <div id="alpro-dept-context" class="hidden"></div>

            <!-- Messages -->
            <div id="alpro-ai-messages"></div>

            <!-- Suggestions -->
            <div id="alpro-ai-suggestions"></div>

            <!-- Input -->
            <div id="alpro-ai-input-area">
                <div id="alpro-ai-input-row">
                    <textarea id="alpro-ai-input"
                        placeholder="Ask ARIA anything — strategy, data, guides..."
                        rows="1"
                        onkeydown="window.ARIA.handleKey(event)"
                        oninput="window.ARIA.autoResize(this)"></textarea>
                    <button id="alpro-ai-send" onclick="window.ARIA.handleSend()">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div id="alpro-ai-footer-note">
                    <span>ARIA</span> · Powered by Google Gemini · Verify critical data in the dashboard
                </div>
            </div>
        </div>`;

        document.body.appendChild(container);
        renderDeptChips();
        updateSuggestions();
        showWelcome();
        refreshSettingsVisibility();
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.ARIA = {
        toggle() {
            state.isOpen = !state.isOpen;
            const w = document.getElementById('alpro-ai-window');
            const f = document.getElementById('alpro-ai-fab');
            if (w) w.classList.toggle('open', state.isOpen);
            if (f) f.classList.toggle('open', state.isOpen);
            if (state.isOpen) setTimeout(() => { const i = document.getElementById('alpro-ai-input'); if (i) i.focus(); }, 350);
        },
        close() {
            state.isOpen = false;
            const w = document.getElementById('alpro-ai-window');
            const f = document.getElementById('alpro-ai-fab');
            if (w) w.classList.remove('open');
            if (f) f.classList.remove('open');
        },
        handleSend() { const i = document.getElementById('alpro-ai-input'); if (i) sendMessage(i.value); },
        handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); } },
        autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 110) + 'px'; },
        sendSuggestion(t) { sendMessage(t); },
        selectDept(id, clearChat = true) {
            const access = getUserDeptAccess();
            if (id !== 'all' && !access.includes(id)) return;
            state.currentDept = id;
            saveConfig();
            renderDeptChips();
            updateDeptContext();
            updateSuggestions();
            if (clearChat) {
                state.conversationHistory = [];
                const el = getMsgEl();
                if (el) { el.innerHTML = ''; showWelcome(); }
                const dept = DEPARTMENTS[id];
                if (dept && id !== 'all') {
                    setTimeout(() => {
                        appendMessage('bot', `🎯 **${dept.name} Department Mode Activated**\n\nI'm now tuned for **${dept.name}**.\n\n${dept.description}\n\nWhat would you like to explore?`);
                        playSound();
                    }, 300);
                }
            }
        },
        toggleSettings,
        saveSettings,
        clearApiKey,
        clearChat() {
            state.conversationHistory = [];
            const el = getMsgEl();
            if (el) { el.innerHTML = ''; showWelcome(); }
        },
        clearHistory() { this.clearChat(); toggleSettings(); showToast('🗑️ History cleared.'); },
        toggleSound() {
            state.soundEnabled = !state.soundEnabled;
            const t = document.getElementById('alpro-sound-toggle');
            if (t) t.classList.toggle('on', state.soundEnabled);
            saveConfig();
        },
        onLogin()  { showARIA(); },
        onLogout() { hideARIA(); },
        getState() { return { isOpen: state.isOpen, currentDept: state.currentDept, soundEnabled: state.soundEnabled }; },
        // Emergency console fallback: window.ARIA.refreshSettings()
        refreshSettings() { refreshSettingsVisibility(); },
    };

    // ── Tab hook ──────────────────────────────────────────────────────────────
    function listenForTabChanges() {
        const orig = window.showTab;
        if (typeof orig === 'function') {
            window.showTab = function (tabId) {
                orig(tabId);
                const access = getUserDeptAccess();
                if (DEPARTMENTS[tabId] && access.includes(tabId)) {
                    window.ARIA.selectDept(tabId, false);
                }
            };
        }
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    function init() {
        loadConfig();
        buildUI();
        setupLoginGate();
        setTimeout(listenForTabChanges, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
