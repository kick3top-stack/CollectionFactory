import { X, Coins } from 'lucide-react';

export type WithdrawType = 'balance' | 'platformFees' | 'factoryFees';

type WithdrawConfirmationModalProps = {
  amount: number;
  withdrawType: WithdrawType;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
};

export function WithdrawConfirmationModal({
  amount,
  withdrawType,
  onConfirm,
  onCancel,
  isProcessing = false,
}: WithdrawConfirmationModalProps) {
  const isPlatformFees = withdrawType === 'platformFees';
  const isFactoryFees = withdrawType === 'factoryFees';
  const description =
    isFactoryFees
      ? 'You are about to withdraw creation fees from the CollectionFactory contract to your wallet. This action cannot be undone.'
      : isPlatformFees
        ? 'You are about to withdraw platform fees from the marketplace to your wallet. This action cannot be undone.'
        : 'You are about to withdraw your pending balance (sale proceeds or bid refunds) from the marketplace to your wallet.';
  const amountLabel = isFactoryFees ? 'Factory fees to withdraw' : isPlatformFees ? 'Platform fees to withdraw' : 'Withdrawal amount';
  const subLabel = isFactoryFees ? 'Creation fees will be sent to your connected wallet' : isPlatformFees ? 'Fees will be sent to your connected wallet' : 'Funds will be sent to your connected wallet';
  const formatAmount = (n: number) => parseFloat(n.toFixed(4)).toString();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FFFF]/20 rounded-full flex items-center justify-center">
                <Coins className="w-5 h-5 text-[#00FFFF]" />
              </div>
              <h2 className="text-2xl font-bold">Confirm Withdrawal</h2>
            </div>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 mb-6">
            {description}
          </p>

          {/* Amount Display */}
          <div className="bg-[#121212] rounded-xl p-6 mb-6 border border-gray-800">
            <div className="text-sm text-gray-400 mb-2">
              {amountLabel}
            </div>
            <div className="text-3xl font-bold text-[#00FFFF]">
              {formatAmount(amount)} ETH
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {subLabel}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              No, Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                isProcessing
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD]'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                'Yes, Withdraw'
              )}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
