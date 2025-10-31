/**
 * Google Review Automation Script
 * 
 * This script automates the daily sync of Google Reviews:
 * 1. Fetches outlets from Google Sheets
 * 2. Gets review data from Google Maps
 * 3. Stores results in Supabase
 * 
 * Schedule: Daily at 1:00 AM
 * 
 * Setup Instructions:
 * 1. Install dependencies: npm install @supabase/supabase-js node-fetch
 * 2. Set environment variables:
 *    - SUPABASE_URL=your_supabase_url
 *    - SUPABASE_KEY=your_supabase_service_key
 * 3. Deploy to cron service (GitHub Actions, Vercel Cron, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const GOOGLE_SHEETS_ID = '1nTSZFKFZRt1owO-hKUk2lkzvlGxcyrBTC47yDTiu1YQ'; // Public sheet
const SHEET_NAME = 'Sheet1';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables: SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch outlets from Google Sheets
 */
async function fetchOutletsFromGoogleSheets() {
    try {
        console.log('📊 Fetching outlets from Google Sheets...');
        
        // Try direct fetch first (GitHub Actions can access directly)
        const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
        console.log('📍 CSV URL:', csvUrl);
        
        let response;
        let csvText;
        
        try {
            // Try direct fetch (works in server environment like GitHub Actions)
            response = await fetch(csvUrl);
            csvText = await response.text();
            console.log('✅ Direct fetch successful');
        } catch (directError) {
            console.log('⚠️ Direct fetch failed, trying with CORS proxy...');
            // Fallback to CORS proxy (needed for browser environment)
            response = await fetch(CORS_PROXY + encodeURIComponent(csvUrl));
            csvText = await response.text();
            console.log('✅ CORS proxy fetch successful');
        }
        
        console.log('✅ CSV data fetched, length:', csvText.length);
        console.log('📄 First 200 chars:', csvText.substring(0, 200));
        
        // Parse CSV
        const lines = csvText.split('\n');
        console.log('📋 Total lines:', lines.length);
        
        const outlets = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
            
            // Column indices for public sheet: A=Name, B=Status, C=Link
            const name = cols[0]; // Column A (index 0)
            const status = cols[1]; // Column B (index 1)
            const link = cols[2]; // Column C (index 2)
            
            // Debug first few rows
            if (i <= 3) {
                console.log(`📝 Row ${i}: name="${name}", status="${status}", link="${link}"`);
            }
            
            // Skip CLOSED outlets
            if (status && status.toUpperCase() === 'CLOSED') {
                console.log(`⏭️ Skipping CLOSED outlet: ${name}`);
                continue;
            }
            
            // Validate
            if (!name || !link) {
                if (i <= 5) console.log(`⚠️ Row ${i} missing name or link`);
                continue;
            }
            if (!link.includes('google.com/maps') && !link.includes('maps.app.goo.gl') && !link.includes('goo.gl')) {
                if (i <= 5) console.log(`⚠️ Row ${i} invalid link format: ${link}`);
                continue;
            }
            
            outlets.push({ name, link, status: status || 'ACTIVE' });
        }
        
        console.log(`✅ Found ${outlets.length} active outlets`);
        return outlets;
        
    } catch (error) {
        console.error('❌ Error fetching from Google Sheets:', error);
        throw error;
    }
}

/**
 * Fetch review data for a single outlet
 */
async function fetchReviewData(outlet, index = 0) {
    try {
        console.log(`  🔍 Fetching reviews for: ${outlet.name}`);
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(outlet.link));
        const html = await response.text();
        
        // Debug: Show HTML snippet for first outlet
        if (index === 0) {
            console.log(`  📄 HTML length: ${html.length}`);
            // Look for rating patterns in HTML
            const ratingSnippet = html.match(/([1-5][\.,]\d+)[^\d]*\([\d,]+\)/);
            if (ratingSnippet) {
                console.log(`  📝 Found rating pattern: ${ratingSnippet[0]}`);
            } else {
                console.log(`  ⚠️ No rating pattern found in HTML`);
            }
        }
        
        // Parse review count and rating
        const reviewData = parseGoogleMapsHTML(html);
        
        console.log(`  ✅ ${outlet.name}: ${reviewData.reviewCount} reviews, ${reviewData.rating} rating`);
        
        return {
            ...outlet,
            reviewCount: reviewData.reviewCount,
            rating: reviewData.rating,
            lastChecked: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`  ❌ Error fetching reviews for ${outlet.name}:`, error);
        return {
            ...outlet,
            reviewCount: 0,
            rating: 0,
            lastChecked: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Parse Google Maps HTML for review count and rating
 */
function parseGoogleMapsHTML(html) {
    let reviewCount = 0;
    let rating = 0.0;
    
    try {
        // ===== REVIEW COUNT PARSING =====
        
        // Pattern 1: Review count with text
        const reviewMatch = html.match(/(\d+(?:[,\.]\d+)*)\s*(?:reviews|ulasan|google reviews)/i);
        if (reviewMatch) {
            reviewCount = parseInt(reviewMatch[1].replace(/[,\.]/g, ''));
        }
        
        // Pattern 2: Parentheses format (123)
        if (reviewCount === 0) {
            const reviewMatch2 = html.match(/\((\d+(?:[,\.]\d+)*)\)/);
            if (reviewMatch2) {
                const potentialCount = parseInt(reviewMatch2[1].replace(/[,\.]/g, ''));
                if (potentialCount > 0 && potentialCount < 100000) {
                    reviewCount = potentialCount;
                }
            }
        }
        
        // ===== RATING PARSING =====
        
        // Pattern 1: Rating before review count (most common)
        // Format: "4.5 (123)" or "4.5★ (123)"
        const ratingBeforeCount = html.match(/([1-5][\.,]\d)\s*[★⭐]?\s*\([\d,\.]+\)/);
        if (ratingBeforeCount) {
            rating = parseFloat(ratingBeforeCount[1].replace(',', '.'));
        }
        
        // Pattern 2: Rating in structured data (JSON-LD)
        if (rating === 0) {
            const ratingMatch = html.match(/"ratingValue"\s*:\s*"?([\d.,]+)"?/);
            if (ratingMatch) {
                rating = parseFloat(ratingMatch[1].replace(',', '.'));
            }
        }
        
        // Pattern 3: aggregateRating
        if (rating === 0) {
            const aggRating = html.match(/"aggregateRating"[^}]*"ratingValue"\s*:\s*"?([\d.,]+)"?/);
            if (aggRating) {
                rating = parseFloat(aggRating[1].replace(',', '.'));
            }
        }
        
        // Pattern 4: Rating near stars
        if (rating === 0) {
            const pattern3 = html.match(/([1-5][.,]\d+)\s*[★⭐]/);
            if (pattern3) {
                rating = parseFloat(pattern3[1].replace(',', '.'));
            }
        }
        
        // Pattern 5: Aria-label
        if (rating === 0) {
            const altRatingMatch = html.match(/aria-label="([\d.,]+)\s*(?:stars?|bintang)/i);
            if (altRatingMatch) {
                rating = parseFloat(altRatingMatch[1].replace(',', '.'));
            }
        }
        
        // Pattern 6: Rating in title or alt text
        if (rating === 0) {
            const titleRating = html.match(/(?:rating|nilai):\s*([1-5][.,]\d+)/i);
            if (titleRating) {
                rating = parseFloat(titleRating[1].replace(',', '.'));
            }
        }
        
        // Pattern 7: Simple decimal before reviews
        if (rating === 0 && reviewCount > 0) {
            // Look for a decimal number (1.0-5.0) near the review count
            const nearbyRating = html.match(new RegExp(`([1-5][\\.\\,]\\d)\\D*${reviewCount}`));
            if (nearbyRating) {
                rating = parseFloat(nearbyRating[1].replace(',', '.'));
            }
        }
        
        // Validate rating range
        if (rating > 0 && (rating < 1.0 || rating > 5.0)) {
            rating = 0; // Invalid rating
        }
        
    } catch (error) {
        console.error('Error parsing HTML:', error);
    }
    
    return { reviewCount, rating };
}

/**
 * Save outlets to Supabase
 */
async function saveToSupabase(outlets) {
    try {
        console.log('💾 Saving to Supabase...');
        
        const reviewsData = outlets.map(outlet => ({
            outlet_name: outlet.name,
            google_maps_link: outlet.link,
            review_count: outlet.reviewCount || 0,
            rating: outlet.rating || 0,
            last_checked: outlet.lastChecked,
            status: 'success',
            updated_at: new Date().toISOString()
        }));
        
        // Upsert to Supabase
        const { data, error } = await supabase
            .from('google_reviews')
            .upsert(reviewsData, { onConflict: 'outlet_name' });
        
        if (error) throw error;
        
        console.log(`✅ Saved ${reviewsData.length} outlets to Supabase`);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        throw error;
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main automation function
 */
async function main() {
    console.log('🚀 Starting Google Review Automation');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('');
    
    try {
        // Step 1: Fetch outlets from Google Sheets
        const outlets = await fetchOutletsFromGoogleSheets();
        console.log('');
        
        // Step 2: Fetch reviews for each outlet
        console.log('📊 Fetching reviews for all outlets...');
        const outletsWithReviews = [];
        
        for (let i = 0; i < outlets.length; i++) {
            const outlet = outlets[i];
            const outletWithReview = await fetchReviewData(outlet, i);
            outletsWithReviews.push(outletWithReview);
            
            // Delay between requests to avoid rate limiting
            if (i < outlets.length - 1) {
                await sleep(DELAY_BETWEEN_REQUESTS);
            }
        }
        console.log('');
        
        // Step 3: Save to Supabase
        await saveToSupabase(outletsWithReviews);
        console.log('');
        
        // Summary
        const totalReviews = outletsWithReviews.reduce((sum, o) => sum + o.reviewCount, 0);
        const avgRating = outletsWithReviews.filter(o => o.rating > 0).reduce((sum, o) => sum + o.rating, 0) / outletsWithReviews.filter(o => o.rating > 0).length;
        
        console.log('✅ Automation completed successfully!');
        console.log('📊 Summary:');
        console.log(`   • Total Outlets: ${outletsWithReviews.length}`);
        console.log(`   • Total Reviews: ${totalReviews}`);
        console.log(`   • Average Rating: ${avgRating.toFixed(2)}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Automation failed:', error);
        process.exit(1);
    }
}

// Run the main function
main();
