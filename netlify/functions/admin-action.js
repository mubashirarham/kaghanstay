const { fdb, auth, initError } = require('./_admin-init');
const { z } = require('zod');

const RequestSchema = z.object({
    action: z.string().min(1, "Action is required"),
    data: z.any().optional(),
    idToken: z.string().min(1, "ID token is required")
});

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        allowedOrigin = origin;
    }
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!fdb || !auth) {
        console.error('[admin-action] Firebase not ready. initError:', initError && initError.message);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Database service is currently unavailable.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const validation = RequestSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { action, data, idToken } = validation.data;

        // Verify Firebase ID Token
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (authErr) {
            console.error("ID token verification failed:", authErr);
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Unauthorized: Invalid ID Token.' })
            };
        }

        // Verify Admin privilege (via custom claim OR database fallback)
        let isAdmin = decodedToken.role === 'admin';
        if (!isAdmin) {
            const userDoc = await fdb.collection('users').doc(decodedToken.uid).get();
            isAdmin = userDoc.exists && userDoc.data().role === 'admin';
        }

        if (!isAdmin) {
            return {
                statusCode: 403,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Forbidden: Administrative authorization required.' })
            };
        }

        let result = null;

        // Route actions using a switch statement
        switch (action) {
            case 'saveCategory': {
                const { category } = data;
                if (!category || !category.id) throw new Error("Category and category.id are required.");
                await fdb.collection('categories').doc(category.id).set(category);
                result = true;
                break;
            }
            case 'deleteCategory': {
                const { id } = data;
                if (!id) throw new Error("Category ID is required.");
                await fdb.collection('categories').doc(id).delete();
                result = true;
                break;
            }
            case 'saveLocation': {
                const { location } = data;
                if (!location || !location.id) throw new Error("Location and location.id are required.");
                await fdb.collection('locations').doc(location.id).set(location);
                result = true;
                break;
            }
            case 'deleteLocation': {
                const { id } = data;
                if (!id) throw new Error("Location ID is required.");
                await fdb.collection('locations').doc(id).delete();
                result = true;
                break;
            }
            case 'saveCoupon': {
                const { coupon } = data;
                if (!coupon || !coupon.id) throw new Error("Coupon and coupon.id are required.");
                await fdb.collection('coupons').doc(coupon.id).set(coupon);
                result = true;
                break;
            }
            case 'deleteCoupon': {
                const { id } = data;
                if (!id) throw new Error("Coupon ID is required.");
                await fdb.collection('coupons').doc(id).delete();
                result = true;
                break;
            }
            case 'updateRoom': {
                const { id, updatedData } = data;
                if (!id || !updatedData) throw new Error("Room ID and updatedData are required.");
                await fdb.collection('rooms').doc(id).update(updatedData);
                result = true;
                break;
            }
            case 'addRoom': {
                const { room } = data;
                if (!room || !room.id) throw new Error("Room and room.id are required.");
                await fdb.collection('rooms').doc(room.id).set(room);
                result = true;
                break;
            }
            case 'deleteRoom': {
                const { id } = data;
                if (!id) throw new Error("Room ID is required.");
                await fdb.collection('rooms').doc(id).delete();
                result = true;
                break;
            }
            case 'deleteUser': {
                const { id } = data;
                if (!id) throw new Error("User ID is required.");
                // Delete from Firestore
                await fdb.collection('users').doc(id).delete();
                // Optionally delete from Firebase Auth
                try {
                    await auth.deleteUser(id);
                } catch (e) {
                    console.warn(`Could not delete user ${id} from Auth (may already be deleted):`, e);
                }
                result = true;
                break;
            }
            case 'updateBookingStatus': {
                const { id, status } = data;
                if (!id || !status) throw new Error("Booking ID and status are required.");
                await fdb.collection('bookings').doc(id).update({ status });
                result = true;
                break;
            }
            case 'updateBookingDates': {
                const { id, checkIn, checkOut, totalPrice } = data;
                if (!id || !checkIn || !checkOut || totalPrice === undefined) throw new Error("ID, checkIn, checkOut, and totalPrice are required.");
                await fdb.collection('bookings').doc(id).update({ checkIn, checkOut, totalPrice });
                result = true;
                break;
            }
            case 'deleteBooking': {
                const { id } = data;
                if (!id) throw new Error("Booking ID is required.");
                await fdb.collection('bookings').doc(id).delete();
                result = true;
                break;
            }
            case 'updateBookingDetails': {
                const { id, updatedData } = data;
                if (!id || !updatedData) throw new Error("Booking ID and updatedData are required.");
                await fdb.collection('bookings').doc(id).update(updatedData);
                result = true;
                break;
            }
            case 'addBlog': {
                const { blog } = data;
                if (!blog) throw new Error("Blog data is required.");
                const docRef = fdb.collection('blogs').doc();
                blog.id = docRef.id;
                blog.createdAt = new Date().toISOString();
                await docRef.set(blog);
                result = docRef.id;
                break;
            }
            case 'deleteBlog': {
                const { id } = data;
                if (!id) throw new Error("Blog ID is required.");
                await fdb.collection('blogs').doc(id).delete();
                result = true;
                break;
            }
            case 'deleteNewsletterSubscriber': {
                const { email } = data;
                if (!email) throw new Error("Subscriber email is required.");
                const snap = await fdb.collection('newsletter').where('email', '==', email.toLowerCase().trim()).get();
                if (!snap.empty) {
                    await snap.docs[0].ref.delete();
                    result = true;
                } else {
                    throw new Error("Subscriber not found.");
                }
                break;
            }
            case 'deleteReview': {
                const { reviewId } = data;
                if (!reviewId) throw new Error("Review ID is required.");
                
                await fdb.runTransaction(async (transaction) => {
                    const reviewRef = fdb.collection('reviews').doc(reviewId);
                    const reviewDoc = await transaction.get(reviewRef);
                    if (!reviewDoc.exists) {
                        throw new Error("Review document not found.");
                    }
                    const reviewData = reviewDoc.data();
                    const roomId = reviewData.roomId;

                    transaction.delete(reviewRef);

                    // Re-calculate room ratings
                    const reviewsQuery = fdb.collection('reviews').where('roomId', '==', roomId);
                    const reviewsSnap = await transaction.get(reviewsQuery);
                    
                    let totalRating = 0;
                    let count = 0;
                    
                    reviewsSnap.forEach(doc => {
                        if (doc.id !== reviewId) {
                            totalRating += doc.data().rating;
                            count++;
                        }
                    });

                    const newRating = count > 0 ? parseFloat((totalRating / count).toFixed(1)) : 5.0;
                    const roomRef = fdb.collection('rooms').doc(roomId);
                    transaction.update(roomRef, {
                        rating: newRating,
                        reviewsCount: count
                    });
                });
                result = true;
                break;
            }
            default:
                throw new Error(`Action '${action}' is not supported.`);
        }

        console.log(`[Admin Action] Completed action '${action}' successfully for user UID: ${decodedToken.uid}`);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ result })
        };

    } catch (err) {
        console.error("Admin action execution error:", err);
        const isExpected = [
            "Category and category.id are required.", "Category ID is required.",
            "Location and location.id are required.", "Location ID is required.",
            "Coupon and coupon.id are required.", "Coupon ID is required.",
            "Room ID and updatedData are required.", "Room and room.id are required.", "Room ID is required.",
            "User ID is required.",
            "Booking ID and status are required.", "ID, checkIn, checkOut, and totalPrice are required.",
            "Booking ID is required.", "Booking ID and updatedData are required.",
            "Blog data is required.", "Blog ID is required.",
            "Subscriber email is required.", "Subscriber not found.",
            "Review ID is required.", "Review document not found."
        ].includes(err.message);
        
        return {
            statusCode: isExpected ? 400 : 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: isExpected ? err.message : 'Internal Server Error' })
        };
    }
};
