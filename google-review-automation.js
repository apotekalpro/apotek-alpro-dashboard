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
        
        // Try different approaches to fetch the page
        let html = '';
        let fetchSuccess = false;
        
        // Approach 1: Try direct fetch (works in Node.js server environment)
        try {
            const directResponse = await fetch(outlet.link, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                redirect: 'follow'
            });
            html = await directResponse.text();
            if (html.length > 1000) {
                fetchSuccess = true;
                if (index === 0) console.log(`  ✅ Direct fetch successful`);
            }
        } catch (directError) {
            if (index === 0) console.log(`  ⚠️ Direct fetch failed: ${directError.message}`);
        }
        
        // Approach 2: Try with CORS proxy if direct failed
        if (!fetchSuccess) {
            try {
                const proxyResponse = await fetch(CORS_PROXY + encodeURIComponent(outlet.link));
                html = await proxyResponse.text();
                if (html.length > 1000) {
                    fetchSuccess = true;
                    if (index === 0) console.log(`  ✅ CORS proxy fetch successful`);
                }
            } catch (proxyError) {
                if (index === 0) console.log(`  ⚠️ CORS proxy failed: ${proxyError.message}`);
            }
        }
        
        // Debug: Show HTML info for first outlet
        if (index === 0) {
            console.log(`  📄 HTML length: ${html.length}`);
            if (html.length < 1000) {
                console.log(`  ⚠️ HTML too short, might be error page`);
                console.log(`  📄 HTML preview: ${html.substring(0, 200)}`);
            }
        }
        
        // If we got very little HTML, it's probably an error
        if (html.length < 500) {
            console.log(`  ⚠️ ${outlet.name}: Failed to fetch page (HTML length: ${html.length})`);
            return {
                ...outlet,
                reviewCount: 0,
                rating: 0,
                lastChecked: new Date().toISOString(),
                error: 'Failed to fetch page content'
            };
        }
        
        // Parse review count and rating
        const reviewData = parseGoogleMapsHTML(html);
        
        // Enhanced debugging for outlets with missing ratings
        if (reviewData.reviewCount > 0 && reviewData.rating === 0) {
            // Log warning for outlets with reviews but no rating
            console.log(`  ⚠️ ${outlet.name}: ${reviewData.reviewCount} reviews but NO RATING extracted`);
            
            // For first 3 outlets with this issue, show HTML snippets
            if (index < 3) {
                console.log(`  📄 HTML snippet (first 500 chars):`);
                console.log(html.substring(0, 500));
                console.log(`  ...`);
                
                // Try to find any decimal numbers that might be ratings
                const decimals = html.match(/[1-5]\.\d+/g);
                if (decimals) {
                    console.log(`  🔍 Found decimals in HTML: ${decimals.slice(0, 10).join(', ')}`);
                }
            }
        }
        
        // Debug rating extraction for first outlet
        if (index === 0) {
            if (reviewData.rating > 0) {
                console.log(`  ✅ Successfully extracted rating: ${reviewData.rating}`);
            } else {
                // Look for rating patterns in HTML
                const ratingSnippet = html.match(/([1-5][\.,]\d+)[^\d]*\([\d,]+\)/);
                if (ratingSnippet) {
                    console.log(`  📝 Found rating pattern: ${ratingSnippet[0]}`);
                } else {
                    console.log(`  ⚠️ No rating pattern found in HTML`);
                }
            }
        }
        
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
        
        // Pattern 8: Look in window.__INITIAL_DATA__ or similar JavaScript variables
        if (rating === 0) {
            const jsData = html.match(/window\.__[A-Z_]+__\s*=\s*({[\s\S]+?});/);
            if (jsData) {
                try {
                    const dataStr = jsData[1];
                    const ratingInJs = dataStr.match(/"rating(?:Value)?"\s*:\s*"?([\d.]+)"?/);
                    if (ratingInJs) {
                        rating = parseFloat(ratingInJs[1]);
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        }
        
        // Pattern 9: Look for rating in any JSON structure
        if (rating === 0) {
            const allJsonRatings = html.match(/"(?:rating|ratingValue|averageRating)"\s*:\s*"?([\d.]+)"?/g);
            if (allJsonRatings && allJsonRatings.length > 0) {
                // Take the first valid rating found
                for (const match of allJsonRatings) {
                    const val = match.match(/([\d.]+)/);
                    if (val) {
                        const possibleRating = parseFloat(val[1]);
                        if (possibleRating >= 1.0 && possibleRating <= 5.0) {
                            rating = possibleRating;
                            break;
                        }
                    }
                }
            }
        }
        
        // Pattern 10: Meta tags (og:rating, rating meta)
        if (rating === 0) {
            const metaRating = html.match(/<meta[^>]*(?:property|name)="(?:og:)?rating"[^>]*content="([\d.]+)"/i);
            if (metaRating) {
                rating = parseFloat(metaRating[1]);
            }
        }
        
        // Pattern 11: Look for rating in data attributes
        if (rating === 0) {
            const dataRating = html.match(/data-rating="([\d.]+)"/i);
            if (dataRating) {
                rating = parseFloat(dataRating[1]);
            }
        }
        
        // Pattern 12: Schema.org LocalBusiness rating
        if (rating === 0) {
            const schemaRating = html.match(/"@type"\s*:\s*"LocalBusiness"[\s\S]{0,500}"ratingValue"\s*:\s*"?([\d.]+)"?/);
            if (schemaRating) {
                rating = parseFloat(schemaRating[1]);
            }
        }
        
        // Pattern 13: Extract from the specific review count context
        // If we have review count, look for rating immediately before it in various formats
        if (rating === 0 && reviewCount > 0) {
            // Try multiple patterns around the review count
            const patterns = [
                new RegExp(`([1-5][\\.\\,]\\d)\\s*(?:stars?)?\\s*[\\(\\[]?${reviewCount}[\\)\\]]?`),
                new RegExp(`([1-5][\\.\\,]\\d)[^\\d]{0,20}${reviewCount}`),
                new RegExp(`rating[^\\d]*([1-5][\\.\\,]\\d)[^\\d]*${reviewCount}`, 'i')
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    rating = parseFloat(match[1].replace(',', '.'));
                    break;
                }
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
