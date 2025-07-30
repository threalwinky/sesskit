'use client';
import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [mode, setMode] = useState("encode");
  const [algorithm, setAlgorithm] = useState("HS256");
  const [sessionType, setSessionType] = useState("jwt");
  const [payload, setPayload] = useState("");
  const [key, setKey] = useState("");
  const [header, setHeader] = useState("");
  const [session, setSession] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const jwtAlgorithms = [
    "HS256", "HS384", "HS512",
    "RS256", "RS384", "RS512",
    "ES256", "ES384", "ES512",
    "PS256", "PS384", "PS512",
    "none"
  ];

  const format = (s: string) => {
    if (typeof s === 'string' && s.startsWith('"') && s.endsWith('"')) {
      return s.slice(1, -1);
    }
    return s;
  };

  const showModal = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'error' || message.includes('VALID') || message.includes('INVALID')) {
      const title = type === 'error' ? 'Error' : 
                   message.includes('VALID') ? 'Validation Result' : 'Information';
      setModal({
        isOpen: true,
        title,
        message,
        type
      });
    }
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleEncode = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/encode", {
        session,
        payload,
        key,
        header,
        algorithm,
        sessionType
      });
      
      if (res.data.encoded.error) {
        showModal(res.data.encoded.error, 'error');
        setResult(res.data.encoded.error);
      } else {
        if (sessionType === 'jwt') {
          setSession(format(JSON.stringify(res.data.encoded.token, null, 2)));
          setHeader(JSON.stringify(res.data.encoded.header, null, 2));
        } else if (sessionType === 'flask-session') {
          setSession(res.data.encoded.session);
          setHeader(JSON.stringify({
            message: "Flask session created",
            format: "data.timestamp.signature"
          }, null, 2));
        } else {
          setSession(res.data.encoded.session || res.data.encoded.token);
          setHeader(JSON.stringify(res.data.encoded.header || {message: "Express session created"}, null, 2));
        }
        setResult('Encoding successful');
      }
    } catch (error) {
      const errorMsg = 'Encoding failed: ' + (error as Error).message;
      showModal(errorMsg, 'error');
      setResult(errorMsg);
    }
    setIsLoading(false);
  };

  const handleDecode = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/decode", {
        session,
        payload,
        key,
        header,
        algorithm,
        sessionType
      });
      
      if (res.data.decoded.error) {
        showModal(res.data.decoded.error, 'error');
        setResult(res.data.decoded.error);
      } else {
        if (sessionType === 'jwt') {
          setPayload(JSON.stringify(res.data.decoded.payload, null, 2));
          setHeader(JSON.stringify(res.data.decoded.header, null, 2));
        } else if (sessionType === 'flask-session') {
          setPayload(JSON.stringify(res.data.decoded.data, null, 2));
          setHeader(JSON.stringify({
            timestamp: res.data.decoded.timestamp,
            timestampFormatted: res.data.decoded.timestampFormatted,
            signature: res.data.decoded.signature
          }, null, 2));
        } else {
          setPayload(JSON.stringify(res.data.decoded.payload, null, 2));
          setHeader(JSON.stringify(res.data.decoded.header, null, 2));
        }
        setResult('Decoding successful');
      }
    } catch (error) {
      const errorMsg = 'Decoding failed: ' + (error as Error).message;
      showModal(errorMsg, 'error');
      setResult(errorMsg);
    }
    setIsLoading(false);
  };

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/verify", {
        session,
        key,
        algorithm,
        sessionType
      });
      
      const isValid = res.data.verified.valid;
      const message = isValid ? 'Session is VALID' : 'Session is INVALID';
      const alertType = isValid ? 'success' : 'error';
      
      showModal(message, alertType);
      setResult(res.data.verified.error ? res.data.verified.error : message);
      
      if (res.data.verified.payload) {
        setPayload(JSON.stringify(res.data.verified.payload, null, 2));
      }
    } catch (error) {
      const errorMsg = 'Verification failed: ' + (error as Error).message;
      showModal(errorMsg, 'error');
      setResult(errorMsg);
    }
    setIsLoading(false);
  };

  const handleAction = () => {
    if (mode === "encode") handleEncode();
    if (mode === "decode") handleDecode();
    if (mode === "verify") handleVerify();
  };

  const clearAll = () => {
    setPayload("");
    setKey("");
    setHeader("");
    setSession("");
    setResult("");
  };

  const getPlaceholderText = (field: string) => {
    if (sessionType === 'jwt') {
      switch (field) {
        case 'payload':
          return '{"sub": "1234567890", "name": "John Doe", "iat": 1516239022}';
        case 'key':
          return 'your-256-bit-secret';
        case 'session':
          return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
        default:
          return '';
      }
    } else if (sessionType === 'express-session') {
      switch (field) {
        case 'payload':
          return '{"userId": "123", "username": "john_doe", "role": "user"}';
        case 'key':
          return 'your-secret-here';
        case 'session':
          return 's%3AyDa3fGj3lxYzvXpZcBGLk3dSyEzE3lHk.f7A3HbQxMIIPMyPmb5WYgEMi4oc';
        default:
          return '';
      }
    } else if (sessionType === 'flask-session') {
      switch (field) {
        case 'payload':
          return '{"user_id": 123, "username": "john_doe", "logged_in": true}';
        case 'key':
          return 'flask-secret-key';
        case 'session':
          return 'eyJ1c2VyX2lkIjoxMjMsInVzZXJuYW1lIjoiam9obl9kb2UiLCJsb2dnZWRfaW4iOnRydWV9.1722330123.x7y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6';
        default:
          return '';
      }
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-black">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-[#88fedd]">
            Sesskit
          </h1>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border text-center font-medium ${
            result.includes('successful') || result.includes('VALID') 
              ? 'bg-[#1a1a1a] border-[#4bb2b8] text-[#88fedd]' 
              : result.includes('INVALID') 
                ? 'bg-[#1a1a1a] border-red-500 text-red-300'
                : 'bg-[#1a1a1a] border-yellow-500 text-yellow-300'
          }`}>
            {result}
          </div>
        )}

        {/* Custom Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-[#2f4858] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className={`p-4 border-b border-[#2f4858] ${
                modal.type === 'success' ? 'bg-[#4bb2b8]/10' :
                modal.type === 'error' ? 'bg-red-500/10' : 'bg-[#3f8d9c]/10'
              }`}>
                <div className="flex items-center gap-3">
                  {modal.type === 'success' && (
                    <div className="w-6 h-6 rounded-full bg-[#4bb2b8] flex items-center justify-center">
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {modal.type === 'error' && (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {modal.type === 'info' && (
                    <div className="w-6 h-6 rounded-full bg-[#3f8d9c] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#88fedd]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <h3 className={`font-semibold text-lg ${
                    modal.type === 'success' ? 'text-[#88fedd]' :
                    modal.type === 'error' ? 'text-red-300' : 'text-[#88fedd]'
                  }`}>
                    {modal.title}
                  </h3>
                </div>
              </div>
              
              <div className="p-6">
                <p className={`text-sm leading-relaxed ${
                  modal.type === 'success' ? 'text-[#63d8cd]' :
                  modal.type === 'error' ? 'text-red-200' : 'text-[#63d8cd]'
                }`}>
                  {modal.message}
                </p>
              </div>
              
              <div className="p-4 border-t border-[#2f4858] flex justify-end">
                <button
                  onClick={closeModal}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                    modal.type === 'success' ? 'bg-[#4bb2b8] hover:bg-[#3f8d9c] text-black' :
                    modal.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    'bg-[#3f8d9c] hover:bg-[#38697c] text-[#88fedd]'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-[#2f4858] p-6">
              <label className="flex items-center gap-2 font-semibold text-[#88fedd] mb-3">
                Payload
              </label>
              <textarea 
                value={payload} 
                onChange={(e) => setPayload(e.target.value)} 
                rows={6} 
                placeholder={getPlaceholderText('payload')}
                className="w-full p-4 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#63d8cd] focus:border-[#63d8cd] transition-colors text-sm resize-none bg-black text-[#88fedd] placeholder-[#63d8cd]/60"
              />
            </div>
            
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-[#2f4858] p-6">
              <label className="flex items-center gap-2 font-semibold text-[#88fedd] mb-3">
                Secret Key
              </label>
              <textarea 
                value={key} 
                onChange={(e) => setKey(e.target.value)} 
                rows={4} 
                placeholder={getPlaceholderText('key')}
                className="w-full p-4 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#4bb2b8] focus:border-[#4bb2b8] transition-colors text-sm resize-none bg-black text-[#88fedd] placeholder-[#63d8cd]/60"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-[#2f4858] p-6">
              <label className="flex items-center gap-2 font-semibold text-[#88fedd] mb-3">
                Header
              </label>
              <textarea 
                value={header} 
                onChange={(e) => setHeader(e.target.value)} 
                rows={6} 
                placeholder="Header information will appear here..."
                className="w-full p-4 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#3f8d9c] focus:border-[#3f8d9c] transition-colors text-sm resize-none bg-black text-[#88fedd] placeholder-[#63d8cd]/60"
                readOnly
              />
            </div>
            
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-[#2f4858] p-6">
              <label className="flex items-center gap-2 font-semibold text-[#88fedd] mb-3">
                Session Token
              </label>
              <textarea 
                value={session} 
                onChange={(e) => setSession(e.target.value)} 
                rows={4} 
                placeholder={getPlaceholderText('session')}
                className="w-full p-4 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#88fedd] focus:border-[#88fedd] transition-colors text-sm resize-none bg-black text-[#88fedd] placeholder-[#63d8cd]/60"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-[#2f4858] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold text-[#88fedd] mb-2">Operation Mode</label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value)} 
                className="w-full p-3 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#63d8cd] focus:border-[#63d8cd] transition-colors bg-black text-[#88fedd]"
              >
                <option value="encode">Encode</option>
                <option value="decode">Decode</option>
                <option value="verify">Verify</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#88fedd] mb-2">Session Type</label>
              <select 
                value={sessionType} 
                onChange={(e) => setSessionType(e.target.value)} 
                className="w-full p-3 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#63d8cd] focus:border-[#63d8cd] transition-colors bg-black text-[#88fedd]"
              >
                <option value="jwt">JWT Token</option>
                <option value="express-session">Express Session</option>
                <option value="flask-session">Flask Session</option>
              </select>
            </div>

            {sessionType === 'jwt' && (
              <div>
                <label className="block font-semibold text-[#88fedd] mb-2">JWT Algorithm</label>
                <select 
                  value={algorithm} 
                  onChange={(e) => setAlgorithm(e.target.value)} 
                  className="w-full p-3 border border-[#2f4858] rounded-lg focus:ring-2 focus:ring-[#63d8cd] focus:border-[#63d8cd] transition-colors bg-black text-[#88fedd]"
                >
                  <optgroup label="HMAC">
                    <option value="HS256">HS256</option>
                    <option value="HS384">HS384</option>
                    <option value="HS512">HS512</option>
                  </optgroup>
                  <optgroup label="RSA">
                    <option value="RS256">RS256</option>
                    <option value="RS384">RS384</option>
                    <option value="RS512">RS512</option>
                  </optgroup>
                  <optgroup label="ECDSA">
                    <option value="ES256">ES256</option>
                    <option value="ES384">ES384</option>
                    <option value="ES512">ES512</option>
                  </optgroup>
                  <optgroup label="RSA-PSS">
                    <option value="PS256">PS256</option>
                    <option value="PS384">PS384</option>
                    <option value="PS512">PS512</option>
                  </optgroup>
                  <optgroup label="Unsecured">
                    <option value="none">None</option>
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                mode === 'encode' 
                  ? 'bg-[#4bb2b8] hover:bg-[#3f8d9c] text-black shadow-[#4bb2b8]/25' 
                  : mode === 'decode'
                    ? 'bg-[#63d8cd] hover:bg-[#4bb2b8] text-black shadow-[#63d8cd]/25'
                    : 'bg-[#3f8d9c] hover:bg-[#38697c] text-[#88fedd] shadow-[#3f8d9c]/25'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleAction}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  {mode === 'encode' && 'ENCODE'}
                  {mode === 'decode' && 'DECODE'}
                  {mode === 'verify' && 'VERIFY'}
                </>
              )}
            </button>
            
            <button 
              className="px-8 py-3 bg-[#2f4858] hover:bg-[#38697c] text-[#88fedd] rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg shadow-[#2f4858]/25"
              onClick={clearAll}
              disabled={isLoading}
            >
              CLEAR ALL
            </button>
          </div>
        </div>
      </main>

      {/* Modal Component */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2f4858] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              {modal.type === 'success' && (
                <div className="w-8 h-8 bg-[#4bb2b8] rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {modal.type === 'error' && (
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {modal.type === 'info' && (
                <div className="w-8 h-8 bg-[#4bb2b8] rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-semibold text-[#88fedd]">{modal.title}</h3>
            </div>
            <p className="text-[#63d8cd] mb-6 leading-relaxed">{modal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-[#4bb2b8] hover:bg-[#88fedd] text-black rounded-lg font-medium transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}