/**
 * Converts technical blockchain errors into user-friendly messages
 */

export interface ErrorInfo {
  message: string;
  title?: string;
  suggestion?: string;
}

/**
 * Extracts user-friendly error message from various error types
 */
export function getErrorMessage(error: any): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return getUserFriendlyMessage(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return getUserFriendlyMessage(error.message);
  }

  // Handle ethers.js errors
  if (error.reason) {
    return getUserFriendlyMessage(error.reason);
  }

  if (error.data?.message) {
    return getUserFriendlyMessage(error.data.message);
  }

  if (error.message) {
    return getUserFriendlyMessage(error.message);
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Converts technical error messages to user-friendly ones
 */
function getUserFriendlyMessage(technicalMessage: string): string {
  const message = technicalMessage.toLowerCase();

  // User rejection errors
  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected') ||
    message.includes('denied transaction') ||
    message.includes('user cancelled')
  ) {
    return 'Transaction was cancelled. No changes were made.';
  }

  // Insufficient funds
  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance') ||
    message.includes('not enough balance')
  ) {
    return 'You don\'t have enough ETH in your wallet. Please add more funds and try again.';
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('fetch')
  ) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Gas errors
  if (
    message.includes('gas') ||
    message.includes('out of gas') ||
    message.includes('gas required exceeds')
  ) {
    return 'Transaction failed due to gas issues. Please try again or increase gas limit in your wallet.';
  }

  // Approval errors
  if (
    message.includes('not approved') ||
    message.includes('approval') ||
    message.includes('not authorized')
  ) {
    return 'This action requires approval. Please approve the transaction in your wallet.';
  }

  // Ownership errors
  if (
    message.includes('not the owner') ||
    message.includes('not owner') ||
    message.includes('not token owner') ||
    message.includes('caller is not owner')
  ) {
    return 'You don\'t own this NFT. Only the owner can perform this action.';
  }

  // Listing errors
  if (
    message.includes('not for sale') ||
    message.includes('not listed') ||
    message.includes('already listed')
  ) {
    if (message.includes('not for sale') || message.includes('not listed')) {
      return 'This NFT is not currently listed for sale.';
    }
    return 'This NFT is already listed. Please cancel the existing listing first.';
  }

  // Auction errors
  if (message.includes('auction')) {
    if (message.includes('ended') || message.includes('already ended')) {
      return 'This auction has already ended.';
    }
    if (message.includes('not yet ended')) {
      return 'This auction is still active. Please wait for it to end.';
    }
    if (message.includes('bid too low') || message.includes('bid must be higher')) {
      return 'Your bid is too low. Please place a higher bid.';
    }
    return 'Auction error. Please check the auction details and try again.';
  }

  // Price errors
  if (
    message.includes('price must be') ||
    message.includes('invalid price') ||
    message.includes('price > 0')
  ) {
    return 'Please enter a valid price greater than 0.';
  }

  // Address errors
  if (
    message.includes('invalid address') ||
    message.includes('invalid recipient') ||
    message.includes('zero address')
  ) {
    return 'Invalid address. Please enter a valid Ethereum address.';
  }

  // Transfer errors
  if (
    message.includes('transfer') &&
    (message.includes('failed') || message.includes('revert'))
  ) {
    return 'Transfer failed. Please make sure you own this NFT and try again.';
  }

  // Mint errors
  if (message.includes('mint')) {
    if (message.includes('incorrect eth')) {
      return 'Incorrect payment amount. Please check the mint price and try again.';
    }
    return 'Minting failed. Please check your wallet balance and try again.';
  }

  // Revert errors (generic contract errors)
  if (message.includes('revert') || message.includes('execution reverted')) {
    // Try to extract the revert reason
    const revertMatch = message.match(/revert\s+(.+)/i) || message.match(/reason:\s*(.+)/i);
    if (revertMatch && revertMatch[1]) {
      return getUserFriendlyMessage(revertMatch[1]);
    }
    return 'Transaction failed. The action could not be completed. Please try again.';
  }

  // MetaMask specific errors
  if (message.includes('metamask')) {
    if (message.includes('not installed')) {
      return 'MetaMask is not installed. Please install MetaMask to continue.';
    }
    if (message.includes('unlock')) {
      return 'Please unlock your MetaMask wallet and try again.';
    }
  }

  // Wallet connection errors
  if (
    message.includes('wallet') &&
    (message.includes('connect') || message.includes('connection'))
  ) {
    return 'Wallet connection failed. Please make sure your wallet is unlocked and try again.';
  }

  // IPFS errors
  if (message.includes('ipfs') || message.includes('pinata')) {
    return 'Failed to upload to IPFS. Please check your internet connection and try again.';
  }

  // Generic contract errors
  if (
    message.includes('contract') ||
    message.includes('call exception') ||
    message.includes('invalid opcode')
  ) {
    return 'Smart contract error. Please try again or contact support if the issue persists.';
  }

  // Return original message if no match found (might already be user-friendly)
  // But clean it up a bit
  return technicalMessage
    .replace(/^error:\s*/i, '')
    .replace(/^execution reverted:\s*/i, '')
    .trim() || 'An unexpected error occurred. Please try again.';
}

/**
 * Gets detailed error information including title and suggestion
 */
export function getErrorInfo(error: any): ErrorInfo {
  const message = getErrorMessage(error);
  
  // Determine title and suggestion based on error type
  const errorStr = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';

  let title = 'Error';
  let suggestion: string | undefined;

  if (errorStr.includes('rejected') || errorStr.includes('denied')) {
    title = 'Transaction Cancelled';
    suggestion = 'You can try again when ready.';
  } else if (errorStr.includes('insufficient')) {
    title = 'Insufficient Funds';
    suggestion = 'Add ETH to your wallet and try again.';
  } else if (errorStr.includes('network') || errorStr.includes('connection')) {
    title = 'Connection Error';
    suggestion = 'Check your internet connection and try again.';
  } else if (errorStr.includes('not the owner') || errorStr.includes('not owner')) {
    title = 'Permission Denied';
    suggestion = 'Only the NFT owner can perform this action.';
  } else if (errorStr.includes('gas')) {
    title = 'Gas Error';
    suggestion = 'Try increasing the gas limit in your wallet settings.';
  } else if (errorStr.includes('approval')) {
    title = 'Approval Required';
    suggestion = 'Approve the transaction in your wallet to continue.';
  }

  return {
    message,
    title,
    suggestion,
  };
}

/**
 * Checks if error is a user rejection (cancellation)
 */
export function isUserRejection(error: any): boolean {
  const message = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected') ||
    message.includes('denied transaction') ||
    message.includes('user cancelled')
  );
}

/**
 * Checks if error is a network/connection issue
 */
export function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('fetch')
  );
}
