import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const signature = require('cookie-signature');

const encodeJWT = (payload: any, secretKey: string, algorithm: string, header?: any) => {
  try {
    const defaultHeader = {
      alg: algorithm,
      typ: 'JWT'
    };
    
    const finalHeader = header ? { ...defaultHeader, ...header } : defaultHeader;
    
    if (algorithm === 'none') {
      const token = jwt.sign(payload, '', { algorithm: 'none', header: finalHeader });
      return { token, header: finalHeader };
    }
    
    const token = jwt.sign(payload, secretKey, { algorithm: algorithm as jwt.Algorithm, header: finalHeader });
    return { token, header: finalHeader };
  } catch (error) {
    throw new Error('Failed to encode JWT: ' + (error as Error).message);
  }
};

const encodeExpressSession = (data: any, secret: string) => {
  try {
    const sessionData = typeof data === 'string' ? data : JSON.stringify(data);
    const signed = signature.sign(sessionData, secret);
    return `s:${signed}`;
  } catch (error) {
    throw new Error('Failed to encode Express session: ' + (error as Error).message);
  }
};

const encodeFlaskSession = (data: any, key: string) => {
  try {
    const jsonString = JSON.stringify(data);
    
    const base64Data = Buffer.from(jsonString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const timestamp = Math.floor(Date.now() / 1000);
    const timestampBuffer = Buffer.alloc(4);
    timestampBuffer.writeUInt32BE(timestamp);
    const timestampB64 = timestampBuffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const payload = `${base64Data}.${timestampB64}`;
    
    const salt = 'cookie-session';
    const derivedKey = crypto.createHmac('sha1', key).update(salt).digest();
    
    const hmac = crypto.createHmac('sha1', derivedKey);
    hmac.update(payload);
    const signature = hmac.digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return `${payload}.${signature}`;
  } catch (error) {
    throw new Error('Failed to encode Flask session: ' + (error as Error).message);
  }
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { payload, key, header, algorithm, sessionType } = body;

  let encoded = {};

  try {
    if (sessionType === 'jwt') {
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const parsedHeader = header ? JSON.parse(header) : undefined;
      encoded = encodeJWT(parsedPayload, key, algorithm, parsedHeader);
    } else if (sessionType === 'express-session') {
      const session = encodeExpressSession(payload, key);
      encoded = { session, header: { type: 'express-session' } };
    } else if (sessionType === 'flask-session') {
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const session = encodeFlaskSession(parsedPayload, key);
      encoded = { session, header: { type: 'flask-session' } };
    } else {
      encoded = { error: 'Unsupported session type' };
    }
  } catch (error) {
    encoded = { error: (error as Error).message };
  }

  return NextResponse.json({ encoded });
}
