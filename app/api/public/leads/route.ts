import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LeadSubmission from '@/models/LeadSubmission';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, phone, postalCode, source, consent } = await req.json();
    if (!name || !email || !phone || !postalCode) return errorResponse('All fields are required', 400);
    if (!consent) return errorResponse('Consent is required', 400);
    const lead = await LeadSubmission.create({
      name, email, phone, postalCode,
      source: source || 'general',
      consent,
    });
    return successResponse(lead, 'Submitted successfully', 201);
  } catch (e: unknown) {
    return errorResponse(e instanceof Error ? e.message : 'Server error', 500);
  }
}
