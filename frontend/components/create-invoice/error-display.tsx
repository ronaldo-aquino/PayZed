"use client";

import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  error: string | null;
  dbSaveError: { invoiceData?: any; subscriptionData?: any; receipt: any } | null;
  isCreatingOnChain: boolean;
  onRetry: () => void;
}

export function ErrorDisplay({
  error,
  dbSaveError,
  isCreatingOnChain,
  onRetry,
}: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  const isSchemaCacheError = error?.includes("schema cache") || error?.includes("Could not find the table");

  return (
    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-red-600 dark:text-red-400 text-sm font-bold">!</span>
        </div>
        <div className="flex-1 space-y-3 min-w-0 overflow-hidden">
          {dbSaveError ? (
            <>
              {/* Success confirmation - shown to everyone */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                  ✅ Transaction Confirmed On-Chain
                </p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Your {dbSaveError.invoiceData ? "invoice" : "subscription"} is registered on the blockchain. Fee and gas were processed correctly.
                </p>
              </div>

              {/* User message - simple and clear */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  ⚠️ Database Save Failed
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Temporary database issue. Your transaction is safe on-chain. Click below to retry saving to database.
                </p>
              </div>

              {/* Owner instructions - shown for schema cache or missing table errors */}
              {isSchemaCacheError && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-3">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-2 uppercase tracking-wide">
                    🔧 For Project Owner Only
                  </p>
                  {error?.includes("already restarted") || error?.includes("table may not exist") ? (
                    <>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mb-2 font-semibold">
                        ⚠️ If you already restarted Supabase, the table may not exist.
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                        Check if the table exists:
                      </p>
                      <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside mb-2">
                        <li>Run: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">npm run migrate:subscriptions:check</code></li>
                        <li>Or go to Supabase SQL Editor and run: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">SELECT * FROM subscriptions LIMIT 1;</code></li>
                        <li>If table doesn't exist, run the migration: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">backend/supabase/supabase-migration-subscriptions.sql</code></li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                        If you have access to Supabase dashboard:
                      </p>
                      <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside mb-2">
                        <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">supabase.com/dashboard</a></li>
                        <li>Settings → General → <strong>Restart project</strong></li>
                        <li>Wait 2-5 minutes, then retry below</li>
                      </ol>
                    </>
                  )}
                </div>
              )}
              
              <Button
                type="button"
                onClick={onRetry}
                disabled={isCreatingOnChain}
                className="w-full"
                variant="outline"
                size="sm"
              >
                {isCreatingOnChain ? "Retrying..." : "Retry Save to Database"}
              </Button>
              
              <div className="bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 rounded p-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                  Transaction Hash:
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all bg-gray-100 dark:bg-gray-900/50 px-2 py-1 rounded">
                  {dbSaveError.receipt.transactionHash}
                </p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-red-900 dark:text-red-200 font-semibold mb-2">
                Error: {error}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                Please check your wallet and try again. Make sure you have approved the contract to spend tokens for the fee.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
