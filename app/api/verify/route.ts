import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const signature = require('cookie-signature');

const verifyJWT = async (token: string, key: string, algorithm: string) => {
  try {
    if (algorithm === 'none') {
      const decoded = jwt.decode(token);
      return { valid: true, payload: decoded };
    }
    
    const decoded = jwt.verify(token, key, { algorithms: [algorithm as jwt.Algorithm] });
    return { valid: true, payload: decoded };
  } catch (error) {
    return { valid: false, error: 'JWT verification failed: ' + (error as Error).message };
  }
};

const verifyExpressSession = async (session: string, key: string) => {
  try {
    const decoded = decodeURIComponent(session);
    const cookieValue = decoded.startsWith('s:') ? decoded.slice(2) : decoded;
    const unsigned = signature.unsign(cookieValue, key);
    
    if (unsigned === false) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    return { 
      valid: true, 
      payload: { 
        sessionId: unsigned
      }
    };
  } catch (error) {
    return { valid: false, error: 'Express session verification failed: ' + (error as Error).message };
  }
};

const verifyFlaskSession = async (session: string, key: string) => {
  try {
    const parts = session.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid flask session format - expected 3 parts separated by dots' };
    }
    
    const [base64Data, timestampB64, providedSignature] = parts;
    
    const payload_with_timestamp = `${base64Data}.${timestampB64}`;
    
    const salt = 'cookie-session';
    const derivedKey = crypto.createHmac('sha1', key).update(salt).digest();
    
    const hmac = crypto.createHmac('sha1', derivedKey);
    hmac.update(payload_with_timestamp);
    const expectedSignature = hmac.digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const isValid = expectedSignature === providedSignature;
    
    if (isValid) {
      let paddedData = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      while (paddedData.length % 4) {
        paddedData += '=';
      }
      
      const sessionString = Buffer.from(paddedData, 'base64').toString('utf8');
      const sessionData = JSON.parse(sessionString);
      
      let paddedTimestamp = timestampB64.replace(/-/g, '+').replace(/_/g, '/');
      while (paddedTimestamp.length % 4) {
        paddedTimestamp += '=';
      }
      
      let timestamp;
      try {
        const timestampBuffer = Buffer.from(paddedTimestamp, 'base64');
        if (timestampBuffer.length === 4) {
          timestamp = timestampBuffer.readUInt32BE(0);
        } else {
          timestamp = parseInt(timestampB64, 36);
        }
      } catch {
        timestamp = Date.now() / 1000;
      }
      
      return { 
        valid: true, 
        payload: sessionData,
        timestamp: timestamp
      };
    } else {
      return { 
        valid: false, 
        error: `Signature verification failed. Expected: ${expectedSignature}, Got: ${providedSignature}`
      };
    }
  } catch (error) {
    return { valid: false, error: 'Invalid flask session: ' + (error as Error).message };
  }
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { session, sessionType, key, algorithm } = body;

  let verified = {};

  if (sessionType === 'jwt') {
    verified = await verifyJWT(session, key, algorithm);
  } else if (sessionType === 'express-session') {
    verified = await verifyExpressSession(session, key);
  } else if (sessionType === 'flask-session') {
    verified = await verifyFlaskSession(session, key);
  } else {
    verified = { valid: false, error: 'Unsupported session type' };
  }

  return NextResponse.json({ verified });
}
