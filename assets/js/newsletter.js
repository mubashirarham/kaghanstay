// Kaghan Hotel - Newsletter Subscription Module
// Automatically binds to footer newsletter inputs and saves subscriptions to Firestore.

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        setupNewsletter();
    });

    function setupNewsletter() {
        const footers = document.querySelectorAll('footer');
        footers.forEach(footer => {
            const headings = footer.querySelectorAll('h4');
            let newsletterContainer = null;
            headings.forEach(h => {
                if (h.textContent.trim().toLowerCase() === 'newsletter') {
                    newsletterContainer = h.nextElementSibling;
                }
            });

            if (newsletterContainer) {
                const input = newsletterContainer.querySelector('input[type="email"]');
                const button = newsletterContainer.querySelector('button');
                if (input && button) {
                    button.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const email = input.value.trim();
                        if (!email) {
                            if (window.KaghanUI) {
                                KaghanUI.showToast('Please enter an email address.', 'error');
                            } else {
                                alert('Please enter an email address.');
                            }
                            return;
                        }
                        
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(email)) {
                            if (window.KaghanUI) {
                                KaghanUI.showToast('Please enter a valid email address.', 'error');
                            } else {
                                alert('Please enter a valid email address.');
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

                            if (!res.ok) {
                                const data = await res.json();
                                throw new Error(data.error || 'Failed to subscribe.');
                            }

                            const data = await res.json();

                            if (window.KaghanUI) {
                                KaghanUI.showToast(data.message || 'Thank you for subscribing!', 'success');
                            } else {
                                alert(data.message || 'Thank you for subscribing!');
                            }
                            input.value = '';
                        } catch (error) {
                            console.error('Newsletter subscription error:', error);
                            const msg = error.message || 'Error subscribing. Please try again.';
                            if (window.KaghanUI) {
                                KaghanUI.showToast(msg, 'error');
                            } else {
                                alert(msg);
                            }
                        } finally {
                            button.disabled = false;
                            button.textContent = originalText;
                        }
                    });
                }
            }
        });
    }
})();
