"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeValue: string;
  copied: boolean;
  onCopy: () => void;
}

export function QRCodeModal({
  open,
  onOpenChange,
  qrCodeValue,
  copied,
  onCopy,
}: QRCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Scan this page with your mobile device to access the payment page
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="p-6 bg-background border-2 rounded-2xl shadow-lg">
            <QRCodeSVG value={qrCodeValue} size={280} />
          </div>
          <Button variant="outline" size="lg" onClick={onCopy} className="w-full">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Payment Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



