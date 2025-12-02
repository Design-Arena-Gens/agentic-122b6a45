import { NextResponse } from 'next/server';
import { format, addDays, setHours, setMinutes } from 'date-fns';

// Mock calendar data - In production, integrate with Google Calendar or Calendly
const bookedSlots = new Map<string, any[]>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json(
      { error: 'Date parameter required' },
      { status: 400 }
    );
  }

  // Generate available slots for the requested date
  const slots = generateAvailableSlots(date);
  const booked = bookedSlots.get(date) || [];

  const available = slots.filter(
    slot => !booked.some(b => b.time === slot)
  );

  return NextResponse.json({ available, booked: booked.length });
}

export async function POST(request: Request) {
  try {
    const { date, time, name, phone, email, service } = await request.json();

    // Validation
    if (!date || !time || !name || !phone || !service) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slot is available
    const booked = bookedSlots.get(date) || [];
    if (booked.some(b => b.time === time)) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      );
    }

    // Book the appointment
    const appointment = {
      id: `apt_${Date.now()}`,
      date,
      time,
      name,
      phone,
      email,
      service,
      createdAt: new Date().toISOString(),
    };

    booked.push(appointment);
    bookedSlots.set(date, booked);

    return NextResponse.json({
      success: true,
      appointment,
      message: `Appointment confirmed for ${name} on ${date} at ${time}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to book appointment' },
      { status: 500 }
    );
  }
}

function generateAvailableSlots(dateStr: string): string[] {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const slots: string[] = [];

  // Monday-Friday: 9 AM - 5 PM
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 16) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
  }
  // Saturday: 10 AM - 2 PM
  else if (dayOfWeek === 6) {
    for (let hour = 10; hour < 14; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 13) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
  }

  return slots;
}
