const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_VERSION = 'v24.0';
const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;

async function checkToken(token) {
    if (!token) {
        console.error('❌ No token provided.');
        console.log('Usage: node check-token.js <YOUR_ACCESS_TOKEN>');
        process.exit(1);
    }

    const cleanToken = token.replace(/[\s\n\r\t]+/g, '').trim();
    console.log(`\n🔍 Checking token: ${cleanToken.substring(0, 10)}...${cleanToken.substring(cleanToken.length - 5)}\n`);

    try {
        // 1. Check basic validity and permissions
        console.log('1️⃣  Verifying token and fetching permissions...');
        const meResponse = await axios.get(`${GRAPH_URL}/me`, {
            params: {
                fields: 'id,name,permissions',
                access_token: cleanToken
            }
        });

        const userData = meResponse.data;
        console.log(`   ✅ Token is VALID`);
        console.log(`   👤 User ID: ${userData.id}`);
        console.log(`   👤 Name: ${userData.name}`);

        const permissions = userData.permissions?.data || [];
        const scopes = permissions.map(p => p.permission);

        console.log('\n   📜 Granted Permissions:');
        scopes.forEach(scope => console.log(`      - ${scope}`));

        // Check for required scopes
        const requiredScopes = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'pages_show_list',
            'pages_read_engagement',
            'pages_read_user_content'
        ];

        const missingScopes = requiredScopes.filter(s => !scopes.includes(s));

        if (missingScopes.length > 0) {
            console.log('\n   ⚠️  MISSING REQUIRED SCOPES:');
            missingScopes.forEach(s => console.log(`      ❌ ${s}`));
            console.log('   👉 You must re-authenticate to grant these permissions.');
        } else {
            console.log('\n   ✅ All required scopes are present.');
        }

        // 2. Check Instagram Business Account
        console.log('\n2️⃣  Checking Instagram Business Account...');
        // First get the accounts (pages)
        const accountsResponse = await axios.get(`${GRAPH_URL}/me/accounts`, {
            params: {
                fields: 'id,name,instagram_business_account',
                access_token: cleanToken
            }
        });

        const pages = accountsResponse.data.data || [];
        let igAccountFound = false;

        if (pages.length === 0) {
            console.log('   ⚠️  No Facebook Pages found linked to this user.');
        } else {
            console.log(`   📄 Found ${pages.length} Facebook Page(s):`);

            for (const page of pages) {
                const igAccount = page.instagram_business_account;
                if (igAccount) {
                    console.log(`      - Page: ${page.name} (ID: ${page.id})`);
                    console.log(`        📸 Linked Instagram ID: ${igAccount.id}`);
                    igAccountFound = true;

                    // 3. Check Media Endpoint (Dry Run)
                    console.log(`\n3️⃣  Verifying Media Endpoint for IG ID: ${igAccount.id}...`);
                    try {
                        // Just list media to verify access
                        await axios.get(`${GRAPH_URL}/${igAccount.id}/media`, {
                            params: { limit: 1, access_token: cleanToken }
                        });
                        console.log('      ✅ Can access media endpoint (Read access confirmed)');

                        // We can't easily test POST without actually creating a container, 
                        // but read access + correct scopes usually means write is OK.
                        console.log('      ✅ Publishing permissions should be valid (based on scopes)');

                    } catch (mediaError) {
                        console.log(`      ❌ Failed to access media: ${mediaError.message}`);
                        if (mediaError.response?.data?.error) {
                            console.log('      Error details:', JSON.stringify(mediaError.response.data.error, null, 2));
                        }
                    }

                } else {
                    console.log(`      - Page: ${page.name} (ID: ${page.id}) - No Instagram Business Account linked`);
                }
            }
        }

        if (!igAccountFound) {
            console.log('\n   ❌ No Instagram Business Account found linked to any Page.');
            console.log('   👉 Make sure your Instagram account is a Business/Creator account and is linked to a Facebook Page.');
        }

    } catch (error) {
        console.error('\n❌ Token check failed!');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', JSON.stringify(error.response.data.error, null, 2));

            if (error.response.data.error.code === 190) {
                console.error('\n   👉 Error 190 means the token is Invalid or Expired.');
                console.error('   👉 You MUST generate a new token.');
            }
        } else {
            console.error('   Error:', error.message);
        }
        process.exit(1);
    }
}

const token = process.argv[2];
checkToken(token);
