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

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const GOOGLE_SHEETS_ID = '1Li6_bE_kTM5N5BlBS6-CqqaottR-oaU9YlY1BIo15Dc';
const SHEET_NAME = 'MAIN OPERATION';
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
        
        const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
        const response = await fetch(CORS_PROXY + encodeURIComponent(csvUrl));
        const csvText = await response.text();
        
        console.log('✅ CSV data fetched');
        
        // Parse CSV
        const lines = csvText.split('\n');
        const outlets = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
            
            // Column indices (adjust if needed)
            const name = cols[9]; // Column J (index 9)
            const link = cols[28]; // Column AC (index 28)
            const status = cols[15]; // Column P (index 15)
            
            // Skip CLOSED outlets
            if (status && status.toUpperCase() === 'CLOSED') {
                continue;
            }
            
            // Validate
            if (!name || !link) continue;
            if (!link.includes('google.com/maps') && !link.includes('maps.app.goo.gl') && !link.includes('goo.gl')) {
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
async function fetchReviewData(outlet) {
    try {
        console.log(`  🔍 Fetching reviews for: ${outlet.name}`);
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(outlet.link));
        const html = await response.text();
        
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
        // Pattern 1: Review count
        const reviewMatch = html.match(/(\d+(?:[,\.]\d+)*)\s*(?:reviews|ulasan|google reviews)/i);
        if (reviewMatch) {
            reviewCount = parseInt(reviewMatch[1].replace(/[,\.]/g, ''));
        }
        
        // Pattern 1b: Parentheses format
        if (reviewCount === 0) {
            const reviewMatch2 = html.match(/\((\d+(?:[,\.]\d+)*)\)/);
            if (reviewMatch2) {
                const potentialCount = parseInt(reviewMatch2[1].replace(/[,\.]/g, ''));
                if (potentialCount > 0 && potentialCount < 100000) {
                    reviewCount = potentialCount;
                }
            }
        }
        
        // Pattern 2: Rating in JSON
        const ratingMatch = html.match(/"ratingValue"\s*:\s*"?([\d.,]+)"?/);
        if (ratingMatch) {
            rating = parseFloat(ratingMatch[1].replace(',', '.'));
        }
        
        // Pattern 3: Rating near stars
        if (rating === 0) {
            const pattern3 = html.match(/([1-5][.,]\d+)\s*[★⭐]/);
            if (pattern3) {
                rating = parseFloat(pattern3[1].replace(',', '.'));
            }
        }
        
        // Pattern 4: Aria-label
        if (rating === 0) {
            const altRatingMatch = html.match(/aria-label="([\d.,]+)\s*(?:stars?|bintang)/i);
            if (altRatingMatch) {
                rating = parseFloat(altRatingMatch[1].replace(',', '.'));
            }
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
            const outletWithReview = await fetchReviewData(outlet);
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

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
