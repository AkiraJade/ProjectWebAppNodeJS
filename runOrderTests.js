const baseURL = 'http://localhost:3000/api/v1';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('====================================');
    console.log('Starting Order & Transaction Email Tests');
    console.log('====================================\n');

    let token = '';
    let userId = '';
    let verificationToken = '';
    const testEmail = 'buyer_' + Date.now() + '@example.com';
    const testPassword = 'Password123!';

    try {
        // 1. Register
        console.log('[1/5] Registering new test buyer...');
        const regRes = await fetch(`${baseURL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fname: 'Buyer', lname: 'Test',
                email: testEmail, password: testPassword,
                phone: '123-456-7890', dob: '2000-01-01'
            })
        });
        const regData = await regRes.json();
        userId = regData.userId;

        await delay(1000);
        const { sequelize } = require('./models');

        // Set user to admin so we can test transaction updates, and verify them
        await sequelize.query(`UPDATE users SET role='admin', is_verified=1 WHERE id=${userId}`);
        console.log('  -> Account verified and elevated to Admin.');

        // 2. Login
        console.log('\n[2/5] Logging in...');
        const loginRes = await fetch(`${baseURL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        const loginData = await loginRes.json();
        token = loginData.token;

        // Find an item with stock
        const itemRecs = await sequelize.query(`SELECT id AS item_id FROM item WHERE quantity > 0 LIMIT 1`, { type: sequelize.QueryTypes.SELECT });
        if (itemRecs.length === 0) throw new Error('No items with stock available for test.');
        const itemId = itemRecs[0].item_id;

        console.log('  -> Waiting 3 seconds for Mailtrap rate limits...');
        await delay(3000);

        // 3. Checkout
        console.log('\n[3/5] Checking out (Expect: Order Success Email)...');
        const checkoutRes = await fetch(`${baseURL}/create-order`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cart: [{ item_id: itemId, quantity: 1 }],
                user: { id: userId },
                payment_method: 'credit_card',
                shipping_address: '456 Test Blvd'
            })
        });
        const checkoutData = await checkoutRes.json();
        if (!checkoutRes.ok) throw new Error(checkoutData.error || 'Checkout failed');
        console.log('  -> Checkout Response:', checkoutData.message || 'Success', 'Order ID:', checkoutData.order_id);
        const orderId = checkoutData.order_id;

        console.log('  -> Waiting 3 seconds for Mailtrap rate limits...');
        await delay(3000);

        // Get the transaction ID for the order
        const txRecs = await sequelize.query(`SELECT id AS transaction_id FROM payments WHERE orderinfo_id = ${orderId}`, { type: sequelize.QueryTypes.SELECT });
        if (txRecs.length === 0) throw new Error('Transaction record not found.');
        const txId = txRecs[0].transaction_id;

        // 4. Update Transaction Status to Paid
        console.log('\n[4/5] Updating Transaction Status to "paid" (Expect: Receipt Email with PDF)...');
        const updateRes = await fetch(`${baseURL}/transactions/${txId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'paid' })
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error(updateData.error || 'Update failed');
        console.log('  -> Update Response:', updateData.message || 'Success');

        console.log('  -> Waiting 3 seconds for Mailtrap rate limits...');
        await delay(3000);

        // 5. Update Transaction Status to Shipped
        console.log('\n[5/5] Updating Transaction Status to "shipped" (Expect: Status Update Email)...');
        const updateRes2 = await fetch(`${baseURL}/transactions/${txId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'shipped' })
        });
        const updateData2 = await updateRes2.json();
        console.log('  -> Update Response:', updateData2.message || 'Success');

        console.log('\n====================================');
        console.log('Order Tests Completed!');
        console.log('Check Mailtrap inbox to see Order Success, Receipt (with PDF), and Shipping updates.');
        console.log('====================================\n');
        
    } catch (error) {
        console.error('\n!!! TEST SUITE FAILED !!!');
        console.error(error.message);
    } finally {
        process.exit();
    }
}

runTests();
