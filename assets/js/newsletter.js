// Kaghan Hotel - Newsletter Subscription Module
// Automatically binds to footer newsletter inputs and saves subscriptions to Firestore.

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        setupNewsletter();
    });

    function setupNewsletter() {
        const containers = [];

        // 1. Hook via data attribute
        document.querySelectorAll('[data-newsletter-form]').forEach(el => containers.push(el));

        // 2. Fallback hook via footer headings
        document.querySelectorAll('footer').forEach(footer => {
            const headings = footer.querySelectorAll('h4');
            headings.forEach(h => {
                if (h.textContent.trim().toLowerCase() === 'newsletter') {
                    if (h.nextElementSibling && !containers.includes(h.nextElementSibling)) {
                        containers.push(h.nextElementSibling);
                    }
                }
            });
        });

        containers.forEach(container => {
            const input = container.querySelector('input[type="email"]');
            const button = container.querySelector('button');
            if (input && button) {
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const email = input.value.trim();
                    if (!email) {
                        if (window.KaghanUI) {
                            KaghanUI.showToast('Please enter an email address.', 'error');
                        }
                        return;
                    }
                    
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        if (window.KaghanUI) {
                            KaghanUI.showToast('Please enter a valid email address.', 'error');
                        }
                        return;
                    }

                    button.disabled = true;
                    const originalText = button.textContent;
                    button.textContent = '...';

                    try {
                        const res = await window.safeFetch('/.netlify/functions/subscribe-newsletter', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });

                        const data = await res.json();
                        if (!res.ok) {
                            throw new Error(data.error || 'Subscription failed.');
                        }

                        if (window.KaghanUI) {
                            KaghanUI.showToast('Thank you for subscribing to KPH Stay updates!', 'success');
                        }
                        input.value = '';
                    } catch (error) {
                        console.error('Newsletter subscription error:', error);
                        const msg = error.message || 'Error subscribing. Please try again.';
                        if (window.KaghanUI) {
                            KaghanUI.showToast(msg, 'error');
                        }
                    } finally {
                        button.disabled = false;
                        button.textContent = originalText;
                    }
                });
            }
        });
    }
})();
