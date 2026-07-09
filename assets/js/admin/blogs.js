// Kaghan Hotel - Admin Blog Management Module
(function() {
    async function renderBlogs() {
        const blogs = await KaghanDB.getBlogs();
        const tbody = document.getElementById('admin-blogs-tbody');
        const emptyState = document.getElementById('blogs-empty-state');

        if (!tbody) return;

        // Filter blogs by portal === 'stay'
        const filtered = blogs.filter(b => b.portal === 'stay');

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        tbody.innerHTML = filtered.map(blog => {
            const img = blog.imageUrl || '../assets/images/logo.png';
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <img src="${img}" alt="${blog.title}" class="w-16 h-10 object-cover rounded-lg border border-slate-200 shadow" onerror="this.src='../assets/images/logo.png'">
                    </td>
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-xs block">${blog.title}</span>
                        <span class="text-[9px] text-[#D4AF37] uppercase font-bold tracking-wider">${blog.category} | By ${blog.author}</span>
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-500">
                        ${KaghanUI.formatDate(blog.createdAt)}
                    </td>
                    <td class="px-6 py-4">
                        <button onclick="deleteBlogRecord('${blog.id}')" class="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5">
                            <i class="fa-solid fa-trash-can text-[9px]"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.deleteBlogRecord = async (blogId) => {
        if (!confirm(`Are you sure you want to permanently delete this blog post?`)) return;

        const success = await KaghanDB.deleteBlog(blogId);
        if (success) {
            KaghanUI.showToast("Blog article deleted successfully.", "success");
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast("Failed to delete blog article.", "error");
        }
    };

    function setupBlogForm() {
        const form = document.getElementById('blog-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('blog-title').value.trim();
            const category = document.getElementById('blog-cat').value;
            const author = document.getElementById('blog-author').value.trim();
            const imageUrl = document.getElementById('blog-img').value.trim();
            const excerpt = document.getElementById('blog-excerpt').value.trim();
            const content = document.getElementById('blog-content').value.trim();

            if (!title || !author || !excerpt || !content) {
                KaghanUI.showToast('Please fill out all required blog fields.', 'error');
                return;
            }

            try {
                const res = await KaghanDB.addBlog({
                    title,
                    category,
                    author,
                    imageUrl,
                    excerpt,
                    content,
                    portal: 'stay'
                });

                if (res.success) {
                    KaghanUI.showToast(`Blog article "${title}" published!`, 'success');
                    form.reset();
                    // Refill default author
                    document.getElementById('blog-author').value = "Resort Manager";
                    if (window.AdminDashboardModule) {
                        await window.AdminDashboardModule.refreshAll();
                    }
                }
            } catch (err) {
                console.error("Failed to submit blog:", err);
                KaghanUI.showToast("Failed to publish blog article.", "error");
            }
        });
    }

    // Cloudinary widget orchestrator
    function initCloudinaryUploads() {
        function openCloudinaryWidget(targetInputId) {
            if (typeof cloudinary === 'undefined') {
                KaghanUI.showToast("Cloudinary widget script is not loaded.", "error");
                return;
            }
            cloudinary.openUploadWidget({
                cloudName: 'kaghan-properties',
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

        const uploadRoomImgBtn = document.getElementById('upload-room-img-btn');
        if (uploadRoomImgBtn) {
            uploadRoomImgBtn.addEventListener('click', () => openCloudinaryWidget('add-room-image'));
        }
    }

    // Export to window
    window.AdminBlogsModule = {
        render: renderBlogs,
        init: () => {
            setupBlogForm();
            initCloudinaryUploads();
        }
    };
})();
