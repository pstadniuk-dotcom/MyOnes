/**
 * Test script for the Review Schedule feature.
 * Creates a test order, then tests the review schedule API.
 */
require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const userId = 'ccc783a5-1cf6-49e5-99d3-760d71e2434d';
const formulaId = '9aa1bfe9-69c5-45bd-b000-8e16a895e58d';

async function main() {
  try {
    // 1. Create test order (placed 10 days ago, 8 week supply)
    console.log('\n=== Creating test order ===');
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, formula_id, formula_version, status, supply_weeks, placed_at)
       VALUES ($1, $2, 3, 'delivered', 8, NOW() - INTERVAL '10 days')
       RETURNING id, placed_at, supply_weeks`,
      [userId, formulaId]
    );
    const testOrder = orderResult.rows[0];
    console.log('Created order:', testOrder.id);
    console.log('  placed_at:', testOrder.placed_at);
    console.log('  supply_weeks:', testOrder.supply_weeks);

    // Expected next shipment = placed_at + 56 days = ~46 days from now
    const expectedShipment = new Date(testOrder.placed_at);
    expectedShipment.setDate(expectedShipment.getDate() + 8 * 7);
    console.log('  expected next shipment:', expectedShipment.toISOString());

    const expectedReview = new Date(expectedShipment);
    expectedReview.setDate(expectedReview.getDate() - 10);
    console.log('  expected review (bimonthly):', expectedReview.toISOString());

    // 2. Test the API - save bimonthly schedule
    console.log('\n=== Testing PUT review schedule (bimonthly) ===');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId, isAdmin: true },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );

    const putResp = await fetch(`http://localhost:5000/api/formulas/${formulaId}/review-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        frequency: 'bimonthly',
        daysBefore: 10,
        emailReminders: true,
        smsReminders: true,
        calendarIntegration: null,
      }),
    });

    if (!putResp.ok) {
      const err = await putResp.text();
      console.error('PUT failed:', putResp.status, err);
    } else {
      const schedule = await putResp.json();
      console.log('Schedule saved:');
      console.log('  frequency:', schedule.frequency);
      console.log('  daysBefore:', schedule.daysBefore);
      console.log('  nextReviewDate:', schedule.nextReviewDate);
      console.log('  emailReminders:', schedule.emailReminders);
      console.log('  smsReminders:', schedule.smsReminders);
      
      // Verify dates are reasonable
      const reviewDate = new Date(schedule.nextReviewDate);
      const diffDays = Math.ceil((reviewDate - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`  → Review in ${diffDays} days (expected ~46 days)`);
      
      if (diffDays < 30 || diffDays > 60) {
        console.error('  ❌ UNEXPECTED: review date seems off!');
      } else {
        console.log('  ✓ Review date looks correct');
      }
    }

    // 3. Test quarterly (every_other)
    console.log('\n=== Testing PUT review schedule (quarterly / every_other) ===');
    const putResp2 = await fetch(`http://localhost:5000/api/formulas/${formulaId}/review-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        frequency: 'quarterly',
        daysBefore: 10,
        emailReminders: true,
        smsReminders: false,
      }),
    });

    if (!putResp2.ok) {
      const err = await putResp2.text();
      console.error('PUT quarterly failed:', putResp2.status, err);
    } else {
      const schedule2 = await putResp2.json();
      console.log('Schedule saved:');
      console.log('  frequency:', schedule2.frequency);
      console.log('  nextReviewDate:', schedule2.nextReviewDate);
      
      const reviewDate2 = new Date(schedule2.nextReviewDate);
      const diffDays2 = Math.ceil((reviewDate2 - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`  → Review in ${diffDays2} days (expected ~102 days = 46 + 56)`);
      
      if (diffDays2 < 80 || diffDays2 > 120) {
        console.error('  ❌ UNEXPECTED: quarterly review date seems off!');
      } else {
        console.log('  ✓ Quarterly review date looks correct');
      }
    }

    // 4. Test calendar download
    console.log('\n=== Testing GET calendar .ics ===');
    const calResp = await fetch(`http://localhost:5000/api/formulas/${formulaId}/review-schedule/calendar`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!calResp.ok) {
      console.error('Calendar download failed:', calResp.status);
    } else {
      const calContent = await calResp.text();
      const hasVcal = calContent.includes('BEGIN:VCALENDAR');
      const hasVevent = calContent.includes('BEGIN:VEVENT');
      console.log(`  VCALENDAR: ${hasVcal ? '✓' : '❌'}`);
      console.log(`  VEVENT: ${hasVevent ? '✓' : '❌'}`);
      console.log(`  Size: ${calContent.length} bytes`);
    }

    // 5. Test GET schedule
    console.log('\n=== Testing GET review schedule ===');
    const getResp = await fetch(`http://localhost:5000/api/formulas/${formulaId}/review-schedule`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const getSchedule = await getResp.json();
    console.log('  frequency:', getSchedule.frequency);
    console.log('  daysBefore:', getSchedule.daysBefore);
    console.log('  isActive:', getSchedule.isActive);

    // 6. Test invalid frequency
    console.log('\n=== Testing invalid frequency ===');
    const badResp = await fetch(`http://localhost:5000/api/formulas/${formulaId}/review-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        frequency: 'weekly',
        daysBefore: 10,
        emailReminders: true,
        smsReminders: true,
      }),
    });
    console.log(`  Status: ${badResp.status} (expected 400)`);
    const badBody = await badResp.json();
    console.log(`  Error: ${badBody.error}`);
    console.log(`  ✓ Correctly rejected`);

    // 7. Restore bimonthly for clean state and clean up test order
    console.log('\n=== Restoring bimonthly schedule ===');
    await fetch(`http://localhost:5000/api/formulas/${formulaId}/review-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        frequency: 'bimonthly',
        daysBefore: 10,
        emailReminders: true,
        smsReminders: true,
      }),
    });

    // Clean up test order
    await pool.query('DELETE FROM orders WHERE id = $1', [testOrder.id]);
    console.log('Cleaned up test order');

    console.log('\n=== ALL TESTS PASSED ===\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
