// Kaghan Hotel - User Dashboard Reviews Module
(function() {
    let activeBookingId = null;
    let activeRoomId = null;
    let selectedRating = 0;

    window.openReviewModal = (bookingId, roomId, roomName) => {
        activeBookingId = bookingId;
        activeRoomId = roomId;
        selectedRating = 0;
        
        const roomLabel = document.getElementById('review-modal-room-name');
        if (roomLabel) roomLabel.innerText = roomName;

        const commentText = document.getElementById('review-comment');
        if (commentText) commentText.value = '';

        resetStars();

        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        }
    };

    window.closeReviewModal = () => {
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                activeBookingId = null;
                activeRoomId = null;
                selectedRating = 0;
            }, 300);
        }
    };

    window.setReviewRating = (rating) => {
        selectedRating = rating;
        highlightStars(rating);
    };

    function resetStars() {
        const stars = document.querySelectorAll('#review-star-container i');
        stars.forEach(star => {
            star.classList.remove('text-amber-400');
            star.classList.add('text-slate-300');
        });
    }

    function highlightStars(rating) {
        const stars = document.querySelectorAll('#review-star-container i');
        stars.forEach(star => {
            const starVal = parseInt(star.getAttribute('data-rating'));
            if (starVal <= rating) {
                star.classList.add('text-amber-400');
                star.classList.remove('text-slate-300');
            } else {
                star.classList.remove('text-amber-400');
                star.classList.add('text-slate-300');
            }
        });
    }

    window.executeSubmitReview = async () => {
        if (!activeBookingId || !activeRoomId) return;

        if (selectedRating === 0) {
            KaghanUI.showToast("Please choose a star rating.", "error");
            return;
        }

        const commentVal = document.getElementById('review-comment').value.trim();
        if (!commentVal) {
            KaghanUI.showToast("Please write a small review text.", "error");
            return;
        }

        const user = KaghanDB.getCurrentUser();
        const review = {
            bookingId: activeBookingId,
            roomId: activeRoomId,
            userId: user.id,
            userName: user.name,
            rating: selectedRating,
            comment: commentVal
        };

        const success = await KaghanDB.addReview(review);
        if (success) {
            KaghanUI.showToast("Thank you for your valuable feedback!", "success");
            // Mark booking as reviewed locally/status extension if desired or simply close
            closeReviewModal();
            if (window.UserBookingsModule) {
                await window.UserBookingsModule.render();
            }
        } else {
            KaghanUI.showToast("Could not submit the review.", "error");
        }
    };
})();
