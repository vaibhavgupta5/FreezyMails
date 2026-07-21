"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
};

export default function ConfirmPopup({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = true,
  isLoading = false,
}: ConfirmPopupProps) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
    >
      <AlertDialogContent className="bg-surface-100 border border-surface-400 p-6 max-w-md sm:rounded-xl shadow-xl">
        <AlertDialogHeader className="text-left space-y-3">
          <AlertDialogTitle className="text-lg font-semibold text-surface-900 flex items-center gap-2">
            {isDanger && <AlertTriangle className="text-red-500 w-5 h-5" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-surface-600 text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end gap-2  w-full sm:space-x-0">
          <AlertDialogCancel
            onClick={onClose}
            disabled={isLoading}
            className="font-medium bg-surface-200 border border-surface-400 text-surface-900 hover:bg-surface-300 transition-colors mt-0 h-9 px-4"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={`font-medium h-9 px-4 transition-colors ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 text-white border border-red-700"
                : "bg-surface-900 hover:bg-surface-800 text-surface-50 border border-surface-950"
            }`}
          >
            {isLoading ? "Loading..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
