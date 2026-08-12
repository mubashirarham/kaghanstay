// Kaghan Stay - Admin Blog & Article Management Module
(function() {
    let tinymceInitialized = false;

    function initBlogTinyMCE() {
        if (typeof tinymce === 'undefined') return;
        const textarea = document.getElementById('blog-content');
        if (!textarea) return;

        if (tinymce.get('blog-content')) {
            tinymce.get('blog-content').remove();
        }

        tinymce.init({
            selector: '#blog-content',
            height: 480,
            menubar: 'edit view insert format table help',
            plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount',
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | link image media table | code fullscreen',
            content_style: 'body { font-family:Inter,sans-serif; font-size:14px; color:#334155; line-height:1.7; padding:12px; }',
            setup: (editor) => {
                editor.on('init', () => {
                    tinymceInitialized = true;
                });
            }
        });
    }

    let cachedBlogs = [];
    let adminBlogsPage = 1;
    const adminBlogsPerPage = 5;

    async function renderBlogs() {
        const blogs = await KaghanDB.getBlogs();
        cachedBlogs = blogs;
        const tbody = document.getElementById('admin-blogs-tbody');
        const emptyState = document.getElementById('blogs-empty-state');

        if (!tbody) return;

        // Filter blogs by portal === 'stay' or default
        const filtered = blogs.filter(b => !b.portal || b.portal === 'stay');

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            const pagContainer = document.getElementById('admin-blogs-pagination');
            if (pagContainer) pagContainer.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        const totalPages = Math.ceil(filtered.length / adminBlogsPerPage);
        if (adminBlogsPage > totalPages) adminBlogsPage = 1;

        const startIndex = (adminBlogsPage - 1) * adminBlogsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + adminBlogsPerPage);

        tbody.innerHTML = paginated.map(blog => {
            const img = blog.imageUrl || '../assets/images/logo.png';
            const slug = blog.slug || blog.id;
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="py-3 px-2">
                        <div class="flex items-center gap-3">
                            <img src="${KaghanSafe.escapeHTML(img)}" alt="${KaghanSafe.escapeHTML(blog.title)}" class="w-12 h-10 object-cover rounded-lg border border-slate-200 shadow shrink-0" onerror="this.src='../assets/images/logo.png'">
                            <div class="overflow-hidden">
                                <a href="../blog-details.html?slug=${encodeURIComponent(slug)}" target="_blank" class="font-bold text-slate-800 text-xs hover:text-[#D4AF37] transition-colors truncate block">
                                    ${KaghanSafe.escapeHTML(blog.title)} <i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400"></i>
                                </a>
                                <span class="text-[9px] text-[#D4AF37] uppercase font-bold tracking-wider block truncate">${KaghanSafe.escapeHTML(blog.category || 'Guide')}</span>
                                <span class="text-[9px] text-slate-400 block font-mono truncate">/blog/${KaghanSafe.escapeHTML(slug)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-2 text-right shrink-0">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="editBlogRecord('${blog.id}')" class="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#D4AF37] hover:text-white transition-all flex items-center gap-1">
                                <i class="fa-solid fa-pen-to-square text-[9px]"></i> Edit
                            </button>
                            <button onclick="deleteBlogRecord('${blog.id}')" class="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1">
                                <i class="fa-solid fa-trash-can text-[9px]"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.KaghanUI && window.KaghanUI.renderPaginationControls) {
            KaghanUI.renderPaginationControls({
                container: 'admin-blogs-pagination',
                currentPage: adminBlogsPage,
                totalPages: totalPages,
                totalItems: filtered.length,
                itemsPerPage: adminBlogsPerPage,
                onPageChange: (p) => {
                    adminBlogsPage = p;
                    renderBlogs();
                }
            });
        }
    }

    window.editBlogRecord = (blogId) => {
        const blog = cachedBlogs.find(b => b.id === blogId);
        if (!blog) {
            if (window.KaghanUI) KaghanUI.showToast("Blog article not found.", "error");
            return;
        }

        const idInput = document.getElementById('blog-id');
        if (idInput) idInput.value = blog.id;

        document.getElementById('blog-title').value = blog.title || '';
        document.getElementById('blog-cat').value = blog.category || 'Travel Guide';
        document.getElementById('blog-author').value = blog.author || 'Resort Manager';
        document.getElementById('blog-img').value = blog.imageUrl || '';
        document.getElementById('blog-excerpt').value = blog.excerpt || '';

        document.getElementById('blog-seo-title').value = blog.seoTitle || '';
        document.getElementById('blog-seo-desc').value = blog.seoDescription || '';
        document.getElementById('blog-seo-keywords').value = blog.seoKeywords || '';
        document.getElementById('blog-seo-slug').value = blog.slug || '';
        document.getElementById('blog-seo-index').value = blog.seoIndex || 'index, follow';

        if (typeof tinymce !== 'undefined' && tinymce.get('blog-content')) {
            tinymce.get('blog-content').setContent(blog.content || '');
        } else {
            document.getElementById('blog-content').value = blog.content || '';
        }

        const submitBtnText = document.getElementById('blog-btn-text');
        const submitBtnIcon = document.getElementById('blog-btn-icon');
        const cancelBtn = document.getElementById('blog-cancel-edit-btn');

        if (submitBtnText) submitBtnText.textContent = 'Update Journal Article';
        if (submitBtnIcon) submitBtnIcon.className = 'fa-solid fa-floppy-disk text-xs';
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const form = document.getElementById('blog-form');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (window.KaghanUI) KaghanUI.showToast(`Editing article: "${blog.title}"`, 'info');
    };

    window.cancelBlogEdit = () => {
        const idInput = document.getElementById('blog-id');
        if (idInput) idInput.value = '';

        const form = document.getElementById('blog-form');
        if (form) form.reset();

        if (typeof tinymce !== 'undefined' && tinymce.get('blog-content')) {
            tinymce.get('blog-content').setContent('');
        }
        document.getElementById('blog-author').value = "Resort Manager";

        const submitBtnText = document.getElementById('blog-btn-text');
        const submitBtnIcon = document.getElementById('blog-btn-icon');
        const cancelBtn = document.getElementById('blog-cancel-edit-btn');

        if (submitBtnText) submitBtnText.textContent = 'Publish Journal Article';
        if (submitBtnIcon) submitBtnIcon.className = 'fa-solid fa-plus text-xs';
        if (cancelBtn) cancelBtn.classList.add('hidden');
    };

    window.deleteBlogRecord = async (blogId) => {
        if (!confirm(`Are you sure you want to permanently delete this blog post?`)) return;

        const success = await KaghanDB.deleteBlog(blogId);
        if (success) {
            KaghanUI.showToast("Blog article deleted successfully.", "success");
            if (document.getElementById('blog-id')?.value === blogId) {
                window.cancelBlogEdit();
            }
            if (window.AdminBlogsModule) {
                await window.AdminBlogsModule.render();
            }
        } else {
            KaghanUI.showToast("Failed to delete blog article.", "error");
        }
    };

    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    window.generateBlogAI = async () => {
        const topic = document.getElementById('blog-title').value.trim() || prompt("Enter blog topic or article subject:");
        if (!topic) {
            if (window.KaghanUI) KaghanUI.showToast("Please enter a blog title or topic first.", "error");
            return;
        }

        const category = document.getElementById('blog-cat').value;
        const author = document.getElementById('blog-author').value.trim() || 'Resort Travel Specialist';

        if (window.KaghanUI) KaghanUI.showToast("✨ Groq AI is writing your article...", "info");

        try {
            const res = await window.safeFetch('/.netlify/functions/generate-blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, category, author })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();

            // Populate form fields
            if (data.title) document.getElementById('blog-title').value = data.title;
            if (data.excerpt) document.getElementById('blog-excerpt').value = data.excerpt;
            if (data.seoTitle) document.getElementById('blog-seo-title').value = data.seoTitle;
            if (data.seoDescription) document.getElementById('blog-seo-desc').value = data.seoDescription;
            if (data.seoKeywords) document.getElementById('blog-seo-keywords').value = data.seoKeywords;
            if (data.slug) document.getElementById('blog-seo-slug').value = data.slug;

            // Set TinyMCE content
            if (typeof tinymce !== 'undefined' && tinymce.get('blog-content')) {
                tinymce.get('blog-content').setContent(data.content || '');
            } else {
                document.getElementById('blog-content').value = data.content || '';
            }

            if (window.KaghanUI) KaghanUI.showToast(`✨ Article generated using ${data.modelUsed || 'Groq AI'}!`, "success");

        } catch (err) {
            console.error("AI Blog Generation Error:", err);
            if (window.KaghanUI) KaghanUI.showToast(`AI Blog generation failed: ${err.message}`, "error");
        }
    };

    window.generateBlogSEOAI = async () => {
        const title = document.getElementById('blog-title').value.trim();
        const category = document.getElementById('blog-cat').value;
        const excerpt = document.getElementById('blog-excerpt').value.trim();
        let content = '';
        if (typeof tinymce !== 'undefined' && tinymce.get('blog-content')) {
            content = tinymce.get('blog-content').getContent();
        } else {
            content = document.getElementById('blog-content').value.trim();
        }

        if (!title && !content) {
            if (window.KaghanUI) KaghanUI.showToast("Please provide a title or article body content first.", "error");
            return;
        }

        if (window.KaghanUI) KaghanUI.showToast("✨ Groq AI is analyzing Search Intent & Meta Data...", "info");

        try {
            const res = await window.safeFetch('/.netlify/functions/generate-blog-seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, category, excerpt, content })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            if (data.seoTitle) document.getElementById('blog-seo-title').value = data.seoTitle;
            if (data.seoDescription) document.getElementById('blog-seo-desc').value = data.seoDescription;
            if (data.seoKeywords) document.getElementById('blog-seo-keywords').value = data.seoKeywords;
            if (data.slug) document.getElementById('blog-seo-slug').value = data.slug;

            if (window.KaghanUI) KaghanUI.showToast(`✨ Blog SEO metadata generated! Intent: ${data.searchIntent || 'Informational'}`, "success");

        } catch (err) {
            console.error("Blog SEO generation error:", err);
            if (window.KaghanUI) KaghanUI.showToast(`SEO generation failed: ${err.message}`, "error");
        }
    };

    function setupBlogForm() {
        const form = document.getElementById('blog-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const existingId = document.getElementById('blog-id')?.value.trim();
            const title = document.getElementById('blog-title').value.trim();
            const category = document.getElementById('blog-cat').value;
            const author = document.getElementById('blog-author').value.trim();
            const imageUrl = document.getElementById('blog-img').value.trim();
            const excerpt = document.getElementById('blog-excerpt').value.trim();
            
            let content = '';
            if (typeof tinymce !== 'undefined' && tinymce.get('blog-content')) {
                content = tinymce.get('blog-content').getContent();
            } else {
                content = document.getElementById('blog-content').value.trim();
            }

            const seoTitle = document.getElementById('blog-seo-title').value.trim() || `${title} | KPH Stay`;
            const seoDescription = document.getElementById('blog-seo-desc').value.trim() || excerpt;
            const seoKeywords = document.getElementById('blog-seo-keywords').value.trim() || `${category.toLowerCase()}, luxury travel, islamabad stay`;
            const customSlug = document.getElementById('blog-seo-slug').value.trim();
            const slug = customSlug ? slugify(customSlug) : slugify(title);
            const seoIndex = document.getElementById('blog-seo-index').value;

            if (!title || !author || !excerpt || !content) {
                KaghanUI.showToast('Please fill out all required blog fields.', 'error');
                return;
            }

            try {
                const blogPayload = {
                    title,
                    category,
                    author,
                    imageUrl,
                    excerpt,
                    content,
                    seoTitle,
                    seoDescription,
                    seoKeywords,
                    slug,
                    seoIndex,
                    portal: 'stay'
                };

                let res;
                if (existingId) {
                    blogPayload.id = existingId;
                    res = await KaghanDB.updateBlog(blogPayload);
                } else {
                    res = await KaghanDB.addBlog(blogPayload);
                }

                if (res && res.success) {
                    const actionMsg = existingId ? 'updated' : 'published';
                    KaghanUI.showToast(`Blog article "${title}" ${actionMsg}!`, 'success');
                    window.cancelBlogEdit();
                    if (window.AdminBlogsModule) {
                        await window.AdminBlogsModule.render();
                    }
                }
            } catch (err) {
                console.error("Failed to submit blog:", err);
                KaghanUI.showToast("Failed to save blog article.", "error");
            }
        });
    }

    function initCloudinaryUploads() {
        function openCloudinaryWidget(targetInputId) {
            if (typeof cloudinary === 'undefined') {
                KaghanUI.showToast("Cloudinary widget script is not loaded.", "error");
                return;
            }
            cloudinary.openUploadWidget({
                cloudName: 'dis1ptaip',
                uploadPreset: 'mubashir',
                sources: ['local', 'url', 'camera'],
                multiple: false,
                cropping: false,
                defaultSource: 'local'
            }, (error, result) => {
                if (!error && result && result.event === "success") {
                    document.getElementById(targetInputId).value = result.info.secure_url;
                    KaghanUI.showToast("Image uploaded to Cloudinary successfully!", "success");
                } else if (error) {
                    console.error("Cloudinary Widget error:", error);
                }
            });
        }

        const uploadBlogImgBtn = document.getElementById('upload-blog-img-btn');
        if (uploadBlogImgBtn) {
            uploadBlogImgBtn.addEventListener('click', () => openCloudinaryWidget('blog-img'));
        }
    }

    // Export to window
    window.AdminBlogsModule = {
        render: renderBlogs,
        init: () => {
            initBlogTinyMCE();
            setupBlogForm();
            initCloudinaryUploads();
        }
    };
})();
