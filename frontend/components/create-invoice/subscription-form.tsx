import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { SubscriptionFormData } from "@/hooks/useSubscriptionForm";

interface SubscriptionFormProps {
  register: UseFormRegister<SubscriptionFormData>;
  errors: FieldErrors<SubscriptionFormData>;
}

export function SubscriptionForm({ register, errors }: SubscriptionFormProps) {
  return (
    <>
      <div className="space-y-2.5">
        <Label htmlFor="amount" className="text-sm font-semibold">
          Amount per Period
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          className="h-12 text-base"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-destructive font-medium">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="currency" className="text-sm font-semibold">
          Currency
        </Label>
        <Select id="currency" className="h-12 text-base" {...register("currency")}>
          <option value="">Select currency</option>
          <option value="USDC">USDC</option>
          <option value="EURC">EURC</option>
        </Select>
        {errors.currency && (
          <p className="text-sm text-destructive font-medium">{errors.currency.message}</p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="receiver_wallet_address" className="text-sm font-semibold">
          Receiver Wallet Address
        </Label>
        <Input
          id="receiver_wallet_address"
          type="text"
          placeholder="0x..."
          className="h-12 text-base font-mono"
          {...register("receiver_wallet_address")}
        />
        {errors.receiver_wallet_address && (
          <p className="text-sm text-destructive font-medium">
            {errors.receiver_wallet_address.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          The wallet address that will receive the payments
        </p>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="period_days" className="text-sm font-semibold">
          Period (Days)
        </Label>
        <Input
          id="period_days"
          type="number"
          step="1"
          min="1"
          placeholder="30"
          className="h-12 text-base"
          {...register("period_days", { valueAsNumber: true })}
        />
        {errors.period_days && (
          <p className="text-sm text-destructive font-medium">{errors.period_days.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          How often the subscription will be charged (minimum 1 day)
        </p>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="description" className="text-sm font-semibold">
          Description
        </Label>
        <textarea
          id="description"
          rows={4}
          placeholder="Enter subscription description..."
          className="flex min-h-[100px] w-full rounded-md border-2 border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive font-medium">{errors.description.message}</p>
        )}
      </div>
    </>
  );
}


