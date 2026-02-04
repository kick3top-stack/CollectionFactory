import { useEffect, useState } from 'react';

export function PreloadEffect() {
  const [bubbles] = useState(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      size: 4 + Math.random() * 8,
    }))
  );

  return (
    <div className="fixed inset-0 bg-[#121212] flex items-center justify-center z-50">
      <div className="relative">
        {/* Bubbles effect */}
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            className="absolute bubble"
            style={{
              left: `${bubble.x}vw`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`,
            }}
          />
        ))}
        
        {/* Loading text */}
        <div className="text-center z-10 relative">
          <div className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#00FFFF] to-[#0099CC] bg-clip-text text-transparent mb-4">
            NFT Marketplace
          </div>
          <div className="flex gap-2 justify-center">
            <div className="w-3 h-3 bg-[#00FFFF] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-[#00FFFF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-[#00FFFF] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>

      <style>{`
        .bubble {
          position: absolute;
          bottom: -100px;
          background: radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.4), rgba(0, 255, 255, 0.1));
          border-radius: 50%;
          animation: float infinite ease-in;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }

        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() * 40 - 20}px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
