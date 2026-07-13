# Extracted Rooms Mock Data

This file preserves the mock data and comparison structures extracted from `rooms.html` to keep the production files clean.

## 1. Room Comparison Table (HTML)

```html
    <!-- Room Comparison Table -->
    <section class="py-24 px-6 md:px-12 bg-white border-t border-slate-100">
        <div class="max-w-7xl mx-auto">
            <div class="text-center mb-16">
                <span class="text-[#D4AF37] font-bold uppercase tracking-widest text-xs mb-3 block">Quick Comparison</span>
                <h2 class="text-3xl md:text-4xl font-bold outfit text-[#0F172A]">Room Category <span class="text-[#D4AF37]">Comparison</span></h2>
                <p class="text-slate-500 text-sm mt-4 max-w-xl mx-auto font-light">Compare our accommodation types at a glance to find the perfect match for your stay requirements.</p>
            </div>

            <div class="table-scroll-container overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
                <table class="w-full text-sm">
                    <thead class="bg-[#0F172A] text-white">
                        <tr>
                            <th class="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider">Feature</th>
                            <th class="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Studio</th>
                            <th class="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">1 Bed</th>
                            <th class="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">2 Bed</th>
                            <th class="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">3 Bed</th>
                            <th class="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">4 Bed</th>
                            <th class="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Penthouse</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr class="bg-white hover:bg-slate-50 transition-colors">
                            <td class="px-6 py-4 font-semibold text-slate-800">Max Guests</td>
                            <td class="px-6 py-4 text-center text-slate-600">2</td>
                            <td class="px-6 py-4 text-center text-slate-600">2</td>
                            <td class="px-6 py-4 text-center text-slate-600">4</td>
                            <td class="px-6 py-4 text-center text-slate-600">6</td>
                            <td class="px-6 py-4 text-center text-slate-600">8</td>
                            <td class="px-6 py-4 text-center text-slate-600">6</td>
                        </tr>
                        <tr class="bg-slate-50 hover:bg-slate-100 transition-colors">
                            <td class="px-6 py-4 font-semibold text-slate-800">Equipped Kitchen</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                        </tr>
                        <tr class="bg-white hover:bg-slate-50 transition-colors">
                            <td class="px-6 py-4 font-semibold text-slate-800">Living Room</td>
                            <td class="px-6 py-4 text-center text-slate-300"><i class="fa-solid fa-minus"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                        </tr>
                        <tr class="bg-slate-50 hover:bg-slate-100 transition-colors">
                            <td class="px-6 py-4 font-semibold text-slate-800">Free Wi-Fi</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                            <td class="px-6 py-4 text-center text-[#D4AF37]"><i class="fa-solid fa-check"></i></td>
                        </tr>
                        <tr class="bg-white hover:bg-slate-50 transition-colors">
                            <td class="px-6 py-4 font-semibold text-slate-800">Starting Rate</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37] font-bold">PKR 8,000</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37] font-bold">PKR 12,000</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37] font-bold">PKR 18,000</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37] font-bold">PKR 25,000</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37] font-bold">PKR 35,000</td>
                            <td class="px-6 py-4 text-center text-[#D4AF37] font-bold">PKR 120,000</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>
```

## 2. JSON-LD ItemList Schema (JSON)

```json
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "KPH Stay Apartment & Penthouse Catalog",
      "description": "Exquisite luxury service apartments and penthouses catalog in Bahria Enclave, Islamabad and Nathia Gali.",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "item": {
            "@type": "HotelRoom",
            "name": "Studio Apartment",
            "description": "Cozy modern studio apartment featuring king bed, equipped kitchen, and balcony.",
            "bed": "King Bed",
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": 2
            }
          }
        },
        {
          "@type": "ListItem",
          "position": 2,
          "item": {
            "@type": "HotelRoom",
            "name": "1 Bed Apartment",
            "description": "Elegant one-bedroom apartment with fully equipped kitchen and living lounge.",
            "bed": "King Bed",
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": 2
            }
          }
        },
        {
          "@type": "ListItem",
          "position": 3,
          "item": {
            "@type": "HotelRoom",
            "name": "2 Bed Apartment",
            "description": "Spacious two-bedroom apartment, ideal for families, with kitchen and living room.",
            "bed": "2 King Beds",
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": 4
            }
          }
        },
        {
          "@type": "ListItem",
          "position": 4,
          "item": {
            "@type": "HotelRoom",
            "name": "3 Bed Apartment",
            "description": "Luxurious three-bedroom apartment with central lounge and complete home amenities.",
            "bed": "3 King Beds",
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": 6
            }
          }
        },
        {
          "@type": "ListItem",
          "position": 5,
          "item": {
            "@type": "HotelRoom",
            "name": "4 Bed Apartment",
            "description": "Stunning four-bedroom apartment with massive family lounge and private terrace.",
            "bed": "4 King Beds",
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": 8
            }
          }
        },
        {
          "@type": "ListItem",
          "position": 6,
          "item": {
            "@type": "HotelRoom",
            "name": "Luxury Penthouse",
            "description": "Magnificent top-floor penthouse with private heated infinity pool, chef, and butler.",
            "bed": "3 King Beds",
            "occupancy": {
              "@type": "QuantitativeValue",
              "value": 6
            }
          }
        }
      ]
    }
```
