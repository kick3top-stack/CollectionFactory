import { CheckCircle, XCircle, X } from 'lucide-react';
import { useEffect } from 'react';

type AlertModalProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
};

export function AlertModal({ message, type, onClose }: AlertModalProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-slide-down">
        <div className="p-4 flex items-start gap-3">
          {type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1">
            <h3 className={`font-bold mb-1 ${
              type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {type === 'success' ? 'Success' : 'Error'}
            </h3>
            <p className="text-sm text-gray-300">{message}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800 overflow-hidden">
          <div 
            className={`h-full animate-progress ${
              type === 'success' ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        .animate-progress {
          animation: progress 3s linear;
        }
      `}</style>
    </div>
  );
}
