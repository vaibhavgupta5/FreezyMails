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
      <AlertDialogContent className="skeu-card border-border-subtle p-6 max-w-md sm:rounded-2xl">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
          {isDanger && (
            <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center">
              <AlertTriangle className="text-danger-text" size={24} />
            </div>
          )}
          <AlertDialogTitle className="text-xl font-bold text-text-primary text-center w-full">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted text-sm leading-relaxed text-center w-full">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex sm:flex-row gap-3 mt-8 sm:space-x-0 w-full">
          <AlertDialogCancel
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 font-medium bg-surface-200 border-none hover:bg-surface-300 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-50 mt-0"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={`flex-1 font-medium text-white  -skeu-btn border border-black/10 ${isDanger ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600" : "bg-primary-base hover:bg-primary-hover dark:bg-primary-base dark:hover:bg-primary-hover"}`}
          >
            {isLoading ? "Loading..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
