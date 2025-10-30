// Simple CommonJS script to setup admin
// Run with: node server/setup-admin.js

const { Pool } = require('@neondatabase/serverless');

async function setupAdmin() {
  // Load .env file
  require('dotenv').config();
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env file');
    process.exit(1);
  }
  
  console.log('✓ DATABASE_URL loaded');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('\n🔍 Finding admin user...');
    
    // Find admin user
    const adminResult = await pool.query(
      `SELECT id, username, email, glory_balance, image_credits, role 
       FROM users 
       WHERE role = 'admin' 
       LIMIT 1`
    );
    
    if (adminResult.rows.length === 0) {
      console.error('❌ No admin user found!');
      process.exit(1);
    }
    
    const admin = adminResult.rows[0];
    console.log(`✓ Found admin: ${admin.username} (${admin.email})`);
    console.log(`  Current GLORY balance: ${admin.glory_balance}`);
    console.log(`  Current image credits: ${admin.image_credits}`);
    
    // Add 1000 GLORY credits
    console.log('\n💎 Adding 1000 GLORY credits...');
    
    await pool.query(
      `INSERT INTO glory_ledger (id, user_id, delta, currency, reason, created_at)
       VALUES (gen_random_uuid(), $1, '1000', 'GLORY', 'Admin bonus: 1000 credits', NOW())`,
      [admin.id]
    );
    
    await pool.query(
      `UPDATE users 
       SET glory_balance = glory_balance + 1000,
           updated_at = NOW()
       WHERE id = $1`,
      [admin.id]
    );
    
    console.log('✓ Added 1000 GLORY credits');
    
    // Get Studio tier
    console.log('\n🏆 Finding Studio tier...');
    
    const tierResult = await pool.query(
      `SELECT id, name, slug, monthly_credits, price_usd
       FROM subscription_tiers
       WHERE slug = 'studio'
       LIMIT 1`
    );
    
    if (tierResult.rows.length === 0) {
      console.error('❌ Studio tier not found! Run seed-tiers first.');
      process.exit(1);
    }
    
    const studioTier = tierResult.rows[0];
    console.log(`✓ Found tier: ${studioTier.name} ($${studioTier.price_usd / 100})`);
    console.log(`  Monthly credits: ${studioTier.monthly_credits}`);
    
    // Check existing subscription
    const subResult = await pool.query(
      `SELECT id FROM user_subscriptions WHERE user_id = $1 LIMIT 1`,
      [admin.id]
    );
    
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 10); // 10 years
    
    if (subResult.rows.length > 0) {
      console.log('\n📝 Updating existing subscription...');
      
      await pool.query(
        `UPDATE user_subscriptions
         SET tier_id = $1,
             status = 'active',
             payment_method = 'admin',
             current_period_start = $2,
             current_period_end = $3,
             credits_granted = $4,
             credits_granted_at = $2,
             cancel_at_period_end = false,
             cancelled_at = NULL,
             updated_at = $2
         WHERE user_id = $5`,
        [studioTier.id, now, periodEnd, studioTier.monthly_credits, admin.id]
      );
      
      console.log('✓ Subscription updated to Studio tier');
    } else {
      console.log('\n📝 Creating new subscription...');
      
      await pool.query(
        `INSERT INTO user_subscriptions 
         (id, user_id, tier_id, status, payment_method, current_period_start, current_period_end, 
          credits_granted, credits_granted_at, cancel_at_period_end, created_at, updated_at)
         VALUES 
         (gen_random_uuid(), $1, $2, 'active', 'admin', $3, $4, $5, $3, false, $3, $3)`,
        [admin.id, studioTier.id, now, periodEnd, studioTier.monthly_credits]
      );
      
      console.log('✓ Subscription created with Studio tier');
    }
    
    // Grant monthly credits (add to image_credits)
    console.log('\n🎁 Granting monthly image credits...');
    
    await pool.query(
      `UPDATE users 
       SET image_credits = image_credits + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [studioTier.monthly_credits, admin.id]
    );
    
    console.log(`✓ Granted ${studioTier.monthly_credits} image credits`);
    
    // Show final balance
    const finalResult = await pool.query(
      `SELECT u.username, u.email, u.glory_balance, u.image_credits, 
              u.sol_balance, u.usdc_balance,
              st.name as tier_name, us.credits_granted,
              us.current_period_end
       FROM users u
       LEFT JOIN user_subscriptions us ON u.id = us.user_id
       LEFT JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE u.id = $1`,
      [admin.id]
    );
    
    const final = finalResult.rows[0];
    
    console.log('\n📊 Final admin status:');
    console.log(`  Username: ${final.username}`);
    console.log(`  Email: ${final.email}`);
    console.log(`  GLORY Balance: ${final.glory_balance}`);
    console.log(`  Image Credits: ${final.image_credits}`);
    console.log(`  SOL Balance: ${final.sol_balance}`);
    console.log(`  USDC Balance: ${final.usdc_balance}`);
    
    if (final.tier_name) {
      console.log(`\n  Subscription: ${final.tier_name}`);
      console.log(`  Monthly Credits: ${final.credits_granted}`);
      console.log(`  Valid until: ${final.current_period_end}`);
    }
    
    console.log('\n✅ All done! Admin user updated successfully.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupAdmin()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

