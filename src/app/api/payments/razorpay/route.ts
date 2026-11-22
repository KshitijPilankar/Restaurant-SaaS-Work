import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, restaurantId, tableId } = body;

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        // Check for placeholder or unset credentials
        const isPlaceholder =
            !keyId ||
            keyId.includes('rzp_test_xxxx') ||
            !keySecret ||
            keySecret.includes('your_razorpay');

        if (isPlaceholder) {
            return NextResponse.json({
                demoMode: true,
                message: 'Razorpay keys are in test placeholder mode. Seamless instant checkout simulation active.',
            });
        }

        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
        const amountInPaise = Math.round(Number(amount) * 100);

        const res = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: 'INR',
                receipt: `rcpt_${Date.now().toString().slice(-8)}`,
                notes: {
                    restaurantId,
                    tableId,
                },
            }),
        });

        if (!res.ok) {
            const errData = await res.json();
            return NextResponse.json(
                { error: errData.error?.description || 'Failed to create Razorpay order', demoMode: true },
                { status: 200 }
            );
        }

        const order = await res.json();
        return NextResponse.json({
            demoMode: false,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId,
        });
    } catch (err) {
        console.error('Razorpay Order API Error:', err);
        return NextResponse.json(
            { demoMode: true, message: 'Fallback to instant simulation.' },
            { status: 200 }
        );
    }
}
