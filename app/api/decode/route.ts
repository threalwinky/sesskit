import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const signature = require('cookie-signature');

const decodeJWT = (token: string) => {
  try {
    const payload = jwt.decode(token);
    const decodedHeader = jwt.decode(token, { complete: true })?.header;
    return { payload, header: decodedHeader };
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
};

const decodeExpressSession = (session: string) => {
  try {
    const decoded = decodeURIComponent(session);
    const cookieValue = decoded.startsWith('s:') ? decoded.slice(2) : decoded;
    
    const parts = cookieValue.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid Express session format - expected session_id.signature');
    }
    
    const [sessionId, sig] = parts;
    
    return {
      payload: { 
        sessionId: sessionId
      },
      header: { 
        type: 'express-session',
        sessionId: sessionId,
        signature: sig,
        format: 's:session_id.signature'
      }
    };
  } catch (error) {
    throw new Error('Failed to decode Express session: ' + (error as Error).message);
  }
};

const decodeFlaskSession = (session: string) => {
  try {
    const parts = session.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid Flask session format - expected 3 parts separated by dots');
    }
    
    const [base64Data, timestampB64, sig] = parts;
    
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
      data: sessionData,
      timestamp: timestamp,
      timestampFormatted: new Date(timestamp * 1000).toISOString(),
      signature: sig
    };
  } catch (error) {
    throw new Error('Failed to decode Flask session: ' + (error as Error).message);
  }
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { session, sessionType } = body;

  let decoded = {};

  try {
    if (sessionType === 'jwt') {
      decoded = decodeJWT(session);
    } else if (sessionType === 'express-session') {
      decoded = decodeExpressSession(session);
    } else if (sessionType === 'flask-session') {
      decoded = decodeFlaskSession(session);
    } else {
      decoded = { error: 'Unsupported session type' };
    }
  } catch (error) {
    decoded = { error: (error as Error).message };
  }

  return NextResponse.json({ decoded });
}
