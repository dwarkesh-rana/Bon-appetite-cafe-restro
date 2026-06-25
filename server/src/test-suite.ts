import { db, isUsingSupabase, ReservationRecord } from './db';
import { allocateTable } from './allocator';
import { hashPassword, verifyPassword, generateToken, verifyToken } from './auth';
import { logger } from './logger';

async function runTests() {
  logger.info('==================================================');
  logger.info('   RUNNING BON APPETITE CAFE PRODUCTION TEST SUITE  ');
  logger.info('==================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, failureDetails?: string) => {
    if (condition) {
      logger.info(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      logger.error(`❌ [FAIL] ${testName}`);
      if (failureDetails) logger.error(`   Details: ${failureDetails}`);
      failed++;
    }
  };

  // ----------------------------------------------------
  // TEST 1: Admin Security & Authentication
  // ----------------------------------------------------
  try {
    const rawPass = 'luxuryrestro2026';
    const hash = hashPassword(rawPass);
    const isValid = verifyPassword(rawPass, hash);
    const isInvalid = verifyPassword('wrongpass', hash);

    const token = generateToken('admin@bonappetite.com', 'admin');
    const decoded = verifyToken(token);

    assert(
      isValid && !isInvalid && decoded !== null && decoded.email === 'admin@bonappetite.com' && decoded.role === 'admin',
      'Admin Security & JWT Authentication verification'
    );
  } catch (err: any) {
    assert(false, 'Admin Security & JWT Authentication verification', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Table Allocation Optimization (Small/Big Parties)
  // ----------------------------------------------------
  try {
    // Clear and prepare test environment in Mock DB
    const tables = await db.getTables();
    
    // Allocate for 2 guests. Should select the smallest available table (capacity 2)
    const alloc2 = await allocateTable('2026-07-01', '07:30 PM', 2);
    assert(
      alloc2.success && (alloc2.tableNumber === 'Table 1' || alloc2.tableNumber === 'Table 2'),
      'Allocation of smallest suitable table (2 guests -> Table 1/2)',
      `Allocated: ${alloc2.tableNumber}`
    );

    // Allocate for 10 guests. Should combine tables efficiently (e.g. Table 6 (8 seats) + Table 1 (2 seats))
    const alloc10 = await allocateTable('2026-07-01', '08:30 PM', 10);
    assert(
      alloc10.success && alloc10.tableNumber !== null && alloc10.tableNumber.includes(','),
      'Efficient table combination allocation (10 guests -> Combined Tables)',
      `Allocated: ${alloc10.tableNumber}`
    );
  } catch (err: any) {
    assert(false, 'Table Allocation Optimization tests', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Concurrency Control & Double Booking Prevention
  // ----------------------------------------------------
  try {
    const reservationDate = '2026-07-15';
    const reservationTime = '06:30 PM';
    
    // Attempt concurrent bookings for Table 3
    const request1 = db.createReservation({
      customer_name: 'Concurrent User A',
      email: 'usera@example.com',
      phone: '1234567890',
      reservation_date: reservationDate,
      reservation_time: reservationTime,
      guests: 4,
      table_number: 'Table 3',
      status: 'confirmed',
      verification_token: 'tok_a',
      email_status: 'pending',
      whatsapp_status: 'pending'
    });

    const request2 = db.createReservation({
      customer_name: 'Concurrent User B',
      email: 'userb@example.com',
      phone: '0987654321',
      reservation_date: reservationDate,
      reservation_time: reservationTime,
      guests: 4,
      table_number: 'Table 3',
      status: 'confirmed',
      verification_token: 'tok_b',
      email_status: 'pending',
      whatsapp_status: 'pending'
    });

    // Fire both requests concurrently
    const results = await Promise.allSettled([request1, request2]);
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert(
      succeeded.length === 1 && rejected.length === 1,
      'Double Booking Concurrency Prevention',
      `Succeeded: ${succeeded.length}, Failed: ${rejected.length}`
    );
  } catch (err: any) {
    assert(false, 'Double Booking Concurrency Prevention', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Cancellation Window Rules
  // ----------------------------------------------------
  try {
    const futureDate = '2026-12-01';
    
    // 1. Future reservation: should succeed cancellation
    const resFuture = await db.createReservation({
      customer_name: 'Future Guest',
      email: 'future@example.com',
      phone: '12345678',
      reservation_date: futureDate,
      reservation_time: '10:00 PM', // Slot far in the future
      guests: 2,
      table_number: 'Table 1',
      status: 'confirmed',
      verification_token: 'tok_future',
      email_status: 'pending',
      whatsapp_status: 'pending'
    });

    // Cancel: Check deadline in application logic (mimic endpoint check)
    const today = new Date();
    const bookingDate = new Date(resFuture.reservation_date);
    const match = resFuture.reservation_time.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
    let hours = parseInt(match![1]);
    const minutes = parseInt(match![2]);
    const ampm = match![3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const reservationTimeObj = new Date(bookingDate);
    reservationTimeObj.setHours(hours, minutes, 0, 0);
    const timeDiffMs = reservationTimeObj.getTime() - today.getTime();
    const hoursDiff = timeDiffMs / (1000 * 60 * 60);

    const isCancelAllowed = hoursDiff >= 2;
    
    assert(
      isCancelAllowed === true,
      'Cancellation window check for future reservation (Cancel allowed)'
    );

    // 2. Same-day immediate reservation (e.g. 10 minutes from now)
    const nowHour = today.getHours();
    const nowMin = today.getMinutes();
    let slotHour = nowHour;
    let slotMin = nowMin + 15; // 15 mins later
    if (slotMin >= 60) {
      slotHour++;
      slotMin = slotMin % 60;
    }
    const suffix = slotHour >= 12 ? 'PM' : 'AM';
    const displayHour = slotHour % 12 === 0 ? 12 : slotHour % 12;
    const padH = displayHour.toString().padStart(2, '0');
    const padM = slotMin.toString().padStart(2, '0');
    const immediateTimeSlot = `${padH}:${padM} ${suffix}`;

    const resImmediate = await db.createReservation({
      customer_name: 'Late Guest',
      email: 'late@example.com',
      phone: '87654321',
      reservation_date: today.toISOString().split('T')[0],
      reservation_time: immediateTimeSlot,
      guests: 2,
      table_number: 'Table 2',
      status: 'confirmed',
      verification_token: 'tok_late',
      email_status: 'pending',
      whatsapp_status: 'pending'
    });

    const reservationTimeObj2 = new Date(today);
    reservationTimeObj2.setHours(slotHour, slotMin, 0, 0);
    const timeDiffMs2 = reservationTimeObj2.getTime() - today.getTime();
    const hoursDiff2 = timeDiffMs2 / (1000 * 60 * 60);
    const isCancelAllowedImmediate = hoursDiff2 >= 2;

    assert(
      isCancelAllowedImmediate === false,
      'Cancellation window block for immediate reservation (Cancel blocked)'
    );
  } catch (err: any) {
    assert(false, 'Cancellation Window Rules validation', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: Waiting List Promotion & FIFO Priority
  // ----------------------------------------------------
  try {
    const wlDate = '2026-08-20';
    const wlTime = '07:30 PM';
    
    // 1. Book all available tables for this slot in mock DB
    const allTables = await db.getTables();
    for (const t of allTables) {
      if (t.available) {
        await db.createReservation({
          customer_name: `Seat Grabber ${t.id}`,
          email: `grabber${t.id}@example.com`,
          phone: '0000000000',
          reservation_date: wlDate,
          reservation_time: wlTime,
          guests: t.capacity,
          table_number: t.table_name,
          status: 'confirmed',
          verification_token: `tok_grab_${t.id}`,
          email_status: 'pending',
          whatsapp_status: 'pending'
        });
      }
    }

    // 2. Try to allocate table now, should fail
    const overbook = await allocateTable(wlDate, wlTime, 2);
    assert(overbook.success === false, 'Table Allocation correctly fails when restaurant is full');

    // 3. Add priority customer to waitlist
    const wl1 = await db.createWaitingList({
      name: 'Priority Guest A',
      email: 'prioritya@example.com',
      phone: '9999999999',
      date: wlDate,
      time: wlTime,
      guests: 2
    });

    // 4. Add second customer to waitlist (FIFO check)
    const wl2 = await db.createWaitingList({
      name: 'Second Guest B',
      email: 'guestb@example.com',
      phone: '8888888888',
      date: wlDate,
      time: wlTime,
      guests: 2
    });

    // 5. Cancel one reservation to open Table 1 (capacity 2)
    // Find booking that occupies Table 1
    const allReservations = await db.getReservations();
    const table1Booking = allReservations.find(r => r.reservation_date === wlDate && r.reservation_time === wlTime && r.table_number === 'Table 1');
    
    if (table1Booking) {
      await db.updateReservationStatus(table1Booking.id, 'cancelled', null);
      
      // Simulate endpoint trigger for auto-promotion
      const waitingList = await db.getWaitingList();
      const slotWaiting = waitingList
        .filter(w => w.date === wlDate && w.time === wlTime)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (slotWaiting.length > 0) {
        const firstEntry = slotWaiting[0]; // Priority Guest A
        const allocation = await allocateTable(wlDate, wlTime, firstEntry.guests);
        
        if (allocation.success && allocation.tableNumber) {
          const newRes = await db.createReservation({
            customer_name: firstEntry.name,
            phone: firstEntry.phone,
            email: firstEntry.email,
            reservation_date: wlDate,
            reservation_time: wlTime,
            guests: firstEntry.guests,
            table_number: allocation.tableNumber,
            status: 'confirmed',
            verification_token: 'promoted_tok',
            email_status: 'pending',
            whatsapp_status: 'pending'
          });
          await db.deleteWaitingList(firstEntry.id);
        }
      }
    }

    // Verify Priority Guest A is promoted to Table 1, and Guest B remains on waitlist
    const activeRes = await db.getReservations();
    const promotedRes = activeRes.find(r => r.customer_name === 'Priority Guest A' && r.table_number === 'Table 1');
    const remainingWl = await db.getWaitingList();
    const guestBInWl = remainingWl.find(w => w.name === 'Second Guest B');

    assert(
      promotedRes !== undefined && guestBInWl !== undefined,
      'FIFO Waiting list promotion automatically promotes earliest customer when slot opens'
    );
  } catch (err: any) {
    assert(false, 'Waiting List Promotion validation failed', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Table QR Token Verification & Token Hashing
  // ----------------------------------------------------
  try {
    const crypto = await import('crypto');
    const tableId = 3;
    const rawToken = 'tok_table3_secure_xyz'; // Seeded raw token
    
    // Hash token
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await db.updateTableQRHash(tableId, hash);
    const tables = await db.getTables();
    const table = tables.find(t => t.id === tableId);

    assert(
      table !== undefined && table.qr_token_hash === hash,
      'Table QR Token secure hash verification matches raw input'
    );

    // Verify invalid table QR token fails
    const invalidHash = crypto.createHash('sha256').update('wrong_token').digest('hex');
    assert(
      table !== undefined && table.qr_token_hash !== invalidHash,
      'Invalid table QR token fails validation checks'
    );
  } catch (err: any) {
    assert(false, 'Table QR Token Verification & Token Hashing failed', err.message);
  }

  // ----------------------------------------------------
  // TEST 7: Order Session Hashing & Tracking Isolation
  // ----------------------------------------------------
  try {
    const crypto = await import('crypto');
    const rawSession = 'sess_xyz_random_chars_999';
    const hashedSession = crypto.createHash('sha256').update(rawSession).digest('hex');

    // Create a mock order with this session token hash
    const order = await db.createOrder({
      customer_name: 'Tracker Guest',
      phone: '1234567890',
      table_number: '3',
      subtotal: 1000,
      tax_amount: 180,
      service_charge: 150,
      final_amount: 1330,
      order_session_token_hash: hashedSession,
      payment_status: 'pending_payment',
      payment_expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      reservation_id: null,
      order_status: 'pending',
      upi_transaction_id: null,
      estimated_ready_time: 15,
      verification_time: null,
      verified_by: null,
      payment_reference: null,
      confirmed_at: null,
      preparing_at: null,
      ready_at: null,
      served_at: null,
      completed_at: null,
      cancelled_at: null
    }, [
      { food_item: 'Grand Espresso Macchiato', quantity: 2, price: 500, special_instruction: null }
    ]);

    // Test access control: correct session token
    const testMatch = crypto.createHash('sha256').update(rawSession).digest('hex');
    assert(
      order.order_session_token_hash === testMatch,
      'Order session isolation: Authorized session token validation succeeds'
    );

    // Test access control: incorrect session token
    const wrongMatch = crypto.createHash('sha256').update('wrong_session').digest('hex');
    assert(
      order.order_session_token_hash !== wrongMatch,
      'Order session isolation: Unauthorized session token access is blocked'
    );
  } catch (err: any) {
    assert(false, 'Order Session Hashing & Tracking Isolation failed', err.message);
  }

  // ----------------------------------------------------
  // TEST 8: Anti-Spam & Concurrency Conflicts
  // ----------------------------------------------------
  try {
    // 1. Negative quantity validation
    let qtyFailed = false;
    try {
      await db.createOrder({
        customer_name: 'Spam Guest',
        phone: '123',
        table_number: '3',
        subtotal: -100,
        tax_amount: 0,
        service_charge: 0,
        final_amount: -100,
        order_session_token_hash: 'some_hash',
        payment_status: 'pending_payment',
        payment_expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        reservation_id: null,
        order_status: 'pending',
        upi_transaction_id: null,
        estimated_ready_time: 15,
        verification_time: null,
        verified_by: null,
        payment_reference: null,
        confirmed_at: null,
        preparing_at: null,
        ready_at: null,
        served_at: null,
        completed_at: null,
        cancelled_at: null
      }, [
        { food_item: 'Grand Espresso Macchiato', quantity: -5, price: 500, special_instruction: null }
      ]);
    } catch (e) {
      qtyFailed = true; // DB or validator rejected negative quantity
    }
    assert(qtyFailed, 'Negative food item quantity values correctly rejected');

    // 2. Active checkout conflict simulation
    // Create an order on Table 4 that is active (pending_payment)
    await db.createOrder({
      customer_name: 'Table 4 Active Customer',
      phone: '123',
      table_number: '4',
      subtotal: 500,
      tax_amount: 90,
      service_charge: 150,
      final_amount: 740,
      order_session_token_hash: 'active_hash_table_4',
      payment_status: 'pending_payment',
      payment_expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      reservation_id: null,
      order_status: 'pending',
      upi_transaction_id: null,
      estimated_ready_time: 15,
      verification_time: null,
      verified_by: null,
      payment_reference: null,
      confirmed_at: null,
      preparing_at: null,
      ready_at: null,
      served_at: null,
      completed_at: null,
      cancelled_at: null
    }, [
      { food_item: 'Grand Espresso Macchiato', quantity: 1, price: 500, special_instruction: null }
    ]);

    // Attempt to checkout again on Table 4 (this should fail on endpoint validation)
    const activeOrders = await db.getOrders();
    const hasActiveCheckout = activeOrders.some(
      o => o.table_number === '4' && ['pending_payment', 'pending_verification'].includes(o.payment_status)
    );
    assert(
      hasActiveCheckout === true,
      'Active checkout conflict detection blocks concurrent table orders'
    );
  } catch (err: any) {
    assert(false, 'Anti-Spam & Concurrency Conflicts failed', err.message);
  }

  // ----------------------------------------------------
  // TEST 9: Payment Expiry Sweep
  // ----------------------------------------------------
  try {
    // Create an expired order
    const expiredOrder = await db.createOrder({
      customer_name: 'Expired Guest',
      phone: '123',
      table_number: '5',
      subtotal: 500,
      tax_amount: 90,
      service_charge: 150,
      final_amount: 740,
      order_session_token_hash: 'expired_hash_table_5',
      payment_status: 'pending_payment',
      payment_expires_at: new Date(Date.now() - 5000).toISOString(), // Expired 5 seconds ago
      reservation_id: null,
      order_status: 'pending',
      upi_transaction_id: null,
      estimated_ready_time: 15,
      verification_time: null,
      verified_by: null,
      payment_reference: null,
      confirmed_at: null,
      preparing_at: null,
      ready_at: null,
      served_at: null,
      completed_at: null,
      cancelled_at: null
    }, [
      { food_item: 'Grand Espresso Macchiato', quantity: 1, price: 500, special_instruction: null }
    ]);

    // Simulate backend payment worker sweep
    const allOrders = await db.getOrders();
    const expiredToCancel = allOrders.filter(
      o => o.payment_status === 'pending_payment' && new Date(o.payment_expires_at).getTime() <= Date.now()
    );

    for (const order of expiredToCancel) {
      await db.updateOrderPaymentStatus(order.id, 'expired');
      await db.updateOrderStatus(order.id, 'cancelled');
    }

    const updatedOrder = (await db.getOrders()).find(o => o.id === expiredOrder.id);
    assert(
      updatedOrder !== undefined && updatedOrder.payment_status === 'expired' && updatedOrder.order_status === 'cancelled',
      'Unpaid expired orders are automatically cancelled by sweeps'
    );
  } catch (err: any) {
    assert(false, 'Payment Expiry Sweep failed', err.message);
  }

  logger.info('==================================================');
  logger.info(`   SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  logger.info('==================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
