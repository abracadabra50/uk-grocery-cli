# Payment Handling - Security & Safety

## Critical: Payment is NEVER Automated

This CLI **does not and will not** automate payment completion. Here's why and how it works:

## Why Payment is Manual Only

1. **Security**: Automating payment entry would require storing credit card details
2. **PCI Compliance**: Automated payment would require PCI DSS certification  
3. **User Safety**: Users must see and approve final total before payment
4. **Legal**: Automated purchases without explicit confirmation could be problematic
5. **Trust**: You should never trust automated payment in any tool

## How Checkout Works

### Dry Run (Preview Only)
```bash
groc checkout --dry-run
```

**What happens:**
- ✅ Loads basket
- ✅ Shows total
- ✅ Takes screenshot
- ❌ Does NOT book slot
- ❌ Does NOT navigate to payment
- ❌ Does NOT complete order

**Use for:** Previewing order before committing

### Real Checkout
```bash
groc checkout
```

**What happens:**
1. Loads basket
2. Clicks "Checkout" button
3. If slot needed → browser stays open, you select manually
4. Navigates to payment page
5. **STOPS HERE**
6. Browser stays open for 5 minutes
7. You complete payment manually

**The CLI:**
- Shows order summary
- Displays clear "PAYMENT REQUIRED" warning
- Keeps browser visible
- Waits for YOU to complete payment
- Closes after 5 minutes or when you close terminal

## What You See

```
💳 Step 4: At payment page...
📊 Order Summary:
├─ Items total: £25.00
├─ Delivery: £2.50
└─ Total: £27.50

🛑 PAYMENT REQUIRED
╔═══════════════════════════════════════════╗
║  THIS CLI DOES NOT HANDLE PAYMENT        ║
║  Complete payment manually in browser     ║
║  OR use saved payment method if prompted  ║
╚═══════════════════════════════════════════╝

⏳ Keeping browser open for 5 minutes...
   Close this terminal to cancel
   Complete payment in browser to finish order
```

## Technical Implementation

### Browser Automation
- Uses Playwright to navigate checkout flow
- Browser is **always visible** during checkout (never headless)
- You can see exactly what's happening
- You maintain full control

### Code Safeguards

```typescript
// From src/browser/checkout.ts

console.log('\n🛑 PAYMENT REQUIRED');
console.log('╔═══════════════════════════════════════════╗');
console.log('║  THIS CLI DOES NOT HANDLE PAYMENT        ║');
console.log('║  Complete payment manually in browser     ║');
console.log('╚═══════════════════════════════════════════╝');

// Wait for USER to complete payment (5 min timeout)
await page.waitForTimeout(300000);
```

**The code:**
1. Never fills in payment fields
2. Never clicks "Place Order" button
3. Never submits payment forms
4. Only waits and observes

### Payment Methods

**If you have saved payment:**
- Sainsbury's may show "Pay with saved card"
- You click this manually in browser
- You confirm manually

**If entering new payment:**
- You enter card details manually in browser
- You click "Place Order" manually
- CLI just waits

## For Agents/Automation

If you're building an AI agent that uses this CLI:

### Safe Usage
```typescript
// In your agent code
await cli.checkout({ dryRun: true }); // Preview only
const confirmed = await askUser("Proceed with order?");
if (confirmed) {
  await cli.checkout(); // Opens browser, user completes payment
}
```

### Unsafe (DON'T DO THIS)
```typescript
// NEVER automate payment
await cli.checkout();
await autoFillCreditCard(); // ❌ NEVER
await autoClickPlaceOrder(); // ❌ NEVER
```

## Verification

You can verify payment is manual by:

1. Reading the source code: `src/browser/checkout.ts`
2. Running checkout yourself and watching the browser
3. Checking the console output - it explicitly says "manual payment required"
4. No credit card fields are ever filled by the CLI

## FAQ

**Q: Can I save my payment details in the CLI?**  
A: No. The CLI never touches payment details.

**Q: Can I make the CLI complete payment automatically?**  
A: No. This is intentionally not possible and won't be added.

**Q: What if I want fully automated ordering?**  
A: Use Sainsbury's official app or API if they offer it. Automated payment in third-party tools is unsafe.

**Q: How do I know the CLI won't steal my card?**  
A: 
1. The CLI never interacts with payment fields
2. The code is open source - you can read it
3. Browser is visible - you see everything
4. It only navigates and waits

**Q: What happens after 5 minutes?**  
A: Browser closes automatically. If you didn't complete payment, order is not placed.

**Q: Can I extend the 5 minute timeout?**  
A: Yes, edit `src/browser/checkout.ts` line with `waitForTimeout(300000)` and change the value (in milliseconds).

## Security Best Practices

When using this CLI:

1. ✅ Always run checkout yourself (don't let agents/scripts do it)
2. ✅ Verify the final total before paying
3. ✅ Complete payment only in the visible browser
4. ✅ Close terminal/browser if anything looks suspicious
5. ✅ Check your email confirmation after ordering

6. ❌ Never share your session file with others
7. ❌ Never run checkout commands you don't understand
8. ❌ Never try to modify the code to automate payment
9. ❌ Never run this on untrusted machines

## Conclusion

**This CLI is designed for:**
- Browsing products
- Building shopping lists  
- Managing baskets
- Navigating to checkout

**But NOT for:**
- Automated payment
- Unattended ordering
- Storing payment details

**Payment is and will always be manual.**

Your security and safety are more important than convenience.
