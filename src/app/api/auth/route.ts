import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users, sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@/lib/password';
import crypto from 'crypto';

const now = () => Math.floor(Date.now() / 1000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, password, name } = body;

    if (type === 'signup') {
      const existing = await db.select().from(users).where(eq(users.email, email));
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
      }

      const userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(password);
      
      await db.insert(users).values({
        id: userId,
        name: name || email.split('@')[0],
        email: email,
        password: hashedPassword,
        emailVerified: false,
        image: null,
        createdAt: now(),
        updatedAt: now(),
      });

      const token = crypto.randomUUID();
      await db.insert(sessions).values({
        id: crypto.randomUUID(),
        userId: userId,
        token: token,
        expiresAt: now() + 30 * 24 * 60 * 60,
        ipAddress: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
        createdAt: now(),
        updatedAt: now(),
      });

      const response = NextResponse.json({ 
        success: true, 
        user: { id: userId, name: name || email.split('@')[0], email: email } 
      });
      
      response.cookies.set('session-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    if (type === 'signin') {
      const user = await db.select().from(users).where(eq(users.email, email));
      
      if (user.length === 0) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 400 });
      }

      const validPassword = await verifyPassword(password, user[0].password || '');
      if (!validPassword) {
        return NextResponse.json({ error: 'Неверный пароль' }, { status: 400 });
      }

      await db.delete(sessions).where(eq(sessions.userId, user[0].id));

      const token = crypto.randomUUID();
      await db.insert(sessions).values({
        id: crypto.randomUUID(),
        userId: user[0].id,
        token: token,
        expiresAt: now() + 30 * 24 * 60 * 60,
        ipAddress: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
        createdAt: now(),
        updatedAt: now(),
      });

      const response = NextResponse.json({ 
        success: true, 
        user: { id: user[0].id, name: user[0].name, email: user[0].email } 
      });
      
      response.cookies.set('session-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Неверный тип запроса' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session-token')?.value;
    
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await db.select().from(sessions).where(eq(sessions.token, token));
    
    if (session.length === 0 || session[0].expiresAt < now()) {
      if (session.length > 0) {
        await db.delete(sessions).where(eq(sessions.token, token));
      }
      return NextResponse.json({ user: null });
    }

    const user = await db.select().from(users).where(eq(users.id, session[0].userId));
    
    if (user.length === 0) {
      return NextResponse.json({ user: null });
    }

    const { password, ...userWithoutPassword } = user[0];
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session-token')?.value;
    
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Ошибка выхода' }, { status: 500 });
  }
}