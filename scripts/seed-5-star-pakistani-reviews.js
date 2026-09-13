const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// 1. Firebase Admin Init
const firebaseKeyPath = path.resolve(__dirname, '../kaghan-properties-firebase-adminsdk-fbsvc-ed152c46f5.json');
const firebaseServiceAccount = JSON.parse(fs.readFileSync(firebaseKeyPath, 'utf8'));

const app = initializeApp({
    credential: cert(firebaseServiceAccount)
});
const db = getFirestore(app);

// Pool of Authentic Pakistani Reviewers & Localities
const PAKISTANI_PROFILES = [
    { name: "Muhammad Tariq Khan", city: "Karachi", designation: "Corporate Executive" },
    { name: "Dr. Ayesha Farooq", city: "Islamabad", designation: "Medical Specialist" },
    { name: "Engr. Usman Zafar", city: "Lahore", designation: "Senior Software Architect" },
    { name: "Syeda Maryam Bukhari", city: "Rawalpindi", designation: "Family Traveler" },
    { name: "Brigadier (R) Tariq Mahmood", city: "Peshawar", designation: "Mountain Enthusiast" },
    { name: "Fatima Zahra", city: "Gujranwala", designation: "Family Vacationer" },
    { name: "Hamza Siddiqui", city: "Multan", designation: "Business Consultant" },
    { name: "Dr. Kamran Ali", city: "London, UK", designation: "Overseas Pakistani" },
    { name: "Bilal Ahmed", city: "Lahore", designation: "Creative Director" },
    { name: "Zoya Rehman", city: "Karachi", designation: "Honeymooner" },
    { name: "Saad Qureshi", city: "Islamabad", designation: "Management Consultant" },
    { name: "Farhan Sheikh", city: "Sialkot", designation: "Exporter & Traveler" },
    { name: "Zainab Malik", city: "Faisalabad", designation: "Extended Stay Guest" },
    { name: "Noman Tariq", city: "Dubai, UAE", designation: "Overseas Pakistani" },
    { name: "Khurram Shahzad", city: "Peshawar", designation: "Civil Engineer" },
    { name: "Hina Babar", city: "Abbottabad", designation: "Nature Enthusiast" }
];

// Contextual Review Comments by City / Property Type
const ISLAMABAD_COMMENTS = [
    "Stayed here for 5 days on an official trip to Islamabad. The 24/7 generator and solar backup was a lifesaver—AC and 100 Mbps Wi-Fi never blinked once. Bahria Enclave is peaceful and secure. 10/10!",
    "Bohot zabardast experience tha! Apartment was sparkling clean, modular kitchen had everything we needed, and parking was secure. Family felt 100% safe. Highly recommended.",
    "Visiting from the UK with family for 3 weeks. Having a full 2-bedroom suite with a spacious lounge was so much better than booking cramped hotel rooms. Clean mountain air and great views.",
    "Superb interior aesthetics, premium mattress, and spotlessly clean washrooms. Sector C commercial market is just 2 minutes away for groceries. Concierge was very polite.",
    "Best furnished apartment experience in Islamabad! High-speed optical fiber internet made my remote Zoom calls seamless. Clean bedsheets and crisp towels provided.",
    "Booked this for my elderly parents visiting from Karachi. They loved the quiet environment, fresh Margalla foothills breeze, and secure elevator access. Thank you KPH Stay!",
    "MashAllah outstanding hospitality! The digital self-check-in was effortless and the support team was available on WhatsApp within seconds whenever we asked for extra towels.",
    "Exceptional value for money compared to 5-star hotel rates. You get 3 times the space, a full private kitchen, and complete privacy for the family.",
    "Very cozy and aesthetic apartment. The 55-inch Smart TV with Netflix, hot water geyser, and comfortable couches made our evening relaxation perfect.",
    "Exactly as advertised in the photos. Clean, modern, peaceful, and fully functional. Will definitely book again on my next visit to the capital.",
    "The mountain backdrop in Bahria Enclave is stunning. Waking up to panoramic valley views with morning chai was unforgettable.",
    "A truly luxurious home away from home. Gated security gave us great peace of mind. Five stars for cleanliness and service!"
];

const MURREE_COMMENTS = [
    "Unbelievable winter stay! Heavy snowfall was falling outside while the high-efficiency heating and electric thermal blankets kept us so warm and cozy. Steaming hot water 24/7. 10/10!",
    "Family ke sath 3 din guzarey. Breathtaking pine valley views from the balcony terrace. Very quiet location away from Mall Road traffic noise. Kids loved every moment!",
    "Clean, warm, and truly luxurious. Having a private kitchen to brew Kashmiri chai and cook hot breakfast for the kids while watching the mist roll in was priceless.",
    "The staff was exceptionally courteous and helped with our luggage in freezing weather. Safe covered parking for our SUV. Highly recommended for families.",
    "One of the best heated chalets in Murree & Bhurban! Double glazed windows keep the room completely draft-free and warm throughout sub-zero nights.",
    "Scenic location in Bhurban surrounded by ancient pine trees. Morning sunrise over the Himalayan ridge was pure bliss. Clean washrooms and plush bedding.",
    "Spacious living lounge with comfortable sofas. Perfect setup for two families traveling together. Power backup ensured heating stayed on uninterrupted.",
    "Electric under-blankets, powerful room heating, and dedicated generator backup made our winter snow holiday stress-free and memorable.",
    "Peaceful mountain retreat. We spent our evenings having tea on the balcony watching the clouds drift directly through the valley.",
    "Excellent hospitality by the KPH Stay team! Prompt responses, spotless linen, and delicious local food recommendations.",
    "Top-notch cleanliness and hygiene. The mountain view from the master bedroom window is worth every single rupee.",
    "We travel to Murree every year and this is by far the most comfortable, warm, and well-managed luxury chalet we have stayed in."
];

const NATHIA_GALI_COMMENTS = [
    "The wood-burning fireplace in the living room made our family holiday magical! Misty clouds were literally drifting onto our balcony. Truly an unmissable alpine experience.",
    "We were a group of 10 people and everyone had ample space. All 4 bedrooms have en-suite heated washrooms with instant hot water. 5 stars all the way!",
    "Prime location just a short drive to the Pipeline Track in Dunga Gali and Mukshpuri Peak. Coming back to a warm, cozy chalet after hiking was pure heaven.",
    "Bohot shandar property! Pine forest completely surrounds the chalet. The kitchen is fully equipped so we cooked our own fresh hot meals.",
    "The caretaker was always available with dry firewood and fresh linen. Outstanding alpine living experience in the heart of Galiyat.",
    "Clean mountain air, absolute silence, and five-star luxury amenities at 8,200 feet altitude. Beds were warm with electric thermal blankets.",
    "Spacious dining area and huge lounge where the whole family sat together around the roaring fireplace. Best mountain holiday we've had in Pakistan.",
    "Electric thermal blankets on every bed kept us toasty warm even during sub-zero night temperatures. Generator backup was completely reliable.",
    "The panoramic balcony view over the pine canopy is breathtaking. You can see the entire valley covered in clouds at sunset.",
    "Already planning our next summer trip here. Highly recommended for families and trekking groups visiting Nathia Gali!"
];

const ADMIN_REPLIES = [
    "Thank you so much for your kind words! We are delighted that you and your family had a wonderful stay. We look forward to welcoming you back to KPH Stay soon!",
    "Thank you for your generous review! It was our pleasure hosting you. Our team is dedicated to providing warm hospitality and pristine luxury.",
    "We truly appreciate your feedback! Glad to hear our heating, backup power, and concierge services met your expectations. See you on your next trip!",
    "Thank you for choosing KPH Stay! We are thrilled you enjoyed the serene views and full kitchen facilities. Wishing you safe travels always."
];

function getRandomDateWithinMonths(monthsBack = 8) {
    const now = new Date();
    const past = new Date(now.getTime() - (monthsBack * 30 * 24 * 60 * 60 * 1000));
    const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
    return new Date(randomTime).toISOString();
}

async function seedReviews() {
    console.log("=== SEEDING 10+ 5-STAR PAKISTANI REVIEWS FOR ALL LISTINGS ===");
    
    // 1. Fetch all rooms
    const roomsSnap = await db.collection('rooms').get();
    console.log(`Found ${roomsSnap.size} room listings in Firestore.`);

    let totalReviewsCreated = 0;
    const allGeneratedReviews = [];

    for (const roomDoc of roomsSnap.docs) {
        const room = roomDoc.data();
        const roomId = roomDoc.id;
        const location = (room.location || room.locationName || '').toLowerCase();
        const roomName = room.name || 'Luxury Suite';

        let pool = ISLAMABAD_COMMENTS;
        if (location.includes('murree') || roomName.toLowerCase().includes('murree') || roomName.toLowerCase().includes('bhurban')) {
            pool = MURREE_COMMENTS;
        } else if (location.includes('nathia') || roomName.toLowerCase().includes('nathia') || location.includes('gali')) {
            pool = NATHIA_GALI_COMMENTS;
        }

        // Generate 10 to 12 reviews per room
        const reviewCount = 10 + Math.floor(Math.random() * 3); // 10, 11, or 12
        const selectedProfiles = [...PAKISTANI_PROFILES].sort(() => 0.5 - Math.random()).slice(0, reviewCount);
        const selectedComments = [...pool].sort(() => 0.5 - Math.random()).slice(0, reviewCount);

        const batch = db.batch();
        const roomReviews = [];

        for (let i = 0; i < reviewCount; i++) {
            const profile = selectedProfiles[i];
            const comment = selectedComments[i] || pool[i % pool.length];
            const reviewId = `rev-${roomId.replace(/[^a-zA-Z0-9]/g, '')}-${i + 1}`;
            const createdAt = getRandomDateWithinMonths(8);
            
            const hasReply = Math.random() > 0.4;
            const adminReply = hasReply ? ADMIN_REPLIES[Math.floor(Math.random() * ADMIN_REPLIES.length)] : null;
            const adminRepliedAt = hasReply ? new Date(new Date(createdAt).getTime() + 86400000).toISOString() : null;

            const reviewData = {
                id: reviewId,
                roomId: roomId,
                roomName: roomName,
                userName: `${profile.name} (${profile.city})`,
                guestName: profile.name,
                guestCity: profile.city,
                rating: 5,
                ratingValue: "5.0",
                comment: comment,
                reviewText: comment,
                status: "approved",
                isVerified: true,
                createdAt: createdAt,
                ...(adminReply ? { adminReply, adminRepliedAt } : {})
            };

            const reviewRef = db.collection('reviews').doc(reviewId);
            batch.set(reviewRef, reviewData, { merge: true });
            
            roomReviews.push(reviewData);
            allGeneratedReviews.push(reviewData);
            totalReviewsCreated++;
        }

        // Update room document with 5.0 rating and reviewsCount
        const roomRef = db.collection('rooms').doc(roomId);
        batch.update(roomRef, {
            rating: 5.0,
            ratingValue: "5.0",
            reviewsCount: reviewCount,
            totalReviews: reviewCount,
            reviewCount: reviewCount
        });

        await batch.commit();
        console.log(`[PASS] Room "${roomName.slice(0, 35)}..." seeded with ${reviewCount} 5-star Pakistani reviews.`);
    }

    console.log(`\nSUCCESS: Seeded ${totalReviewsCreated} total 5-star Pakistani reviews across all ${roomsSnap.size} listings!`);

    // Save fallback JSON bundle for offline 0ms instant loading
    const fallbackPath = path.resolve(__dirname, '../assets/js/default-reviews.json');
    fs.writeFileSync(fallbackPath, JSON.stringify(allGeneratedReviews, null, 2));
    console.log(`Exported fallback reviews bundle to ${fallbackPath}`);
}

seedReviews().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("Error seeding reviews:", err);
    process.exit(1);
});
