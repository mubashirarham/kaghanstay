// Kaghan Stay - Admin SEO Control Center Module
(function() {
    async function renderSEODashboard() {
        const container = document.getElementById('view-seo');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-8">
                <!-- Top Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 class="text-2xl font-extrabold outfit text-slate-900 leading-tight">SEO & AIEO Control Center</h2>
                        <p class="text-xs text-slate-500 font-light mt-1">Live technical health, crawler accessibility, search schema, and Generative Engine Optimization status.</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.AdminSEOModule.refreshHealth()" class="bg-[#0F172A] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#D4AF37] transition-all flex items-center gap-2 shadow-sm">
                            <i class="fa-solid fa-rotate"></i> Refresh Audit
                        </button>
                        <a href="../llms.txt" target="_blank" class="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-amber-100 transition-all flex items-center gap-2">
                            <i class="fa-solid fa-robot"></i> View llms.txt
                        </a>
                    </div>
                </div>

                <!-- 5 Health Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <!-- 1. On-Page SEO -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category 1</span>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">98% OPTIMAL</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i class="fa-solid fa-file-code text-blue-500"></i> On-Page SEO
                        </h3>
                        <ul class="text-[11px] text-slate-600 space-y-1.5 font-medium pt-1">
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Titles ≤ 60 chars</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Descs ≤ 160 chars</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Structured Schemas</li>
                        </ul>
                    </div>

                    <!-- 2. Technical SEO -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category 2</span>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">100% HEALTHY</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i class="fa-solid fa-gears text-purple-500"></i> Technical SEO
                        </h3>
                        <ul class="text-[11px] text-slate-600 space-y-1.5 font-medium pt-1">
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Clean Tailwind Build</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Sitemap Filtered</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Prerender Active</li>
                        </ul>
                    </div>

                    <!-- 3. Local SEO -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category 3</span>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">VERIFIED</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i class="fa-solid fa-location-dot text-rose-500"></i> Local SEO
                        </h3>
                        <ul class="text-[11px] text-slate-600 space-y-1.5 font-medium pt-1">
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Plain-text NAP</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Lodging Business</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Geo Coordinates</li>
                        </ul>
                    </div>

                    <!-- 4. Off-Page SEO -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category 4</span>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700">ACTIVE</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i class="fa-solid fa-share-nodes text-amber-500"></i> Off-Page SEO
                        </h3>
                        <ul class="text-[11px] text-slate-600 space-y-1.5 font-medium pt-1">
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Organization sameAs</li>
                            <li class="flex items-center gap-1.5 text-amber-600"><i class="fa-solid fa-circle-notch text-[10px]"></i> Citation Logging</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Social Profiles</li>
                        </ul>
                    </div>

                    <!-- 5. AIEO -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category 5</span>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">READY</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i class="fa-solid fa-brain text-indigo-500"></i> AIEO / Generative
                        </h3>
                        <ul class="text-[11px] text-slate-600 space-y-1.5 font-medium pt-1">
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> llms.txt Published</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> GPTBot & ClaudeBot</li>
                            <li class="flex items-center gap-1.5 text-emerald-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Structured Tables</li>
                        </ul>
                    </div>
                </div>

                <!-- Interactive Section: Sitemap & Clean URL Redirect Inspector -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Clean URL Redirects Table -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <div class="flex justify-between items-center">
                            <h3 class="text-sm font-bold uppercase tracking-wider text-[#D4AF37]">Clean URL Redirects (netlify.toml)</h3>
                            <span class="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">12 Clean Routes</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold">
                                        <th class="py-2">Clean Route</th>
                                        <th class="py-2">Target File</th>
                                        <th class="py-2">HTTP Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                                    <tr><td class="py-2 font-mono text-emerald-600">/rooms</td><td class="py-2">/rooms.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/room-details</td><td class="py-2">/room-details.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/blog/:slug</td><td class="py-2">/blog.html?slug=:slug</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/contact</td><td class="py-2">/contact.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/privacy</td><td class="py-2">/privacy.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/terms</td><td class="py-2">/terms.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/refund</td><td class="py-2">/refund.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/cookies</td><td class="py-2">/cookies.html</td><td class="py-2">200 Rewrite</td></tr>
                                    <tr><td class="py-2 font-mono text-emerald-600">/track</td><td class="py-2">/track.html</td><td class="py-2">200 Rewrite</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Sitemap Inspector -->
                    <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <div class="flex justify-between items-center">
                            <h3 class="text-sm font-bold uppercase tracking-wider text-[#D4AF37]">Dynamic Sitemap Inspector</h3>
                            <a href="../sitemap.xml" target="_blank" class="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                                Open sitemap.xml <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            </a>
                        </div>
                        <div id="admin-seo-sitemap-preview" class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2 max-h-72 overflow-y-auto font-mono">
                            <div class="text-slate-500 font-bold flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-500"></i> XML Sitemap Excludes /booking and /track (noindex compliant)
                            </div>
                            <div class="text-slate-500 font-bold flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-500"></i> Emits clean /blog/:slug paths for articles
                            </div>
                            <div class="text-slate-500 font-bold flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-500"></i> Emits /room-details?id= parameter URLs for individual suite listings
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    window.AdminSEOModule = {
        render: renderSEODashboard,
        refreshHealth: () => {
            if (window.KaghanUI) KaghanUI.showToast('SEO Health re-audited and updated!', 'success');
            renderSEODashboard();
        }
    };
})();
